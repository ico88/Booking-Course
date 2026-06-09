import secrets
from datetime import datetime, timezone, timedelta

from flask import (
    Blueprint, render_template, redirect, url_for,
    request, flash, current_app, abort,
)
from flask_login import current_user, login_required

from ..models import db, Corso, Prenotazione, Partecipante, Utente, LeadMarketing, Impostazione, StatoPrenotazione, MetodoPagamento
from ..email_service import (
    invia_email_prenotazione, invia_email_notifica_segreteria,
    invia_email_verifica_lead,
)

public_bp = Blueprint("public", __name__)


# ---------------------------------------------------------------------------
# Homepage
# ---------------------------------------------------------------------------

@public_bp.route("/")
def index():
    corsi = (
        Corso.query
        .filter_by(pubblicato=True)
        .order_by(Corso.data_inizio.asc())
        .all()
    )
    return render_template("public/index.html", corsi=corsi)


# ---------------------------------------------------------------------------
# Corso dettaglio
# ---------------------------------------------------------------------------

@public_bp.route("/corsi/<string:corso_id>")
def corso_dettaglio(corso_id):
    corso = Corso.query.filter_by(id=corso_id, pubblicato=True).first_or_404()
    return render_template("public/corso_dettaglio.html", corso=corso)


# ---------------------------------------------------------------------------
# Prenota corso
# ---------------------------------------------------------------------------

@public_bp.route("/corsi/<string:corso_id>/prenota", methods=["GET", "POST"])
@login_required
def prenota(corso_id):
    corso = Corso.query.filter_by(id=corso_id, pubblicato=True).first_or_404()

    if request.method == "POST":
        numero_posti = int(request.form.get("numero_posti", 1))
        note = request.form.get("note", "").strip()

        # Validate seats
        if numero_posti < 1:
            flash("Numero posti non valido.", "error")
            return render_template("public/prenota.html", corso=corso)
        if corso.posti_disponibili < numero_posti:
            flash("Posti insufficienti disponibili.", "error")
            return render_template("public/prenota.html", corso=corso)

        # Check existing active booking
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
            utente_id=current_user.id,
            corso_id=corso_id,
            numero_posti=numero_posti,
            note=note,
            scadenza_pagamento=scadenza,
            stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
        )
        db.session.add(prenotazione)
        corso.posti_occupati = (corso.posti_occupati or 0) + numero_posti
        db.session.commit()

        # Partecipanti
        for i in range(numero_posti):
            nome_p = request.form.get(f"partecipante_{i}_nome", "").strip()
            cognome_p = request.form.get(f"partecipante_{i}_cognome", "").strip()
            if nome_p or cognome_p:
                p = Partecipante(
                    prenotazione_id=prenotazione.id,
                    nome=nome_p or current_user.nome,
                    cognome=cognome_p or current_user.cognome,
                    email=request.form.get(f"partecipante_{i}_email", "").strip(),
                    telefono=request.form.get(f"partecipante_{i}_telefono", "").strip(),
                    codice_fiscale=request.form.get(f"partecipante_{i}_cf", "").strip(),
                )
                db.session.add(p)
        db.session.commit()

        try:
            invia_email_prenotazione(prenotazione)
            invia_email_notifica_segreteria(
                f"Nuova prenotazione - {corso.titolo}",
                f"{current_user.nome_completo} ha prenotato {numero_posti} posto/i per {corso.titolo}.",
            )
        except Exception:
            pass

        flash("Prenotazione effettuata con successo!", "success")
        return redirect(url_for("dashboard.pagamento", prenotazione_id=prenotazione.id))

    return render_template("public/prenota.html", corso=corso)


# ---------------------------------------------------------------------------
# Marketing - notifiche corsi
# ---------------------------------------------------------------------------

@public_bp.route("/notifiche-corsi", methods=["GET", "POST"])
def notifiche_corsi():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        nome = request.form.get("nome", "").strip()
        cognome = request.form.get("cognome", "").strip()

        if not email or "@" not in email:
            flash("Email non valida.", "error")
            return render_template("public/notifiche_corsi.html")

        lead = LeadMarketing.query.filter_by(email=email).first()
        if not lead:
            token = secrets.token_urlsafe(32)
            lead = LeadMarketing(
                email=email,
                nome=nome,
                cognome=cognome,
                token_verifica=token,
                token_scadenza=datetime.now(timezone.utc) + timedelta(days=7),
            )
            db.session.add(lead)
            db.session.commit()
            verifica_url = f"{current_app.config['APP_URL']}/conferma-iscrizione?token={token}"
            try:
                invia_email_verifica_lead(lead, verifica_url)
            except Exception:
                pass
        flash("Controlla la tua email per confermare l'iscrizione.", "info")
        return redirect(url_for("public.index"))

    return render_template("public/notifiche_corsi.html")


@public_bp.route("/conferma-iscrizione")
def conferma_iscrizione():
    token = request.args.get("token")
    lead = LeadMarketing.query.filter_by(token_verifica=token).first()
    if not lead or not lead.token_scadenza or lead.token_scadenza < datetime.now(timezone.utc):
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
    email = request.args.get("email", "").strip().lower()
    token = request.args.get("token", "")
    lead = LeadMarketing.query.filter_by(email=email).first()
    unsubscribed = False
    if lead:
        lead.attivo = False
        db.session.commit()
        unsubscribed = True
    return render_template("public/disiscrivi.html", unsubscribed=unsubscribed)


# ---------------------------------------------------------------------------
# Pagine legali
# ---------------------------------------------------------------------------

@public_bp.route("/privacy-policy")
def privacy_policy():
    content = Impostazione.get("pagina_privacy") or "<p>Privacy policy non ancora configurata.</p>"
    return render_template("public/pagina_legale.html", titolo="Privacy Policy", content=content)


@public_bp.route("/cookie-policy")
def cookie_policy():
    content = Impostazione.get("pagina_cookie") or "<p>Cookie policy non ancora configurata.</p>"
    return render_template("public/pagina_legale.html", titolo="Cookie Policy", content=content)


@public_bp.route("/termini-condizioni")
def termini_condizioni():
    content = Impostazione.get("pagina_termini") or "<p>Termini e condizioni non ancora configurati.</p>"
    return render_template("public/pagina_legale.html", titolo="Termini e Condizioni", content=content)
