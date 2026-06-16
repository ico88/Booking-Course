import logging
import os
import re
import uuid
import csv
import io
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import (
    Blueprint, render_template, redirect, url_for,
    request, flash, current_app, abort,
    send_from_directory, Response,
)
from flask_login import login_required, current_user
from markupsafe import escape
from sqlalchemy import func

from ..models import (
    db, Utente, Corso, Prenotazione, Partecipante, LeadMarketing,
    Impostazione, StatoPrenotazione, MetodoPagamento, Ruolo, InvioMarketing,
)
from ..email_service import (
    invia_email_conferma_prenotazione, invia_email_attestato,
    invia_email_marketing, invia_email_benvenuto, send_email_bulk,
    _build_marketing_html,
)
from ..utils import allowed_file, safe_filename, sanitize_html, validate_email_address

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")
logger = logging.getLogger(__name__)


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if not current_user.is_admin():
            abort(403)
        return f(*args, **kwargs)
    return decorated


def superadmin_required(f):
    """Solo ruolo ADMIN puro — esclude SEGRETERIA."""
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        from app.models import Ruolo
        from flask import flash, redirect, url_for
        if current_user.ruolo != Ruolo.ADMIN:
            flash("Non hai i permessi per accedere a questa sezione.", "error")
            return redirect(url_for("admin.index"))
        return f(*args, **kwargs)
    return decorated


# ===========================================================================
# ATTESTATI
# ===========================================================================

@admin_bp.route("/attestati")
@admin_required
def attestati():
    da_emettere = (
        Prenotazione.query
        .filter_by(stato=StatoPrenotazione.CONFERMATA, attestato_emesso=False)
        .join(Prenotazione.corso)
        .filter(Corso.attestato_abilitato == True)
        .order_by(Prenotazione.created_at.desc())
        .all()
    )
    emessi = (
        Prenotazione.query
        .filter_by(attestato_emesso=True)
        .order_by(Prenotazione.attestato_emesso_at.desc())
        .all()
    )
    return render_template("admin/attestati/lista.html", da_emettere=da_emettere, emessi=emessi)


# ---------------------------------------------------------------------------
# Dashboard admin
# ---------------------------------------------------------------------------

@admin_bp.route("/")
@admin_required
def index():
    stats = {
        "corsi": Corso.query.count(),
        "corsi_pubblicati": Corso.query.filter_by(pubblicato=True).count(),
        "prenotazioni": Prenotazione.query.count(),
        "prenotazioni_confermate": Prenotazione.query.filter_by(stato=StatoPrenotazione.CONFERMATA).count(),
        "utenti": Utente.query.count(),
        "leads": LeadMarketing.query.filter_by(attivo=True, verificato=True).count(),
    }
    ultime_prenotazioni = (
        Prenotazione.query
        .order_by(Prenotazione.created_at.desc())
        .limit(10)
        .all()
    )
    return render_template("admin/index.html", stats=stats, ultime_prenotazioni=ultime_prenotazioni)


# ===========================================================================
# CORSI
# ===========================================================================

@admin_bp.route("/corsi")
@admin_required
def corsi():
    corsi = Corso.query.order_by(Corso.created_at.desc()).all()
    return render_template("admin/corsi/lista.html", corsi=corsi)


@admin_bp.route("/corsi/nuovo", methods=["GET", "POST"])
@admin_required
def corso_nuovo():
    if request.method == "POST":
        corso = _corso_da_form(Corso())
        db.session.add(corso)
        db.session.commit()
        logger.info("Admin %s: corso creato %s", current_user.email, corso.id)
        flash("Corso creato.", "success")
        return redirect(url_for("admin.corso_modifica", corso_id=corso.id))
    return render_template("admin/corsi/form.html", corso=None, newsletter_tags=_get_newsletter_tags())


@admin_bp.route("/corsi/<string:corso_id>", methods=["GET", "POST"])
@admin_required
def corso_modifica(corso_id):
    corso = Corso.query.get_or_404(corso_id)
    if request.method == "POST":
        action = request.form.get("_action", "save")
        if action == "delete":
            logger.info("Admin %s: corso eliminato %s", current_user.email, corso.id)
            db.session.delete(corso)
            db.session.commit()
            flash("Corso eliminato.", "success")
            return redirect(url_for("admin.corsi"))
        _corso_da_form(corso)
        db.session.commit()
        logger.info("Admin %s: corso aggiornato %s", current_user.email, corso.id)
        flash("Corso aggiornato.", "success")
        return redirect(url_for("admin.corso_modifica", corso_id=corso.id))
    return render_template("admin/corsi/form.html", corso=corso, newsletter_tags=_get_newsletter_tags())


def _corso_da_form(corso: Corso) -> Corso:
    corso.titolo = request.form.get("titolo", "").strip()[:200]
    corso.descrizione = sanitize_html(request.form.get("descrizione", ""))
    corso.luogo = request.form.get("luogo", "").strip()[:200]
    corso.orario = request.form.get("orario", "").strip()[:100]
    corso.durata = request.form.get("durata", "").strip()[:100]
    corso.coordinate_bancarie = request.form.get("coordinate_bancarie", "").strip()[:500]
    try:
        corso.costo = max(0.0, float(request.form.get("costo", "0").replace(",", ".")))
    except ValueError:
        corso.costo = 0.0
    try:
        corso.posti_totali = max(0, int(request.form.get("posti_totali", 0) or 0))
    except ValueError:
        corso.posti_totali = 0
    try:
        corso.timeout_pagamento_ore = max(1, int(request.form.get("timeout_pagamento_ore", 24) or 24))
    except ValueError:
        corso.timeout_pagamento_ore = 24
    corso.pubblicato = request.form.get("pubblicato") == "on"
    corso.attestato_abilitato = request.form.get("attestato_abilitato") == "on"
    corso.attestato_html_template = request.form.get("attestato_html_template", "").strip() or None
    corso.tags = request.form.getlist("tags")[:20]

    for field, fmt in [("data_inizio", "%Y-%m-%dT%H:%M"), ("data_fine", "%Y-%m-%dT%H:%M")]:
        val = request.form.get(field, "")
        if val:
            try:
                setattr(corso, field, datetime.strptime(val, fmt).replace(tzinfo=timezone.utc))
            except ValueError:
                pass
        else:
            setattr(corso, field, None)
    return corso


@admin_bp.route("/corsi/<string:corso_id>/immagine", methods=["POST"])
@admin_required
def corso_upload_immagine(corso_id):
    corso = Corso.query.get_or_404(corso_id)
    file = request.files.get("immagine")
    if not file or not allowed_file(file.filename, {"jpg", "jpeg", "png", "webp"}):
        flash("Formato non valido.", "error")
        return redirect(url_for("admin.corso_modifica", corso_id=corso_id))
    file.seek(0, 2)
    if file.tell() > 10 * 1024 * 1024:
        flash("File troppo grande (max 10 MB).", "error")
        return redirect(url_for("admin.corso_modifica", corso_id=corso_id))
    file.seek(0)
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"corso_{corso_id}_{uuid.uuid4().hex[:8]}.{ext}"
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "corsi")
    os.makedirs(upload_dir, exist_ok=True)
    dest_path = os.path.join(upload_dir, filename)
    file.save(dest_path)
    os.chmod(dest_path, 0o644)
    corso.immagine_url = f"/static/uploads/corsi/{filename}"
    db.session.commit()
    flash("Immagine caricata.", "success")
    return redirect(url_for("admin.corso_modifica", corso_id=corso_id))


@admin_bp.route("/corsi/<string:corso_id>/duplica", methods=["POST"])
@admin_required
def corso_duplica(corso_id):
    corso = Corso.query.get_or_404(corso_id)
    nuovo = Corso(
        titolo=f"Copia di {corso.titolo}"[:200],
        descrizione=corso.descrizione,
        luogo=corso.luogo,
        orario=corso.orario,
        durata=corso.durata,
        costo=corso.costo,
        posti_totali=corso.posti_totali,
        timeout_pagamento_ore=corso.timeout_pagamento_ore,
        coordinate_bancarie=corso.coordinate_bancarie,
        tags=list(corso.tags or []),
        pubblicato=False,
    )
    db.session.add(nuovo)
    db.session.commit()
    logger.info("Admin %s: corso duplicato %s -> %s", current_user.email, corso_id, nuovo.id)
    flash("Corso duplicato.", "success")
    return redirect(url_for("admin.corso_modifica", corso_id=nuovo.id))


@admin_bp.route("/corsi/<string:corso_id>/partecipanti")
@admin_required
def corso_partecipanti(corso_id):
    corso = Corso.query.get_or_404(corso_id)
    prenotazioni = corso.prenotazioni.filter(
        Prenotazione.stato.in_([StatoPrenotazione.CONFERMATA, StatoPrenotazione.PAGAMENTO_CARICATO])
    ).all()
    n_partecipanti = sum(len(p.partecipanti) for p in prenotazioni)
    return render_template("admin/corsi/partecipanti.html", corso=corso,
                           prenotazioni=prenotazioni, n_partecipanti=n_partecipanti)


@admin_bp.route("/corsi/<string:corso_id>/partecipanti/aggiungi", methods=["POST"])
@admin_required
def corso_aggiungi_partecipante(corso_id):
    from ..utils import validate_email_address
    corso = Corso.query.get_or_404(corso_id)
    tipo = request.form.get("tipo", "esistente")

    if tipo == "esistente":
        utente_id = request.form.get("utente_id", "").strip()
        utente = Utente.query.get(utente_id)
        if not utente:
            flash("Utente non trovato.", "error")
            return redirect(url_for("admin.corso_partecipanti", corso_id=corso_id))
    else:
        nome = (request.form.get("nome") or "").strip()[:100]
        cognome = (request.form.get("cognome") or "").strip()[:100]
        raw_email = (request.form.get("email") or "").strip()
        telefono = (request.form.get("telefono") or "").strip()[:30]
        email = validate_email_address(raw_email)
        if not nome or not cognome or not email:
            flash("Nome, cognome ed email sono obbligatori.", "error")
            return redirect(url_for("admin.corso_partecipanti", corso_id=corso_id))
        utente = Utente.query.filter_by(email=email).first()
        if not utente:
            import secrets as _sec
            utente = Utente(
                nome=nome, cognome=cognome, email=email,
                telefono=telefono or None,
                ruolo="UTENTE",
                consenso_privacy=True,
                data_consenso=datetime.now(timezone.utc),
            )
            utente.set_password(_sec.token_urlsafe(16))
            db.session.add(utente)
            db.session.flush()
            logger.info("Admin %s: nuovo utente creato manualmente %s", current_user.email, email)

    # Cerca prenotazione esistente per questo utente+corso
    pren = Prenotazione.query.filter_by(utente_id=utente.id, corso_id=corso.id).first()
    if not pren:
        pren = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.CONFERMATA,
            metodo_pagamento=MetodoPagamento.BONIFICO,
            note_segreteria="Aggiunta manuale da admin",
        )
        db.session.add(pren)
        db.session.flush()

    # Aggiunge partecipante se non già presente
    esistente = any(
        p.nome == utente.nome and p.cognome == utente.cognome
        for p in pren.partecipanti
    )
    if not esistente:
        part = Partecipante(
            prenotazione_id=pren.id,
            nome=utente.nome,
            cognome=utente.cognome,
            email=utente.email,
            telefono=utente.telefono,
            codice_fiscale=utente.codice_fiscale,
        )
        db.session.add(part)

    pren.stato = StatoPrenotazione.CONFERMATA
    db.session.commit()
    logger.info("Admin %s: aggiunto partecipante %s al corso %s", current_user.email, utente.email, corso_id)
    flash(f"{utente.nome_completo} aggiunto al corso.", "success")
    return redirect(url_for("admin.corso_partecipanti", corso_id=corso_id))


@admin_bp.route("/utenti/cerca")
@admin_required
def utenti_cerca():
    from flask import jsonify
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify([])
    like = f"%{q}%"
    utenti = Utente.query.filter(
        db.or_(
            Utente.email.ilike(like),
            Utente.nome.ilike(like),
            Utente.cognome.ilike(like),
            func.concat(Utente.nome, ' ', Utente.cognome).ilike(like),
        )
    ).order_by(Utente.cognome).limit(20).all()
    result = []
    for u in utenti:
        parts = u.nome_completo.split()
        iniziali = (parts[0][0] + parts[-1][0]).upper() if len(parts) > 1 else u.nome[:2].upper()
        result.append({"id": u.id, "nome_completo": u.nome_completo, "email": u.email, "iniziali": iniziali})
    return jsonify(result)


# ===========================================================================
# PRENOTAZIONI
# ===========================================================================

@admin_bp.route("/prenotazioni")
@admin_required
def prenotazioni():
    stato = request.args.get("stato")
    q = Prenotazione.query.order_by(Prenotazione.created_at.desc())
    if stato:
        try:
            q = q.filter_by(stato=StatoPrenotazione(stato))
        except ValueError:
            pass
    prenotazioni = q.all()
    return render_template("admin/prenotazioni/lista.html", prenotazioni=prenotazioni, stato_filtro=stato)


@admin_bp.route("/prenotazioni/<string:prenotazione_id>", methods=["GET", "POST"])
@admin_required
def prenotazione_dettaglio(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if request.method == "POST":
        p.note_segreteria = request.form.get("note_segreteria", "").strip()[:2000]
        db.session.commit()
        flash("Note aggiornate.", "success")
    return render_template("admin/prenotazioni/dettaglio.html", prenotazione=p)


@admin_bp.route("/prenotazioni/<string:prenotazione_id>/conferma", methods=["POST"])
@admin_required
def prenotazione_conferma(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    p.stato = StatoPrenotazione.CONFERMATA
    db.session.commit()
    logger.info("Admin %s: prenotazione confermata %s", current_user.email, p.id)
    try:
        invia_email_conferma_prenotazione(p)
    except Exception:
        pass
    flash("Prenotazione confermata.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


@admin_bp.route("/prenotazioni/<string:prenotazione_id>/annulla", methods=["POST"])
@admin_required
def prenotazione_annulla(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.stato not in (StatoPrenotazione.ANNULLATA, StatoPrenotazione.SCADUTA):
        p.corso.posti_occupati = max(0, (p.corso.posti_occupati or 0) - (p.numero_posti or 1))
    p.stato = StatoPrenotazione.ANNULLATA
    db.session.commit()
    logger.info("Admin %s: prenotazione annullata %s", current_user.email, p.id)
    flash("Prenotazione annullata.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


@admin_bp.route("/prenotazioni/<string:prenotazione_id>/attestato", methods=["POST"])
@admin_required
def emetti_attestato(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.stato != StatoPrenotazione.CONFERMATA:
        flash("La prenotazione deve essere confermata per emettere l'attestato.", "error")
        return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))

    html_content = _genera_attestato_html(p)
    filename = f"attestato_{p.id}.html"
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "attestati")
    os.makedirs(upload_dir, exist_ok=True)
    with open(os.path.join(upload_dir, filename), "w", encoding="utf-8") as f:
        f.write(html_content)

    p.attestato_url = f"/static/uploads/attestati/{filename}"
    p.attestato_emesso = True
    p.attestato_emesso_at = datetime.now(timezone.utc)
    db.session.commit()
    logger.info("Admin %s: attestato emesso per prenotazione %s", current_user.email, p.id)

    try:
        invia_email_attestato(p)
    except Exception:
        pass

    flash("Attestato emesso e inviato.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


@admin_bp.route("/prenotazioni/<string:prenotazione_id>/attestato/pdf", methods=["POST"])
@admin_required
def upload_attestato_pdf(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.stato != StatoPrenotazione.CONFERMATA:
        flash("La prenotazione deve essere confermata.", "error")
        return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))

    file = request.files.get("attestato_pdf")
    if not file or not file.filename:
        flash("Nessun file selezionato.", "error")
        return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))
    if not file.filename.lower().endswith(".pdf"):
        flash("Sono accettati solo file PDF.", "error")
        return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))
    file.seek(0, 2)
    if file.tell() > 20 * 1024 * 1024:
        flash("File troppo grande (max 20 MB).", "error")
        return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))
    file.seek(0)

    filename = f"attestato_{p.id}.pdf"
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "attestati")
    os.makedirs(upload_dir, exist_ok=True)
    dest_path = os.path.join(upload_dir, filename)
    file.save(dest_path)
    os.chmod(dest_path, 0o644)

    p.attestato_url = f"/static/uploads/attestati/{filename}"
    p.attestato_emesso = True
    p.attestato_emesso_at = datetime.now(timezone.utc)
    db.session.commit()
    logger.info("Admin %s: attestato PDF caricato per prenotazione %s", current_user.email, p.id)

    try:
        invia_email_attestato(p)
    except Exception:
        pass

    flash("Attestato PDF caricato e inviato all'utente.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


def _applica_variabili_template(template: str, variables: dict) -> str:
    """Safe {varname} substitution without Python format spec interpretation."""
    return re.sub(r'\{(\w+)\}', lambda m: variables.get(m.group(1), m.group(0)), template)


def _genera_attestato_html(prenotazione: Prenotazione) -> str:
    u = prenotazione.utente
    c = prenotazione.corso
    app_name_val = Impostazione.get("app_name") or "Gestione Corsi"
    data_str = c.data_inizio.strftime("%d/%m/%Y") if c.data_inizio else ""

    variables = {
        "nome": str(escape(u.nome or "")),
        "cognome": str(escape(u.cognome or "")),
        "nome_completo": str(escape(f"{u.nome or ''} {u.cognome or ''}".strip())),
        "titolo_corso": str(escape(c.titolo or "")),
        "data": data_str,
        "luogo": str(escape(c.luogo or "")),
        "app_name": str(escape(app_name_val)),
    }

    if c.attestato_html_template:
        return _applica_variabili_template(c.attestato_html_template, variables)

    # Default generic template (used when no per-corso template is set)
    nome = variables["nome"]
    cognome = variables["cognome"]
    titolo = variables["titolo_corso"]
    luogo = variables["luogo"]
    app_name = variables["app_name"]
    return f"""<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<style>
  body{{font-family:Georgia,serif;text-align:center;padding:60px;color:#1a1a1a}}
  h1{{font-size:36px;color:#1d4ed8;margin-bottom:8px}}
  .subtitle{{font-size:20px;color:#6b7280;margin-bottom:48px}}
  .nome{{font-size:32px;font-weight:bold;border-bottom:2px solid #1d4ed8;display:inline-block;padding:0 32px 8px}}
  .corso{{font-size:22px;margin-top:32px;color:#374151}}
  .data{{margin-top:48px;color:#6b7280}}
  .firma{{margin-top:80px;font-style:italic}}
</style></head>
<body>
<h1>ATTESTATO DI PARTECIPAZIONE</h1>
<p class="subtitle">Si certifica che</p>
<p class="nome">{nome} {cognome}</p>
<p class="corso">ha partecipato al corso<br><strong>{titolo}</strong></p>
<p class="data">Tenuto in data {data_str} — {luogo}</p>
<p class="firma">{app_name}</p>
</body></html>"""


# ===========================================================================
# UTENTI
# ===========================================================================

@admin_bp.route("/utenti")
@admin_required
def utenti():
    utenti = Utente.query.order_by(Utente.created_at.desc()).all()
    return render_template("admin/utenti/lista.html", utenti=utenti)


@admin_bp.route("/utenti/nuovo", methods=["POST"])
@admin_required
def utente_nuovo():
    raw_email = request.form.get("email", "").strip()
    email = validate_email_address(raw_email)
    if not email:
        flash("Indirizzo email non valido.", "error")
        return redirect(url_for("admin.utenti"))
    nome = request.form.get("nome", "").strip()[:100]
    cognome = request.form.get("cognome", "").strip()[:100]
    password = request.form.get("password", "")
    if len(password) < 8:
        flash("La password deve avere almeno 8 caratteri.", "error")
        return redirect(url_for("admin.utenti"))
    ruolo_str = request.form.get("ruolo", "UTENTE")
    try:
        ruolo = Ruolo(ruolo_str)
    except ValueError:
        ruolo = Ruolo.UTENTE
    if current_user.ruolo == Ruolo.SEGRETERIA:
        ruolo = Ruolo.UTENTE

    if Utente.query.filter_by(email=email).first():
        flash("Email già registrata.", "error")
        return redirect(url_for("admin.utenti"))

    u = Utente(nome=nome, cognome=cognome, email=email, ruolo=ruolo)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    logger.info("Admin %s: utente creato %s (ruolo: %s)", current_user.email, email, ruolo.value)

    try:
        invia_email_benvenuto(u)
    except Exception:
        pass

    flash("Utente creato.", "success")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/utenti/<string:utente_id>/modifica", methods=["POST"])
@admin_required
def utente_modifica(utente_id):
    u = Utente.query.get_or_404(utente_id)
    if current_user.ruolo == Ruolo.SEGRETERIA and u.ruolo == Ruolo.ADMIN:
        flash("Non puoi modificare un amministratore.", "error")
        return redirect(url_for("admin.utenti"))
    raw_email = (request.form.get("email") or "").strip()
    email = validate_email_address(raw_email)
    if not email:
        flash("Indirizzo email non valido.", "error")
        return redirect(url_for("admin.utenti"))
    nome = (request.form.get("nome") or "").strip()[:100]
    cognome = (request.form.get("cognome") or "").strip()[:100]
    telefono = (request.form.get("telefono") or "").strip()[:30] or None
    cf = (request.form.get("codice_fiscale") or "").strip()[:20] or None
    password = request.form.get("password") or ""

    # Email uniqueness check (exclude self)
    existing = Utente.query.filter_by(email=email).first()
    if existing and existing.id != utente_id:
        flash("Email già utilizzata da un altro utente.", "error")
        return redirect(url_for("admin.utenti"))

    u.nome = nome
    u.cognome = cognome
    u.email = email
    u.telefono = telefono
    u.codice_fiscale = cf

    # Ruolo solo se non è se stesso (protezione)
    if utente_id != current_user.id:
        ruolo_str = request.form.get("ruolo", "UTENTE")
        try:
            nuovo_ruolo = Ruolo(ruolo_str)
            if current_user.ruolo == Ruolo.SEGRETERIA and nuovo_ruolo != Ruolo.UTENTE:
                nuovo_ruolo = Ruolo.UTENTE
            u.ruolo = nuovo_ruolo
        except ValueError:
            pass

    if password:
        if len(password) < 8:
            flash("La password deve avere almeno 8 caratteri.", "error")
            return redirect(url_for("admin.utenti"))
        u.set_password(password)

    db.session.commit()
    logger.info("Admin %s: utente %s modificato", current_user.email, u.email)
    flash(f"Dati di {u.nome_completo} aggiornati.", "success")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/utenti/<string:utente_id>/ruolo", methods=["POST"])
@admin_required
def utente_modifica_ruolo(utente_id):
    if utente_id == current_user.id:
        flash("Non puoi modificare il tuo ruolo.", "error")
        return redirect(url_for("admin.utenti"))
    u = Utente.query.get_or_404(utente_id)
    ruolo_str = request.form.get("ruolo", "UTENTE")
    try:
        nuovo_ruolo = Ruolo(ruolo_str)
    except ValueError:
        flash("Ruolo non valido.", "error")
        return redirect(url_for("admin.utenti"))
    logger.info("Admin %s: ruolo di %s cambiato %s → %s", current_user.email, u.email, u.ruolo.value, nuovo_ruolo.value)
    u.ruolo = nuovo_ruolo
    db.session.commit()
    flash(f"Ruolo di {u.nome_completo} aggiornato a {nuovo_ruolo.value}.", "success")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/utenti/<string:utente_id>/elimina", methods=["POST"])
@admin_required
def utente_elimina(utente_id):
    if current_user.ruolo == Ruolo.SEGRETERIA:
        flash("Non hai i permessi per eliminare utenti.", "error")
        return redirect(url_for("admin.utenti"))
    if utente_id == current_user.id:
        flash("Non puoi eliminare te stesso.", "error")
        return redirect(url_for("admin.utenti"))
    u = Utente.query.get_or_404(utente_id)
    if u.prenotazioni.count() > 0:
        flash("Impossibile eliminare: l'utente ha prenotazioni associate. Usa Disattiva o Anonimizza.", "error")
        return redirect(url_for("admin.utenti"))
    try:
        logger.info("Admin %s: utente eliminato %s", current_user.email, u.email)
        db.session.delete(u)
        db.session.commit()
        flash("Utente eliminato.", "success")
    except Exception as exc:
        db.session.rollback()
        logger.error("Errore eliminazione utente %s: %s", utente_id, exc)
        flash(f"Impossibile eliminare l'utente: {exc}", "error")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/utenti/<string:utente_id>/disattiva", methods=["POST"])
@admin_required
def utente_disattiva(utente_id):
    if current_user.ruolo == Ruolo.SEGRETERIA:
        flash("Non hai i permessi per disattivare utenti.", "error")
        return redirect(url_for("admin.utenti"))
    if utente_id == current_user.id:
        flash("Non puoi disattivare te stesso.", "error")
        return redirect(url_for("admin.utenti"))
    u = Utente.query.get_or_404(utente_id)
    u.attivo = not u.attivo
    db.session.commit()
    stato = "riattivato" if u.attivo else "disattivato"
    logger.info("Admin %s: utente %s %s", current_user.email, u.email, stato)
    flash(f"Utente {u.nome_completo} {stato}.", "success")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/utenti/<string:utente_id>/anonimizza", methods=["POST"])
@admin_required
def utente_anonimizza(utente_id):
    if current_user.ruolo == Ruolo.SEGRETERIA:
        flash("Non hai i permessi per anonimizzare utenti.", "error")
        return redirect(url_for("admin.utenti"))
    if utente_id == current_user.id:
        flash("Non puoi anonimizzare te stesso.", "error")
        return redirect(url_for("admin.utenti"))
    u = Utente.query.get_or_404(utente_id)
    anon_id = utente_id[:8]
    u.nome = "Utente"
    u.cognome = f"Anonimo-{anon_id}"
    u.email = f"anonimo-{anon_id}@eliminato.invalid"
    u.telefono = None
    u.codice_fiscale = None
    u.password_hash = None
    u.token_reset = None
    u.consenso_privacy = False
    u.consenso_marketing = False
    u.attivo = False
    db.session.commit()
    logger.info("Admin %s: utente anonimizzato %s", current_user.email, utente_id)
    flash("Dati personali anonimizzati. Le prenotazioni storiche sono conservate.", "success")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/iscrivi-utente", methods=["POST"])
@admin_required
def iscrivi_utente():
    corso_id = request.form.get("corso_id")
    utente_id = request.form.get("utente_id")
    try:
        numero_posti = max(1, min(100, int(request.form.get("numero_posti", 1))))
    except (ValueError, TypeError):
        numero_posti = 1

    corso = Corso.query.get_or_404(corso_id)
    utente = Utente.query.get_or_404(utente_id)

    p = Prenotazione(
        utente_id=utente.id,
        corso_id=corso.id,
        numero_posti=numero_posti,
        stato=StatoPrenotazione.CONFERMATA,
        scadenza_pagamento=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.session.add(p)
    corso.posti_occupati = (corso.posti_occupati or 0) + numero_posti
    db.session.commit()
    logger.info("Admin %s: utente %s iscritto al corso %s", current_user.email, utente.email, corso.id)
    flash(f"{utente.nome_completo} iscritto a {corso.titolo}.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


# ===========================================================================
# MARKETING LEADS
# ===========================================================================

def _get_newsletter_tags() -> list:
    """Return centralized newsletter tags as list of {slug, label} dicts."""
    import json
    raw = Impostazione.get("newsletter_tags")
    if raw:
        try:
            tags = json.loads(raw)
            if isinstance(tags, list):
                result = []
                for t in tags:
                    if isinstance(t, dict) and t.get("slug"):
                        result.append({"slug": t["slug"].strip(), "label": t.get("label", t["slug"]).strip()})
                    elif isinstance(t, str) and t.strip():
                        # legacy: plain string
                        result.append({"slug": t.strip(), "label": t.strip()})
                return sorted(result, key=lambda x: x["label"])
        except Exception:
            pass
    return []


@admin_bp.route("/marketing")
@admin_required
def marketing():
    leads = LeadMarketing.query.order_by(LeadMarketing.created_at.desc()).all()
    corsi_pubblicati = Corso.query.filter_by(pubblicato=True).order_by(Corso.data_inizio.desc()).all()
    all_tags = sorted({t for lead in leads for t in (lead.tags or [])})
    newsletter_tags = _get_newsletter_tags()
    utenti_marketing = Utente.query.filter_by(consenso_marketing=True).order_by(Utente.data_consenso.desc()).all()
    # Count already-notified per corso
    from sqlalchemy import func as sqlfunc
    notificati_per_corso = {
        row.corso_id: row.cnt
        for row in db.session.query(InvioMarketing.corso_id, sqlfunc.count().label("cnt"))
                              .group_by(InvioMarketing.corso_id).all()
    }
    return render_template("admin/marketing/lista.html", leads=leads, corsi_pubblicati=corsi_pubblicati,
                           all_tags=all_tags, newsletter_tags=newsletter_tags, utenti_marketing=utenti_marketing,
                           notificati_per_corso=notificati_per_corso)


@admin_bp.route("/marketing/leads/<string:lead_id>/elimina", methods=["POST"])
@admin_required
def lead_elimina(lead_id):
    lead = LeadMarketing.query.get_or_404(lead_id)
    logger.info("Admin %s: lead eliminato %s", current_user.email, lead.email)
    db.session.delete(lead)
    db.session.commit()
    flash("Lead eliminato.", "success")
    return redirect(url_for("admin.marketing"))


@admin_bp.route("/marketing/notifica", methods=["POST"])
@admin_required
def marketing_notifica():
    from ..utils import generate_unsubscribe_token
    import threading
    corso_id = request.form.get("corso_id")
    modalita = request.form.get("modalita", "individuale")  # individuale | bcc
    corso = Corso.query.get_or_404(corso_id)
    secret = current_app.config.get("SECRET_KEY", "")
    corso_tags = set(corso.tags or [])

    # Email già notificate per questo corso
    gia_inviati = {r.email for r in InvioMarketing.query.filter_by(corso_id=corso_id).all()}

    class _FakeLead:
        def __init__(self, utente):
            self.email = utente.email
            self.nome = utente.nome
            self.tags = utente.tags_marketing or []

    # Costruisce lista destinatari (unici, non ancora notificati)
    destinatari = []
    emailed = set()
    all_leads = LeadMarketing.query.filter_by(attivo=True, verificato=True).all()
    leads = [l for l in all_leads if not corso_tags or not l.tags or set(l.tags) & corso_tags]
    for lead in leads:
        if lead.email in gia_inviati:
            continue
        destinatari.append(lead)
        emailed.add(lead.email)
    for u in Utente.query.filter_by(consenso_marketing=True).all():
        if u.email in emailed or u.email in gia_inviati:
            continue
        u_tags = set(u.tags_marketing or [])
        if corso_tags and u_tags and not (u_tags & corso_tags):
            continue
        destinatari.append(_FakeLead(u))
        emailed.add(u.email)

    saltati = len(gia_inviati & (emailed | gia_inviati))

    if not destinatari:
        flash(f"Nessun nuovo destinatario: tutti ({len(gia_inviati)}) hanno già ricevuto questa notifica.", "warning")
        return redirect(url_for("admin.marketing"))

    app = current_app._get_current_object()
    corso_id_str = corso.id
    emails_da_registrare = [d.email for d in destinatari]

    def _send_all():
        with app.app_context():
            c = Corso.query.get(corso_id_str)
            if not c:
                return
            sent = 0
            if modalita == "bcc":
                from ..email_service import send_email_bcc, _build_marketing_html_bcc
                html = _build_marketing_html_bcc(c)
                bcc_list = [d.email for d in destinatari]
                sent = send_email_bcc(bcc_list, f"Nuovo corso: {c.titolo}", html)
            else:
                messages = []
                for dest in destinatari:
                    try:
                        token = generate_unsubscribe_token(dest.email, secret)
                        messages.append(_build_marketing_html(dest, c, token))
                    except Exception as e:
                        logger.warning("Errore build marketing per %s: %s", dest.email, e)
                sent = send_email_bulk(messages)

            # Registra invii riusciti
            if sent > 0:
                for email in emails_da_registrare[:sent]:
                    try:
                        db.session.add(InvioMarketing(corso_id=corso_id_str, email=email))
                    except Exception:
                        pass
                try:
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            logger.info("Marketing corso %s (%s): inviate %d/%d email, %d già notificati",
                        corso_id_str, modalita, sent, len(destinatari), len(gia_inviati))

    t = threading.Thread(target=_send_all, daemon=True)
    t.start()

    msg_saltati = f", {len(gia_inviati)} già notificati saltati" if gia_inviati else ""
    flash(f"Invio avviato a {len(destinatari)} nuovi destinatari{msg_saltati}.", "success")
    return redirect(url_for("admin.marketing"))


@admin_bp.route("/marketing/tags", methods=["POST"])
@superadmin_required
def marketing_tags():
    import json
    raw_tags = request.form.get("newsletter_tags", "")
    tags = []
    seen_slugs = set()
    for line in raw_tags.splitlines():
        line = line.strip()
        if not line:
            continue
        if "|" in line:
            label, slug = line.split("|", 1)
            label, slug = label.strip(), slug.strip().lower()
        else:
            label = line
            slug = line.lower()
        if slug and slug not in seen_slugs:
            tags.append({"slug": slug, "label": label})
            seen_slugs.add(slug)
    tags.sort(key=lambda x: x["label"])
    Impostazione.set("newsletter_tags", json.dumps(tags, ensure_ascii=False), gruppo="marketing")
    db.session.commit()
    logger.info("Admin %s: tag newsletter aggiornati: %s", current_user.email, tags)
    flash("Tag aggiornati.", "success")
    return redirect(url_for("admin.marketing"))


@admin_bp.route("/marketing/importa", methods=["POST"])
@admin_required
def marketing_importa():
    file = request.files.get("csv")
    if not file:
        flash("Nessun file.", "error")
        return redirect(url_for("admin.marketing"))
    file.seek(0, 2)
    if file.tell() > 5 * 1024 * 1024:
        flash("File CSV troppo grande (max 5 MB).", "error")
        return redirect(url_for("admin.marketing"))
    file.seek(0)
    stream = io.StringIO(file.stream.read().decode("utf-8", errors="ignore"))
    reader = csv.DictReader(stream)
    added = 0
    for row in reader:
        raw_email = (row.get("email") or row.get("Email") or "").strip()
        email = validate_email_address(raw_email)
        if not email:
            continue
        if not LeadMarketing.query.filter_by(email=email).first():
            raw_tags = (row.get("tags") or row.get("Tags") or "").strip()
            tags = [t.strip() for t in raw_tags.split("|") if t.strip()] if raw_tags else []
            lead = LeadMarketing(
                email=email,
                nome=(row.get("nome") or row.get("Nome") or "").strip()[:100],
                cognome=(row.get("cognome") or row.get("Cognome") or "").strip()[:100],
                tags=tags,
                verificato=True,
                attivo=True,
            )
            db.session.add(lead)
            added += 1
    db.session.commit()
    logger.info("Admin %s: importati %d lead da CSV", current_user.email, added)
    flash(f"Importati {added} lead.", "success")
    return redirect(url_for("admin.marketing"))


# ===========================================================================
# GDPR — RETENTION AUTOMATICA
# ===========================================================================

@admin_bp.route("/gdpr/retention", methods=["GET", "POST"])
@superadmin_required
def gdpr_retention():
    from ..models import LeadMarketing, Prenotazione, StatoPrenotazione
    from datetime import datetime, timezone, timedelta
    stats = {}
    if request.method == "POST":
        action = request.form.get("action")
        now = datetime.now(timezone.utc)

        if action == "purga_lead_non_verificati":
            # Lead non verificati con token scaduto da più di 7 giorni
            cutoff = now - timedelta(days=7)
            to_delete = LeadMarketing.query.filter(
                LeadMarketing.verificato == False,
                LeadMarketing.token_scadenza != None,
                LeadMarketing.token_scadenza < cutoff,
            ).all()
            count = len(to_delete)
            for l in to_delete:
                db.session.delete(l)
            db.session.commit()
            logger.info("Admin %s: eliminati %d lead non verificati scaduti", current_user.email, count)
            flash(f"Eliminati {count} lead non verificati con token scaduto.", "success")

        elif action == "purga_lead_inattivi":
            # Lead verificati che non interagiscono da 2 anni
            cutoff = now - timedelta(days=730)
            to_delete = LeadMarketing.query.filter(
                LeadMarketing.verificato == True,
                LeadMarketing.updated_at < cutoff,
            ).all()
            count = len(to_delete)
            for l in to_delete:
                db.session.delete(l)
            db.session.commit()
            logger.info("Admin %s: eliminati %d lead inattivi (>2 anni)", current_user.email, count)
            flash(f"Eliminati {count} lead inattivi (nessuna attività da 2 anni).", "success")

        elif action == "purga_prenotazioni_scadute":
            # Prenotazioni scadute/annullate con scadenza > 90 giorni fa
            cutoff = now - timedelta(days=90)
            to_delete = Prenotazione.query.filter(
                Prenotazione.stato.in_([StatoPrenotazione.SCADUTA, StatoPrenotazione.ANNULLATA]),
                Prenotazione.updated_at < cutoff,
            ).all()
            count = len(to_delete)
            for p in to_delete:
                db.session.delete(p)
            db.session.commit()
            logger.info("Admin %s: eliminate %d prenotazioni scadute/annullate", current_user.email, count)
            flash(f"Eliminate {count} prenotazioni scadute/annullate (>90 giorni).", "success")

        return redirect(url_for("admin.gdpr_retention"))

    # Statistiche
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    stats["lead_non_verificati_scaduti"] = LeadMarketing.query.filter(
        LeadMarketing.verificato == False,
        LeadMarketing.token_scadenza != None,
        LeadMarketing.token_scadenza < now - timedelta(days=7),
    ).count()
    stats["lead_inattivi_2anni"] = LeadMarketing.query.filter(
        LeadMarketing.verificato == True,
        LeadMarketing.updated_at < now - timedelta(days=730),
    ).count()
    stats["prenotazioni_scadute_90gg"] = Prenotazione.query.filter(
        Prenotazione.stato.in_([StatoPrenotazione.SCADUTA, StatoPrenotazione.ANNULLATA]),
        Prenotazione.updated_at < now - timedelta(days=90),
    ).count()
    return render_template("admin/gdpr_retention.html", stats=stats)


# ===========================================================================
# GDPR — DATA BREACH
# ===========================================================================

@admin_bp.route("/gdpr/breach", methods=["GET", "POST"])
@superadmin_required
def gdpr_breach():
    from ..email_service import invia_email_notifica_segreteria
    if request.method == "POST":
        descrizione = (request.form.get("descrizione") or "").strip()[:2000]
        data_scoperta = (request.form.get("data_scoperta") or "").strip()
        dati_coinvolti = (request.form.get("dati_coinvolti") or "").strip()[:500]
        stima_persone = (request.form.get("stima_persone") or "").strip()[:100]
        misure = (request.form.get("misure") or "").strip()[:1000]
        if not descrizione:
            flash("La descrizione è obbligatoria.", "error")
            return render_template("admin/gdpr_breach.html")
        logger.warning(
            "DATA BREACH REGISTRATO da %s — Scoperta: %s — Dati: %s — Persone: %s — Misure: %s — Descrizione: %s",
            current_user.email, data_scoperta, dati_coinvolti, stima_persone, misure, descrizione
        )
        try:
            corpo = (
                f"<h2>⚠️ Violazione dei dati personali registrata</h2>"
                f"<p><strong>Data scoperta:</strong> {data_scoperta}</p>"
                f"<p><strong>Dati coinvolti:</strong> {dati_coinvolti}</p>"
                f"<p><strong>Stima persone interessate:</strong> {stima_persone}</p>"
                f"<p><strong>Misure adottate:</strong> {misure}</p>"
                f"<p><strong>Descrizione:</strong><br>{descrizione}</p>"
                f"<hr><p style='color:#b91c1c'><strong>ATTENZIONE:</strong> In caso di violazione grave, "
                f"il titolare deve notificare il Garante entro 72 ore dalla scoperta "
                f"(Art. 33 GDPR) tramite <a href='https://www.garanteprivacy.it'>garanteprivacy.it</a>.</p>"
            )
            invia_email_notifica_segreteria("⚠️ Violazione dati personali (Data Breach)", corpo)
        except Exception as exc:
            logger.error("Errore invio notifica breach: %s", exc)
        flash("Violazione registrata e notifica inviata alla segreteria. Valuta se notificare il Garante entro 72 ore.", "warning")
        return redirect(url_for("admin.gdpr_breach"))
    return render_template("admin/gdpr_breach.html")


# ===========================================================================
# IMPOSTAZIONI
# ===========================================================================

_SENSITIVE_KEYS = {"smtp_password", "stripe_secret_key", "paypal_client_secret", "whatsapp_token", "telegram_bot_token", "turnstile_secret_key"}
_MASK = "••••••••"

_TAB_KEYS = {
    "generale":  ["app_name", "app_url", "email_segreteria", "navbar_hide_name"],
    "azienda":   ["ragione_sociale", "partita_iva", "indirizzo_sede", "privacy_email"],
    "aspetto":   ["color_scheme", "hero_subtitle", "hero_btn_primary", "hero_btn_secondary"],
    "email":     ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_name"],
    "pagamenti": ["stripe_publishable_key", "stripe_secret_key",
                  "paypal_client_id", "paypal_client_secret", "paypal_mode"],
    "notifiche": ["whatsapp_phone_id", "whatsapp_token", "whatsapp_template",
                  "telegram_bot_token", "telegram_chat_id"],
    "sicurezza": ["turnstile_site_key", "turnstile_secret_key", "turnstile_enabled"],
}


@admin_bp.route("/impostazioni", methods=["GET", "POST"])
@superadmin_required
def impostazioni():
    if request.method == "POST":
        saved_tab = request.form.get("_tab", "generale")
        keys = _TAB_KEYS.get(saved_tab, _TAB_KEYS["generale"])
        _checkbox_keys = {"navbar_hide_name", "turnstile_enabled"}
        for key in keys:
            if key in _checkbox_keys:
                Impostazione.set(key, "1" if request.form.get(key) else "0")
                continue
            val = request.form.get(key, "").strip()[:2000]
            if val == _MASK:
                continue
            Impostazione.set(key, val)
        db.session.commit()
        logger.info("Admin %s: impostazioni tab=%s aggiornate", current_user.email, saved_tab)
        flash("Impostazioni salvate.", "success")
        return redirect(url_for("admin.impostazioni", tab=saved_tab))

    tab = request.args.get("tab", "generale")
    settings = {
        row.chiave: (_MASK if row.chiave in _SENSITIVE_KEYS and row.valore else row.valore)
        for row in Impostazione.query.all()
    }
    return render_template("admin/impostazioni.html", settings=settings, tab=tab)


@admin_bp.route("/impostazioni/test-email", methods=["POST"])
@superadmin_required
def test_email():
    from ..email_service import send_email, _html_wrapper, _ctx
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    dest = (request.form.get("test_email_to") or "").strip() or current_user.email
    dest = validate_email_address(dest) or current_user.email
    try:
        send_email(
            dest,
            f"Test email - {app_name}",
            _html_wrapper(
                "<h2>Email di test</h2><p>La configurazione SMTP funziona correttamente.</p>"
                f"<p style='color:#6b7280;font-size:13px;'>Inviata da: {app_name}</p>",
                app_name, app_url, logo_url, legal, color_scheme,
            ),
        )
        flash(f"Email di test inviata a {dest}.", "success")
    except Exception as e:
        flash(f"Errore invio email: {e}", "error")
    return redirect(url_for("admin.impostazioni", tab="email"))


@admin_bp.route("/impostazioni/logo", methods=["POST"])
@superadmin_required
def upload_logo():
    file = request.files.get("logo")
    if not file or not allowed_file(file.filename, {"jpg", "jpeg", "png", "svg", "webp"}):
        flash("Formato non valido.", "error")
        return redirect(url_for("admin.impostazioni"))
    file.seek(0, 2)
    if file.tell() > 5 * 1024 * 1024:
        flash("File troppo grande (max 5 MB).", "error")
        return redirect(url_for("admin.impostazioni"))
    file.seek(0)
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"logo.{ext}"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    dest_path = os.path.join(upload_dir, filename)
    file.save(dest_path)
    os.chmod(dest_path, 0o644)  # ensure nginx (www-data) can read the file
    # Store relative-to-static path so url_for resolves correctly on any deployment
    Impostazione.set("logo_url", f"uploads/{filename}")
    db.session.commit()
    flash("Logo aggiornato.", "success")
    return redirect(url_for("admin.impostazioni"))


@admin_bp.route("/impostazioni/favicon", methods=["POST"])
@superadmin_required
def upload_favicon():
    file = request.files.get("favicon")
    if not file or not allowed_file(file.filename, {"ico", "png", "svg", "jpg", "jpeg", "webp"}):
        flash("Formato non valido. Usa ICO, PNG, SVG o WebP.", "error")
        return redirect(url_for("admin.impostazioni", tab="aspetto"))
    file.seek(0, 2)
    if file.tell() > 2 * 1024 * 1024:
        flash("File troppo grande (max 2 MB).", "error")
        return redirect(url_for("admin.impostazioni", tab="aspetto"))
    file.seek(0)
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"favicon.{ext}"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    dest_path = os.path.join(upload_dir, filename)
    file.save(dest_path)
    os.chmod(dest_path, 0o644)
    Impostazione.set("favicon_url", f"uploads/{filename}")
    db.session.commit()
    flash("Favicon aggiornata.", "success")
    return redirect(url_for("admin.impostazioni", tab="aspetto"))


@admin_bp.route("/impostazioni/favicon/elimina", methods=["POST"])
@superadmin_required
def favicon_elimina():
    rel = Impostazione.get("favicon_url", "")
    if rel:
        path = os.path.join(current_app.root_path, "static", rel.lstrip("/").removeprefix("static/"))
        if os.path.exists(path):
            os.remove(path)
        Impostazione.set("favicon_url", "")
        db.session.commit()
    flash("Favicon rimossa.", "success")
    return redirect(url_for("admin.impostazioni", tab="aspetto"))


@admin_bp.route("/impostazioni/hero-image", methods=["POST"])
@superadmin_required
def upload_hero_image():
    file = request.files.get("hero_image")
    if not file or not allowed_file(file.filename, {"jpg", "jpeg", "png", "webp"}):
        flash("Formato non valido. Usa JPG, PNG o WebP.", "error")
        return redirect(url_for("admin.impostazioni", tab="aspetto"))
    file.seek(0, 2)
    if file.tell() > 5 * 1024 * 1024:
        flash("File troppo grande (max 5 MB).", "error")
        return redirect(url_for("admin.impostazioni", tab="aspetto"))
    file.seek(0)
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"hero_bg.{ext}"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    dest_path = os.path.join(upload_dir, filename)
    file.save(dest_path)
    os.chmod(dest_path, 0o644)
    Impostazione.set("hero_image_url", f"uploads/{filename}")
    db.session.commit()
    flash("Immagine hero aggiornata.", "success")
    return redirect(url_for("admin.impostazioni", tab="aspetto"))


@admin_bp.route("/impostazioni/hero-image/elimina", methods=["POST"])
@superadmin_required
def hero_image_elimina():
    rel = Impostazione.get("hero_image_url", "")
    if rel:
        path = os.path.join(current_app.root_path, "static", rel.lstrip("/").removeprefix("static/"))
        if os.path.exists(path):
            os.remove(path)
        Impostazione.set("hero_image_url", "")
        db.session.commit()
    flash("Immagine hero rimossa.", "success")
    return redirect(url_for("admin.impostazioni", tab="aspetto"))


@admin_bp.route("/impostazioni/logo/elimina", methods=["POST"])
@superadmin_required
def logo_elimina():
    logo_rel = Impostazione.get("logo_url", "")
    if logo_rel:
        # logo_rel is "uploads/logo.ext" (relative to static dir)
        # handle legacy "/static/uploads/..." format too
        rel = logo_rel.lstrip("/")
        if rel.startswith("static/"):
            rel = rel[len("static/"):]
        logo_path = os.path.join(current_app.root_path, "static", rel)
        if os.path.exists(logo_path):
            os.remove(logo_path)
        Impostazione.set("logo_url", "")
        db.session.commit()
    flash("Logo rimosso.", "success")
    return redirect(url_for("admin.impostazioni"))


# ===========================================================================
# PAGINE LEGALI
# ===========================================================================

@admin_bp.route("/pagine-legali", methods=["GET", "POST"])
@superadmin_required
def pagine_legali():
    from ..pagine_legali_defaults import DEFAULT_PRIVACY_POLICY, DEFAULT_COOKIE_POLICY, DEFAULT_TERMINI
    if request.method == "POST":
        for key in ["pagina_privacy", "pagina_cookie", "pagina_termini"]:
            val = request.form.get(key, "").strip()
            Impostazione.set(key, sanitize_html(val) if val else "")
        db.session.commit()
        logger.info("Admin %s: pagine legali aggiornate", current_user.email)
        flash("Pagine aggiornate.", "success")
        return redirect(url_for("admin.pagine_legali"))

    settings = {row.chiave: row.valore for row in Impostazione.query.all()}
    defaults = {
        "privacy": DEFAULT_PRIVACY_POLICY,
        "cookie": DEFAULT_COOKIE_POLICY,
        "termini": DEFAULT_TERMINI,
    }
    return render_template("admin/pagine_legali.html", settings=settings, defaults=defaults)


# ===========================================================================
# BACKUP
# ===========================================================================

def _sqlite_db_path():
    db_url = current_app.config["SQLALCHEMY_DATABASE_URI"]
    if not db_url.startswith("sqlite"):
        return None
    path = db_url[len("sqlite:///"):]
    if not os.path.isabs(path):
        path = os.path.join(current_app.root_path, "..", path)
    return os.path.normpath(path)


@admin_bp.route("/backup", methods=["GET", "POST"])
@superadmin_required
def backup():
    backup_dir = os.path.join(current_app.instance_path, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    if request.method == "POST":
        action = request.form.get("action", "")
        if action == "crea":
            db_path = _sqlite_db_path()
            if db_path and os.path.exists(db_path):
                import shutil
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                dest = os.path.join(backup_dir, f"backup_{ts}.db")
                shutil.copy2(db_path, dest)
                logger.info("Admin %s: backup creato %s", current_user.email, dest)
                flash("Backup creato con successo.", "success")
            else:
                flash("File database non trovato.", "error")
        elif action == "elimina":
            filename = request.form.get("filename", "")
            if filename and re.match(r'^[\w\-\.]+$', filename):
                fp = os.path.join(backup_dir, filename)
                if os.path.isfile(fp):
                    os.remove(fp)
                    logger.info("Admin %s: backup eliminato %s", current_user.email, filename)
                    flash("Backup eliminato.", "success")
        elif action == "cron":
            _salva_cron(backup_dir)
        elif action == "cron_disabilita":
            _rimuovi_cron(backup_dir)
        return redirect(url_for("admin.backup"))

    backups = []
    for f in sorted(os.listdir(backup_dir), reverse=True):
        fp = os.path.join(backup_dir, f)
        if os.path.isfile(fp):
            stat = os.stat(fp)
            backups.append({
                "nome": f,
                "dimensione": stat.st_size,
                "data": datetime.fromtimestamp(stat.st_mtime),
            })
    app_url = Impostazione.get("app_url") or current_app.config.get("APP_URL", "")
    cron_schedule = _leggi_cron_schedule(backup_dir)
    return render_template("admin/backup.html", backups=backups, backup_dir=backup_dir,
                           app_url=app_url, cron_schedule=cron_schedule)


def _backup_script_path(backup_dir: str) -> str:
    return os.path.join(backup_dir, "_backup.sh")


def _cron_marker(backup_dir: str) -> str:
    return f"# booking-corsi-backup:{backup_dir}"


def _leggi_cron_schedule(backup_dir: str) -> str:
    """Legge la pianificazione cron corrente per questo backup, se presente."""
    try:
        import subprocess
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        marker = _cron_marker(backup_dir)
        for line in result.stdout.splitlines():
            if marker in line:
                # Estrai i 5 campi cron
                parts = line.split()
                if len(parts) >= 5:
                    return " ".join(parts[:5])
    except Exception:
        pass
    return ""


def _salva_cron(backup_dir: str):
    """Installa o aggiorna il job cron per il backup automatico."""
    import subprocess
    orario = request.form.get("cron_orario", "giornaliero")
    ora = request.form.get("cron_ora", "2")
    try:
        ora = max(0, min(23, int(ora)))
    except ValueError:
        ora = 2

    schedules = {
        "giornaliero": f"0 {ora} * * *",
        "settimanale": f"0 {ora} * * 0",
        "mensile": f"0 {ora} 1 * *",
    }
    cron_expr = schedules.get(orario, f"0 {ora} * * *")

    # Genera script di backup
    db_path = _sqlite_db_path()
    script = _backup_script_path(backup_dir)
    script_content = f"""#!/bin/bash
mkdir -p "{backup_dir}"
cp "{db_path}" "{backup_dir}/backup_$(date +%Y%m%d_%H%M%S).db"
# Mantieni solo gli ultimi 30 backup
ls -t "{backup_dir}"/backup_*.db 2>/dev/null | tail -n +31 | xargs rm -f
"""
    with open(script, "w") as f:
        f.write(script_content)
    os.chmod(script, 0o755)

    marker = _cron_marker(backup_dir)
    new_line = f"{cron_expr} {script} >> {backup_dir}/backup.log 2>&1  {marker}"

    # Leggi crontab attuale, rimuovi vecchia riga, aggiungi nuova
    try:
        existing = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    except Exception:
        existing = ""

    lines = [l for l in existing.splitlines() if marker not in l]
    lines.append(new_line)
    new_crontab = "\n".join(lines) + "\n"

    proc = subprocess.run(["crontab", "-"], input=new_crontab, text=True, capture_output=True)
    if proc.returncode == 0:
        logger.info("Admin %s: cron backup impostato: %s", current_user.email, cron_expr)
        flash(f"Backup automatico pianificato ({orario}, ore {ora}:00).", "success")
    else:
        logger.error("Errore crontab: %s", proc.stderr)
        flash("Errore durante la configurazione del cron. Controlla i permessi del server.", "error")


def _rimuovi_cron(backup_dir: str):
    """Rimuove il job cron per il backup automatico."""
    import subprocess
    marker = _cron_marker(backup_dir)
    try:
        existing = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
        lines = [l for l in existing.splitlines() if marker not in l]
        subprocess.run(["crontab", "-"], input="\n".join(lines) + "\n", text=True)
        flash("Backup automatico disabilitato.", "success")
        logger.info("Admin %s: cron backup rimosso", current_user.email)
    except Exception as exc:
        flash(f"Errore rimozione cron: {exc}", "error")


@admin_bp.route("/backup/scarica/<filename>")
@superadmin_required
def backup_scarica(filename):
    if not re.match(r'^[\w\-\.]+$', filename):
        abort(400)
    backup_dir = os.path.join(current_app.instance_path, "backups")
    return send_from_directory(backup_dir, filename, as_attachment=True)


# ===========================================================================
# CHANGELOG
# ===========================================================================

@admin_bp.route("/changelog")
@superadmin_required
def changelog():
    import pathlib, mistune, re
    changelog_path = pathlib.Path(current_app.root_path).parent / "CHANGELOG.md"
    md_text = changelog_path.read_text(encoding="utf-8") if changelog_path.exists() else "_Changelog non trovato._"

    # Split into per-version sections on "## " headings
    parts = re.split(r'(?=^## )', md_text, flags=re.MULTILINE)
    sections = []
    for part in parts:
        part = part.strip()
        if not part or part.startswith("# "):
            continue
        lines = part.splitlines()
        title = lines[0].lstrip("# ").strip()
        body_md = "\n".join(lines[1:]).strip()
        sections.append({"title": title, "html": mistune.html(body_md) if body_md else ""})

    version = current_app.config.get("APP_VERSION", "—")
    return render_template("admin/changelog.html", sections=sections, version=version)
