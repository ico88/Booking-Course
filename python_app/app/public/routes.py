import secrets
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app, abort
from flask_login import current_user, login_required
from ..models import db, Corso, Prenotazione, Partecipante, Utente, LeadMarketing, Impostazione, StatoPrenotazione, MetodoPagamento
from ..email_service import (
    invia_email_prenotazione, invia_email_conferma_prenotazione,
    invia_email_notifica_segreteria, invia_email_verifica_lead,
)
from ..utils import validate_email_address, verify_unsubscribe_token, validate_int_range, sanitize_html
from .. import limiter

public_bp = Blueprint("public", __name__)
logger = logging.getLogger(__name__)


@public_bp.route("/")
def index():
    now = datetime.now(timezone.utc)
    corsi = Corso.query.filter_by(pubblicato=True).order_by(Corso.data_inizio.asc()).all()

    def _dt(d):
        if d is None:
            return None
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

    corsi_aperti = [c for c in corsi if c.data_inizio and _dt(c.data_inizio) > now and (not c.posti_totali or c.posti_disponibili > 0)]
    corsi_completi = [c for c in corsi if c.data_inizio and _dt(c.data_inizio) > now and c.posti_totali and c.posti_disponibili <= 0]
    corsi_passati = [c for c in corsi if not c.data_inizio or _dt(c.data_inizio) <= now]
    return render_template("public/index.html",
                           corsi_aperti=corsi_aperti,
                           corsi_completi=corsi_completi,
                           corsi_passati=corsi_passati)


@public_bp.route("/corsi/<string:corso_id>")
def corso_dettaglio(corso_id):
    corso = Corso.query.filter_by(id=corso_id, pubblicato=True).first_or_404()
    now = datetime.now(timezone.utc)
    di = corso.data_inizio
    di_aware = di.replace(tzinfo=timezone.utc) if di and not di.tzinfo else di
    is_passato = bool(di_aware and di_aware <= now)
    is_completo = bool(corso.posti_totali and corso.posti_disponibili <= 0)
    posti_liberi = corso.posti_disponibili if corso.posti_totali else None
    perc = int(min(100, round((corso.posti_occupati or 0) / corso.posti_totali * 100))) if corso.posti_totali else 0
    return render_template("public/corso_dettaglio.html", corso=corso,
                           is_passato=is_passato, is_completo=is_completo,
                           posti_liberi=posti_liberi, perc_occupazione=perc)


@public_bp.route("/corsi/<string:corso_id>/prenota", methods=["GET", "POST"])
@login_required
@limiter.limit("10 per hour")
def prenota(corso_id):
    corso = Corso.query.filter_by(id=corso_id, pubblicato=True).first_or_404()

    if request.method == "POST":
        max_posti = corso.posti_disponibili if corso.posti_totali else 50
        numero_posti = validate_int_range(request.form.get("numero_posti", 1), 1, max_posti)
        if numero_posti is None:
            flash("Numero posti non valido.", "error")
            return render_template("public/prenota.html", corso=corso)

        note = (request.form.get("note") or "").strip()[:1000]

        if corso.posti_totali and corso.posti_disponibili < numero_posti:
            flash("Posti insufficienti disponibili.", "error")
            return render_template("public/prenota.html", corso=corso)

        existing = Prenotazione.query.filter(
            Prenotazione.utente_id == current_user.id,
            Prenotazione.corso_id == corso_id,
            Prenotazione.stato.notin_([StatoPrenotazione.ANNULLATA, StatoPrenotazione.SCADUTA]),
        ).first()
        if existing:
            flash("Hai già una prenotazione attiva per questo corso.", "error")
            return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=existing.id))

        scadenza = datetime.now(timezone.utc) + timedelta(hours=corso.timeout_pagamento_ore or 24)
        prenotazione = Prenotazione(
            utente_id=current_user.id, corso_id=corso_id, numero_posti=numero_posti,
            note=note, scadenza_pagamento=scadenza, stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
        )
        db.session.add(prenotazione)
        corso.posti_occupati = (corso.posti_occupati or 0) + numero_posti
        db.session.commit()

        for i in range(numero_posti):
            nome_p = (request.form.get(f"partecipante_{i}_nome") or "").strip()[:100]
            cognome_p = (request.form.get(f"partecipante_{i}_cognome") or "").strip()[:100]
            email_p = validate_email_address((request.form.get(f"partecipante_{i}_email") or "").strip()) or ""
            telefono_p = (request.form.get(f"partecipante_{i}_telefono") or "").strip()[:30]
            cf_p = (request.form.get(f"partecipante_{i}_cf") or "").strip()[:20].upper()
            if nome_p or cognome_p:
                p = Partecipante(
                    prenotazione_id=prenotazione.id,
                    nome=nome_p or current_user.nome,
                    cognome=cognome_p or current_user.cognome,
                    email=email_p,
                    telefono=telefono_p,
                    codice_fiscale=cf_p,
                )
                db.session.add(p)
            # Aggiorna anagrafica utente dal primo partecipante se fornisce dati mancanti o aggiornati
            if i == 0:
                if cf_p and cf_p != (current_user.codice_fiscale or ""):
                    current_user.codice_fiscale = cf_p
                if telefono_p and telefono_p != (current_user.telefono or ""):
                    current_user.telefono = telefono_p
        # Corsi gratuiti: conferma immediata senza passare per il pagamento
        if float(corso.costo or 0) == 0:
            prenotazione.stato = StatoPrenotazione.CONFERMATA
            prenotazione.scadenza_pagamento = None
            db.session.commit()
            try:
                invia_email_conferma_prenotazione(prenotazione)
                invia_email_notifica_segreteria(
                    f"Nuova prenotazione (gratuita) - {corso.titolo}",
                    f"{current_user.nome_completo} si è iscritto (corso gratuito) a {corso.titolo}.",
                )
            except Exception as exc:
                logger.error("Errore email corso gratuito: %s", exc)
            flash("Iscrizione confermata! Il corso è gratuito.", "success")
            return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=prenotazione.id))

        db.session.commit()

        try:
            invia_email_prenotazione(prenotazione)
            invia_email_notifica_segreteria(
                f"Nuova prenotazione - {corso.titolo}",
                f"{current_user.nome_completo} ha prenotato {numero_posti} posto/i per {corso.titolo}.",
            )
        except Exception as exc:
            logger.error("Errore email prenotazione: %s", exc)

        flash("Prenotazione effettuata con successo!", "success")
        return redirect(url_for("dashboard.pagamento", prenotazione_id=prenotazione.id))

    return render_template("public/prenota.html", corso=corso)


@public_bp.route("/notifiche-corsi", methods=["GET", "POST"])
@limiter.limit("10 per hour")
def notifiche_corsi():
    # Se l'utente è loggato, gestisce l'iscrizione tramite il profilo
    if current_user.is_authenticated:
        if not current_user.consenso_marketing:
            flash(
                "Per ricevere notifiche sui corsi devi abilitare il consenso "
                "alle comunicazioni di marketing nel tuo profilo. "
                "Spunta la casella nella sezione 'Privacy e comunicazioni' e salva.",
                "info",
            )
            return redirect(url_for("dashboard.dati_personali"))
        flash("Il tuo profilo è già abilitato a ricevere notifiche sui corsi.", "success")
        return redirect(url_for("dashboard.dati_personali"))

    # Use centralized newsletter tags; fall back to tags from published courses
    import json as _json
    _raw_tags = Impostazione.get("newsletter_tags")
    if _raw_tags:
        try:
            _parsed = _json.loads(_raw_tags)
            tag_disponibili = sorted(t for t in _parsed if t) if isinstance(_parsed, list) else []
        except Exception:
            tag_disponibili = []
    else:
        corsi = Corso.query.filter_by(pubblicato=True).all()
        tag_disponibili = sorted({t for c in corsi for t in (c.tags or [])})

    if request.method == "POST":
        email = validate_email_address((request.form.get("email") or "").strip())
        if not email:
            flash("Email non valida.", "error")
            return render_template("public/notifiche_corsi.html", tag_disponibili=tag_disponibili)

        nome = (request.form.get("nome") or "").strip()[:100]
        cognome = (request.form.get("cognome") or "").strip()[:100]
        # Accept only tags that exist in the centralized list
        tags_selezionati = [t for t in request.form.getlist("tags") if t in tag_disponibili]

        lead = LeadMarketing.query.filter_by(email=email).first()
        if not lead:
            token = secrets.token_urlsafe(32)
            lead = LeadMarketing(
                email=email, nome=nome, cognome=cognome,
                tags=tags_selezionati,
                token_verifica=token,
                token_scadenza=datetime.now(timezone.utc) + timedelta(days=7),
            )
            db.session.add(lead)
            db.session.commit()
            verifica_url = f"{current_app.config['APP_URL']}/conferma-iscrizione?token={token}"
            try:
                invia_email_verifica_lead(lead, verifica_url)
            except Exception as exc:
                logger.error("Errore email verifica lead: %s", exc)
        else:
            # Update tags for existing lead
            existing = set(lead.tags or [])
            lead.tags = list(existing | set(tags_selezionati))
            db.session.commit()

        flash("Controlla la tua email per confermare l'iscrizione.", "info")
        return redirect(url_for("public.index"))

    return render_template("public/notifiche_corsi.html", tag_disponibili=tag_disponibili)


@public_bp.route("/conferma-iscrizione")
def conferma_iscrizione():
    token = request.args.get("token") or ""
    lead = LeadMarketing.query.filter_by(token_verifica=token).first()
    if not token or not lead or not lead.token_scadenza or lead.token_scadenza < datetime.now(timezone.utc):
        flash("Link non valido o scaduto.", "error")
        return redirect(url_for("public.index"))
    lead.verificato = True
    lead.token_verifica = None
    lead.token_scadenza = None
    lead.attivo = True
    db.session.commit()
    return render_template("public/conferma_iscrizione.html")


@public_bp.route("/disiscrivi")
def disiscrivi():
    email = (request.args.get("email") or "").strip().lower()
    token = request.args.get("token") or ""
    secret = current_app.config.get("SECRET_KEY", "")

    if not verify_unsubscribe_token(email, token, secret):
        logger.warning("Tentativo disiscrizione con token non valido per %s", email)
        return render_template("public/disiscrivi.html", unsubscribed=False)

    lead = LeadMarketing.query.filter_by(email=email).first()
    if lead:
        lead.attivo = False
        db.session.commit()
    return render_template("public/disiscrivi.html", unsubscribed=bool(lead))


@public_bp.route("/privacy-policy")
def privacy_policy():
    from ..pagine_legali_defaults import DEFAULT_PRIVACY_POLICY
    stored = Impostazione.get("pagina_privacy")
    content = sanitize_html(stored) if stored else DEFAULT_PRIVACY_POLICY
    return render_template("public/pagina_legale.html", titolo="Privacy Policy", content=content)


@public_bp.route("/cookie-policy")
def cookie_policy():
    from ..pagine_legali_defaults import DEFAULT_COOKIE_POLICY, genera_tabella_cookie
    tabella = genera_tabella_cookie(Impostazione.get("app_name") or current_app.config.get("APP_NAME", ""))
    stored = Impostazione.get("pagina_cookie")
    content = sanitize_html(stored) if stored else DEFAULT_COOKIE_POLICY
    content = content.replace("{{TABELLA_COOKIE}}", tabella)
    return render_template("public/pagina_legale.html", titolo="Cookie Policy", content=content)


@public_bp.route("/termini-condizioni")
def termini_condizioni():
    from ..pagine_legali_defaults import DEFAULT_TERMINI
    stored = Impostazione.get("pagina_termini")
    content = sanitize_html(stored) if stored else DEFAULT_TERMINI
    return render_template("public/pagina_legale.html", titolo="Termini e Condizioni", content=content)
