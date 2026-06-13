import secrets
import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from time import time

import requests as _req
from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app
from flask_login import login_user, logout_user, login_required, current_user

from ..models import db, Utente
from ..email_service import invia_email_reset_password, invia_email_benvenuto
from ..utils import is_safe_redirect_url, validate_email_address, hash_token
from .. import limiter

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
logger = logging.getLogger(__name__)

_login_attempts: dict = defaultdict(list)


def _verify_turnstile(token: str) -> bool:
    from ..models import Impostazione
    secret = Impostazione.get("turnstile_secret_key") or current_app.config.get("TURNSTILE_SECRET_KEY", "")
    if not secret:
        return True  # Not configured → skip
    if Impostazione.get("turnstile_enabled") != "1":
        return True  # Configured but disabled → skip
    if not token:
        return False
    try:
        resp = _req.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": secret, "response": token},
            timeout=5,
        )
        return resp.json().get("success", False)
    except Exception as exc:
        logger.error("Turnstile verification error: %s", exc)
        return True  # On network error, don't block legitimate users


def _check_rate_limit(ip: str) -> bool:
    window = current_app.config["RATELIMIT_LOGIN_WINDOW"]
    max_attempts = current_app.config["RATELIMIT_LOGIN_ATTEMPTS"]
    now = time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < window]
    if len(_login_attempts[ip]) >= max_attempts:
        return False
    _login_attempts[ip].append(now)
    return True


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()

        if not _check_rate_limit(ip):
            logger.warning("Rate limit login superato per IP %s", ip)
            flash("Troppi tentativi di accesso. Riprova tra 15 minuti.", "error")
            return render_template("auth/login.html")

        utente = Utente.query.filter_by(email=email).first()
        if utente and utente.check_password(password):
            login_user(utente, remember=True)
            logger.info("Login riuscito: %s da %s", email, ip)
            next_url = request.args.get("next") or request.form.get("next")
            if next_url and is_safe_redirect_url(next_url, request.host):
                return redirect(next_url)
            return redirect(url_for("admin.index") if utente.is_admin() else url_for("dashboard.index"))

        logger.warning("Login fallito per %s da IP %s", email, ip)
        flash("Email o password non corretti.", "error")

    return render_template("auth/login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    logger.info("Logout: %s", current_user.email)
    logout_user()
    return redirect(url_for("public.index"))


@auth_bp.route("/registrazione", methods=["GET", "POST"])
@limiter.limit("10 per hour")
def registrazione():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        # Turnstile CAPTCHA verification (skipped if not configured)
        turnstile_token = request.form.get("cf-turnstile-response", "")
        if not _verify_turnstile(turnstile_token):
            flash("Verifica CAPTCHA fallita. Riprova.", "error")
            return render_template("auth/registrazione.html")

        nome = (request.form.get("nome") or "").strip()[:100]
        cognome = (request.form.get("cognome") or "").strip()[:100]
        raw_email = (request.form.get("email") or "").strip()
        password = request.form.get("password") or ""
        conferma_password = request.form.get("conferma_password") or ""
        eta_minima = request.form.get("eta_minima") == "on"
        consenso = request.form.get("consenso_privacy") == "on"
        marketing = request.form.get("consenso_marketing") == "on"

        errors = []
        if not eta_minima:
            errors.append("Devi dichiarare di avere almeno 16 anni.")
        if not (1 <= len(nome) <= 100):
            errors.append("Il nome è obbligatorio (max 100 caratteri).")
        if not (1 <= len(cognome) <= 100):
            errors.append("Il cognome è obbligatorio (max 100 caratteri).")

        email = validate_email_address(raw_email)
        if not email:
            errors.append("Email non valida.")

        if len(password) < 8:
            errors.append("La password deve avere almeno 8 caratteri.")
        if password != conferma_password:
            errors.append("Le password non coincidono.")
        if not consenso:
            errors.append("Devi accettare la privacy policy.")
        if email and Utente.query.filter_by(email=email).first():
            errors.append("Email già registrata.")

        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("auth/registrazione.html")

        utente = Utente(
            nome=nome, cognome=cognome, email=email, ruolo="UTENTE",
            consenso_privacy=consenso, consenso_marketing=marketing,
            data_consenso=datetime.now(timezone.utc),
        )
        utente.set_password(password)
        db.session.add(utente)
        db.session.commit()
        logger.info("Nuovo utente: %s", email)

        try:
            invia_email_benvenuto(utente)
        except Exception as exc:
            logger.error("Errore email benvenuto per %s: %s", email, exc, exc_info=True)
            flash(f"Account creato, ma l'email di benvenuto non è stata inviata: {exc}", "warning")

        login_user(utente, remember=True)
        flash("Registrazione completata! Benvenuto.", "success")
        return redirect(url_for("dashboard.index"))

    return render_template("auth/registrazione.html")


@auth_bp.route("/recupera-password", methods=["GET", "POST"])
@limiter.limit("5 per hour")
def recupera_password():
    if request.method == "POST":
        raw_email = (request.form.get("email") or "").strip()
        email = validate_email_address(raw_email)

        if email:
            utente = Utente.query.filter_by(email=email).first()
            if utente:
                token_plain = secrets.token_urlsafe(32)
                utente.token_reset = hash_token(token_plain)  # Store hash, not plaintext
                utente.scadenza_token = datetime.now(timezone.utc) + timedelta(hours=1)
                db.session.commit()
                link = f"{current_app.config['APP_URL']}/auth/nuova-password?token={token_plain}"
                try:
                    invia_email_reset_password(utente, link)
                    logger.info("Reset password per %s", email)
                except Exception as exc:
                    logger.error("Errore email reset: %s", exc)

        flash("Se l'email esiste riceverai un link per reimpostare la password.", "info")
        return redirect(url_for("auth.login"))

    return render_template("auth/recupera_password.html")


@auth_bp.route("/nuova-password", methods=["GET", "POST"])
def nuova_password():
    token_plain = request.args.get("token") or request.form.get("token") or ""
    if not token_plain:
        flash("Link non valido.", "error")
        return redirect(url_for("auth.login"))

    # Lookup by hashed token
    from ..utils import hash_token as ht
    token_hash = ht(token_plain)
    utente = Utente.query.filter_by(token_reset=token_hash).first()
    if not utente or not utente.scadenza_token or utente.scadenza_token < datetime.now(timezone.utc):
        flash("Il link è scaduto o non valido. Richiedi un nuovo link.", "error")
        return redirect(url_for("auth.recupera_password"))

    if request.method == "POST":
        password = request.form.get("password") or ""
        conferma = request.form.get("conferma_password") or ""
        if len(password) < 8:
            flash("La password deve avere almeno 8 caratteri.", "error")
            return render_template("auth/nuova_password.html", token=token_plain)
        if password != conferma:
            flash("Le password non coincidono.", "error")
            return render_template("auth/nuova_password.html", token=token_plain)

        utente.set_password(password)
        utente.token_reset = None
        utente.scadenza_token = None
        db.session.commit()
        logger.info("Password reimpostata per %s", utente.email)
        flash("Password aggiornata! Accedi con la nuova password.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/nuova_password.html", token=token_plain)
