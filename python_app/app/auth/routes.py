import secrets
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from time import time

from flask import (
    Blueprint, render_template, redirect, url_for,
    request, flash, session, current_app,
)
from flask_login import login_user, logout_user, login_required, current_user

from ..models import db, Utente
from ..email_service import invia_email_reset_password, invia_email_benvenuto

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Simple in-memory rate limiter: {ip: [(timestamp), ...]}
_login_attempts: dict = defaultdict(list)


def _check_rate_limit(ip: str) -> bool:
    window = current_app.config["RATELIMIT_LOGIN_WINDOW"]
    max_attempts = current_app.config["RATELIMIT_LOGIN_ATTEMPTS"]
    now = time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < window]
    if len(_login_attempts[ip]) >= max_attempts:
        return False
    _login_attempts[ip].append(now)
    return True


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")

        if not _check_rate_limit(ip):
            flash("Troppi tentativi di accesso. Riprova tra 15 minuti.", "error")
            return render_template("auth/login.html")

        utente = Utente.query.filter_by(email=email).first()
        if utente and utente.check_password(password):
            login_user(utente, remember=True)
            next_url = request.args.get("next") or (
                url_for("admin.index") if utente.is_admin() else url_for("dashboard.index")
            )
            return redirect(next_url)

        flash("Email o password non corretti.", "error")

    return render_template("auth/login.html")


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("public.index"))


# ---------------------------------------------------------------------------
# Registrazione
# ---------------------------------------------------------------------------

@auth_bp.route("/registrazione", methods=["GET", "POST"])
def registrazione():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        cognome = request.form.get("cognome", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        consenso = request.form.get("consenso_privacy") == "on"
        marketing = request.form.get("consenso_marketing") == "on"

        errors = []
        if not nome:
            errors.append("Il nome è obbligatorio.")
        if not cognome:
            errors.append("Il cognome è obbligatorio.")
        if not email or "@" not in email:
            errors.append("Email non valida.")
        if len(password) < 8:
            errors.append("La password deve avere almeno 8 caratteri.")
        if not consenso:
            errors.append("Devi accettare la privacy policy.")
        if Utente.query.filter_by(email=email).first():
            errors.append("Email già registrata.")

        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("auth/registrazione.html")

        utente = Utente(
            nome=nome,
            cognome=cognome,
            email=email,
            ruolo="UTENTE",
            consenso_privacy=consenso,
            consenso_marketing=marketing,
            data_consenso=datetime.now(timezone.utc),
        )
        utente.set_password(password)
        db.session.add(utente)
        db.session.commit()

        try:
            invia_email_benvenuto(utente)
        except Exception:
            pass

        login_user(utente, remember=True)
        flash("Registrazione completata! Benvenuto.", "success")
        return redirect(url_for("dashboard.index"))

    return render_template("auth/registrazione.html")


# ---------------------------------------------------------------------------
# Recupera password
# ---------------------------------------------------------------------------

@auth_bp.route("/recupera-password", methods=["GET", "POST"])
def recupera_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        utente = Utente.query.filter_by(email=email).first()
        if utente:
            token = secrets.token_urlsafe(32)
            utente.token_reset = token
            utente.scadenza_token = datetime.now(timezone.utc) + timedelta(hours=1)
            db.session.commit()
            link = f"{current_app.config['APP_URL']}/auth/nuova-password?token={token}"
            try:
                invia_email_reset_password(utente, link)
            except Exception:
                pass
        # Sempre stesso messaggio per non rivelare se l'email esiste
        flash("Se l'email esiste riceverai un link per reimpostare la password.", "info")
        return redirect(url_for("auth.login"))

    return render_template("auth/recupera_password.html")


# ---------------------------------------------------------------------------
# Nuova password
# ---------------------------------------------------------------------------

@auth_bp.route("/nuova-password", methods=["GET", "POST"])
def nuova_password():
    token = request.args.get("token") or request.form.get("token")
    if not token:
        flash("Link non valido.", "error")
        return redirect(url_for("auth.login"))

    utente = Utente.query.filter_by(token_reset=token).first()
    if not utente or not utente.scadenza_token or utente.scadenza_token < datetime.now(timezone.utc):
        flash("Il link è scaduto o non valido. Richiedi un nuovo link.", "error")
        return redirect(url_for("auth.recupera_password"))

    if request.method == "POST":
        password = request.form.get("password", "")
        conferma = request.form.get("conferma_password", "")
        if len(password) < 8:
            flash("La password deve avere almeno 8 caratteri.", "error")
            return render_template("auth/nuova_password.html", token=token)
        if password != conferma:
            flash("Le password non coincidono.", "error")
            return render_template("auth/nuova_password.html", token=token)

        utente.set_password(password)
        utente.token_reset = None
        utente.scadenza_token = None
        db.session.commit()
        flash("Password aggiornata! Accedi con la nuova password.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/nuova_password.html", token=token)
