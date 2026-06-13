import os, uuid, logging, json
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app, abort, send_from_directory, Response
from flask_login import login_required, current_user
from ..models import db, Prenotazione, Utente, StatoPrenotazione, MetodoPagamento
from ..email_service import invia_email_contabile_caricata, invia_email_notifica_segreteria, invia_email_conferma_consenso_marketing
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
            conferma_pw = request.form.get("conferma_password") or ""
            if nuova_pw != conferma_pw:
                flash("Le password non coincidono.", "error")
                return render_template("dashboard/dati_personali.html")
            if len(nuova_pw) < 8:
                flash("La nuova password deve avere almeno 8 caratteri.", "error")
                return render_template("dashboard/dati_personali.html")
            current_user.set_password(nuova_pw)
        consenso_marketing = request.form.get("consenso_marketing") == "on"
        marketing_appena_attivato = consenso_marketing and not current_user.consenso_marketing
        if consenso_marketing != current_user.consenso_marketing:
            current_user.consenso_marketing = consenso_marketing
            if consenso_marketing:
                current_user.data_consenso = datetime.now(timezone.utc)
        # Salva preferenze tag marketing
        selected_tags = request.form.getlist("tags_marketing")
        current_user.tags_marketing = selected_tags
        db.session.commit()
        if marketing_appena_attivato:
            try:
                invia_email_conferma_consenso_marketing(current_user)
            except Exception as exc:
                logger.error("Errore email conferma marketing: %s", exc)
        flash("Dati aggiornati con successo.", "success")
        return redirect(url_for("dashboard.dati_personali"))
    from ..models import Impostazione
    import json as _json
    try:
        raw = Impostazione.get("newsletter_tags") or "[]"
        newsletter_tags = _json.loads(raw)
    except Exception:
        newsletter_tags = []
    return render_template("dashboard/dati_personali.html", newsletter_tags=newsletter_tags)


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


@dashboard_bp.route("/esporta-dati")
@login_required
def esporta_dati():
    u = current_user
    prenotazioni = Prenotazione.query.filter_by(utente_id=u.id).all()
    export = {
        "esportato_il": datetime.now(timezone.utc).isoformat(),
        "profilo": {
            "nome": u.nome,
            "cognome": u.cognome,
            "email": u.email,
            "telefono": u.telefono or "",
            "codice_fiscale": u.codice_fiscale or "",
            "ruolo": u.ruolo.value,
            "consenso_privacy": u.consenso_privacy,
            "consenso_marketing": u.consenso_marketing,
            "tags_marketing": u.tags_marketing or [],
            "data_consenso": u.data_consenso.isoformat() if u.data_consenso else None,
            "registrato_il": u.created_at.isoformat() if u.created_at else None,
        },
        "prenotazioni": [
            {
                "id": p.id,
                "corso": p.corso.titolo if p.corso else "",
                "data_corso": p.corso.data_inizio.isoformat() if p.corso and p.corso.data_inizio else None,
                "luogo": p.corso.luogo if p.corso else "",
                "numero_posti": p.numero_posti,
                "stato": p.stato.value,
                "metodo_pagamento": p.metodo_pagamento.value if p.metodo_pagamento else None,
                "importo_pagato": float(p.importo_pagato) if p.importo_pagato else None,
                "note": p.note or "",
                "creata_il": p.created_at.isoformat() if p.created_at else None,
                "partecipanti": [
                    {
                        "nome": part.nome,
                        "cognome": part.cognome,
                        "email": part.email or "",
                        "telefono": part.telefono or "",
                        "codice_fiscale": part.codice_fiscale or "",
                    }
                    for part in p.partecipanti
                ],
            }
            for p in prenotazioni
        ],
    }
    logger.info("Esportazione dati personali: %s", u.email)
    return Response(
        json.dumps(export, ensure_ascii=False, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename=miei-dati-{u.id[:8]}.json"},
    )


@dashboard_bp.route("/manuale")
@login_required
def manuale():
    return render_template("dashboard/manuale.html")
