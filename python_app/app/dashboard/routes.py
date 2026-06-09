import os
import uuid
from datetime import datetime, timezone

from flask import (
    Blueprint, render_template, redirect, url_for,
    request, flash, current_app, abort, send_from_directory,
)
from flask_login import login_required, current_user

from ..models import db, Prenotazione, Corso, Utente, StatoPrenotazione, MetodoPagamento
from ..email_service import (
    invia_email_contabile_caricata, invia_email_notifica_segreteria,
)
from ..utils import allowed_file, safe_filename

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


def _get_prenotazione_or_403(prenotazione_id: str) -> Prenotazione:
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        abort(403)
    return p


# ---------------------------------------------------------------------------
# Dashboard homepage
# ---------------------------------------------------------------------------

@dashboard_bp.route("/")
@login_required
def index():
    prenotazioni = (
        Prenotazione.query
        .filter_by(utente_id=current_user.id)
        .order_by(Prenotazione.created_at.desc())
        .all()
    )
    return render_template("dashboard/index.html", prenotazioni=prenotazioni)


# ---------------------------------------------------------------------------
# Dettaglio prenotazione
# ---------------------------------------------------------------------------

@dashboard_bp.route("/prenotazioni/<string:prenotazione_id>")
@login_required
def prenotazione_dettaglio(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)
    return render_template("dashboard/prenotazione_dettaglio.html", prenotazione=p)


# ---------------------------------------------------------------------------
# Pagamento
# ---------------------------------------------------------------------------

@dashboard_bp.route("/pagamento/<string:prenotazione_id>", methods=["GET", "POST"])
@login_required
def pagamento(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)

    if p.stato != StatoPrenotazione.IN_ATTESA_PAGAMENTO:
        flash("Questa prenotazione non è in attesa di pagamento.", "info")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))

    from ..models import Impostazione
    stripe_key = Impostazione.get("stripe_publishable_key") or current_app.config.get("STRIPE_PUBLISHABLE_KEY", "")
    paypal_client_id = Impostazione.get("paypal_client_id") or current_app.config.get("PAYPAL_CLIENT_ID", "")

    return render_template(
        "dashboard/pagamento.html",
        prenotazione=p,
        stripe_publishable_key=stripe_key,
        paypal_client_id=paypal_client_id,
    )


# ---------------------------------------------------------------------------
# Upload ricevuta (bonifico)
# ---------------------------------------------------------------------------

@dashboard_bp.route("/prenotazioni/<string:prenotazione_id>/upload", methods=["POST"])
@login_required
def upload_contabile(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)

    if p.stato not in (StatoPrenotazione.IN_ATTESA_PAGAMENTO, StatoPrenotazione.PAGAMENTO_CARICATO):
        flash("Operazione non permessa.", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))

    file = request.files.get("file")
    if not file or not file.filename:
        flash("Nessun file selezionato.", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))

    if not allowed_file(file.filename, {"pdf", "jpg", "jpeg", "png"}):
        flash("Formato non supportato. Usa PDF, JPG o PNG.", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"contabile_{p.id}_{uuid.uuid4().hex[:8]}.{ext}"
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "contabili")
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))

    p.url_contabile = f"/static/uploads/contabili/{filename}"
    p.nome_file_contabile = file.filename
    p.stato = StatoPrenotazione.PAGAMENTO_CARICATO
    p.metodo_pagamento = MetodoPagamento.BONIFICO
    db.session.commit()

    try:
        invia_email_contabile_caricata(p)
        invia_email_notifica_segreteria(
            "Ricevuta caricata",
            f"{current_user.nome_completo} ha caricato la ricevuta per {p.corso.titolo}.",
        )
    except Exception:
        pass

    flash("Ricevuta caricata con successo!", "success")
    return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))


# ---------------------------------------------------------------------------
# Scarica attestato
# ---------------------------------------------------------------------------

@dashboard_bp.route("/prenotazioni/<string:prenotazione_id>/attestato")
@login_required
def scarica_attestato(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)
    if not p.attestato_emesso or not p.attestato_url:
        abort(404)
    path = p.attestato_url.lstrip("/")
    directory = os.path.join(current_app.root_path, "static", "uploads", "attestati")
    filename = os.path.basename(p.attestato_url)
    return send_from_directory(directory, filename, as_attachment=True)


# ---------------------------------------------------------------------------
# Dati personali
# ---------------------------------------------------------------------------

@dashboard_bp.route("/dati-personali", methods=["GET", "POST"])
@login_required
def dati_personali():
    if request.method == "POST":
        current_user.nome = request.form.get("nome", "").strip() or current_user.nome
        current_user.cognome = request.form.get("cognome", "").strip() or current_user.cognome
        current_user.telefono = request.form.get("telefono", "").strip()
        current_user.codice_fiscale = request.form.get("codice_fiscale", "").strip()

        nuova_pw = request.form.get("nuova_password", "")
        if nuova_pw:
            if len(nuova_pw) < 8:
                flash("La password deve avere almeno 8 caratteri.", "error")
                return render_template("dashboard/dati_personali.html")
            current_user.set_password(nuova_pw)

        db.session.commit()
        flash("Dati aggiornati con successo.", "success")
        return redirect(url_for("dashboard.dati_personali"))

    return render_template("dashboard/dati_personali.html")


# ---------------------------------------------------------------------------
# Cancella account
# ---------------------------------------------------------------------------

@dashboard_bp.route("/cancella-account", methods=["POST"])
@login_required
def cancella_account():
    from flask_login import logout_user
    utente = Utente.query.get(current_user.id)
    logout_user()
    db.session.delete(utente)
    db.session.commit()
    flash("Account eliminato.", "info")
    return redirect(url_for("public.index"))
