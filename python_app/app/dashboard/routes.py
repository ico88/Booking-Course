import os, uuid, logging
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app, abort, send_from_directory
from flask_login import login_required, current_user
from ..models import db, Prenotazione, Utente, StatoPrenotazione, MetodoPagamento
from ..email_service import invia_email_contabile_caricata, invia_email_notifica_segreteria
from ..utils import allowed_file, validate_email_address
from .. import limiter

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")
logger = logging.getLogger(__name__)
_UPLOAD_RECEIPT_EXTS = {"pdf", "jpg", "jpeg", "png"}
_MAX_RECEIPT_SIZE = 10 * 1024 * 1024


def _get_prenotazione_or_403(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        logger.warning("Accesso non autorizzato a prenotazione %s da %s", prenotazione_id, current_user.id)
        abort(403)
    return p


@dashboard_bp.route("/")
@login_required
def index():
    prenotazioni = Prenotazione.query.filter_by(utente_id=current_user.id).order_by(Prenotazione.created_at.desc()).all()
    return render_template("dashboard/index.html", prenotazioni=prenotazioni)


@dashboard_bp.route("/prenotazioni/<string:prenotazione_id>")
@login_required
def prenotazione_dettaglio(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)
    return render_template("dashboard/prenotazione_dettaglio.html", prenotazione=p)


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
    return render_template("dashboard/pagamento.html", prenotazione=p,
                           stripe_publishable_key=stripe_key, paypal_client_id=paypal_client_id)


@dashboard_bp.route("/prenotazioni/<string:prenotazione_id>/upload", methods=["POST"])
@login_required
@limiter.limit("10 per hour")
def upload_contabile(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)
    if p.stato not in (StatoPrenotazione.IN_ATTESA_PAGAMENTO, StatoPrenotazione.PAGAMENTO_CARICATO):
        flash("Operazione non permessa.", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))

    file = request.files.get("file")
    if not file or not file.filename:
        flash("Nessun file selezionato.", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))
    if not allowed_file(file.filename, _UPLOAD_RECEIPT_EXTS):
        flash("Formato non supportato. Usa PDF, JPG o PNG.", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))
    file.seek(0, 2)
    if file.tell() > _MAX_RECEIPT_SIZE:
        flash("File troppo grande (max 10 MB).", "error")
        return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))
    file.seek(0)

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"contabile_{p.id}_{uuid.uuid4().hex}.{ext}"  # no user input in name
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "contabili")
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))

    p.url_contabile = f"/static/uploads/contabili/{filename}"
    p.nome_file_contabile = file.filename[:255]
    p.stato = StatoPrenotazione.PAGAMENTO_CARICATO
    p.metodo_pagamento = MetodoPagamento.BONIFICO
    db.session.commit()

    try:
        invia_email_contabile_caricata(p)
        invia_email_notifica_segreteria("Ricevuta caricata",
            f"{current_user.nome_completo} ha caricato la ricevuta per {p.corso.titolo}.")
    except Exception as exc:
        logger.error("Errore email upload: %s", exc)

    flash("Ricevuta caricata con successo!", "success")
    return redirect(url_for("dashboard.prenotazione_dettaglio", prenotazione_id=p.id))


@dashboard_bp.route("/prenotazioni/<string:prenotazione_id>/attestato")
@login_required
def scarica_attestato(prenotazione_id):
    p = _get_prenotazione_or_403(prenotazione_id)
    if not p.attestato_emesso or not p.attestato_url:
        abort(404)
    filename = os.path.basename(p.attestato_url)
    if "/" in filename or "\\" in filename or ".." in filename:
        abort(400)
    directory = os.path.join(current_app.root_path, "static", "uploads", "attestati")
    return send_from_directory(directory, filename, as_attachment=True)


@dashboard_bp.route("/dati-personali", methods=["GET", "POST"])
@login_required
def dati_personali():
    if request.method == "POST":
        nome = (request.form.get("nome") or "").strip()[:100]
        cognome = (request.form.get("cognome") or "").strip()[:100]
        if nome:
            current_user.nome = nome
        if cognome:
            current_user.cognome = cognome
        current_user.telefono = (request.form.get("telefono") or "").strip()[:30]
        current_user.codice_fiscale = (request.form.get("codice_fiscale") or "").strip()[:20].upper()
        nuova_pw = request.form.get("nuova_password") or ""
        if nuova_pw:
            password_attuale = request.form.get("password_attuale") or ""
            if not password_attuale:
                flash("Inserisci la password attuale per cambiarla.", "error")
                return render_template("dashboard/dati_personali.html")
            if not current_user.check_password(password_attuale):
                flash("La password attuale non è corretta.", "error")
                return render_template("dashboard/dati_personali.html")
            if len(nuova_pw) < 8:
                flash("La nuova password deve avere almeno 8 caratteri.", "error")
                return render_template("dashboard/dati_personali.html")
            current_user.set_password(nuova_pw)
        consenso_marketing = request.form.get("consenso_marketing") == "on"
        if consenso_marketing != current_user.consenso_marketing:
            current_user.consenso_marketing = consenso_marketing
            if consenso_marketing:
                current_user.data_consenso = datetime.now(timezone.utc)
        db.session.commit()
        flash("Dati aggiornati con successo.", "success")
        return redirect(url_for("dashboard.dati_personali"))
    return render_template("dashboard/dati_personali.html")


@dashboard_bp.route("/cancella-account", methods=["POST"])
@login_required
def cancella_account():
    from flask_login import logout_user
    email = current_user.email
    utente = Utente.query.get(current_user.id)
    logout_user()
    db.session.delete(utente)
    db.session.commit()
    logger.info("Account eliminato: %s", email)
    flash("Account eliminato.", "info")
    return redirect(url_for("public.index"))
