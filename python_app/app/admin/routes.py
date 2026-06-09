import logging
import os
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
    Impostazione, StatoPrenotazione, MetodoPagamento, Ruolo,
)
from ..email_service import (
    invia_email_conferma_prenotazione, invia_email_attestato,
    invia_email_marketing, invia_email_benvenuto,
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
    return render_template("admin/corsi/form.html", corso=None)


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
    return render_template("admin/corsi/form.html", corso=corso)


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
    tags_raw = request.form.get("tags", "")[:500]
    corso.tags = [t.strip()[:50] for t in tags_raw.split(",") if t.strip()][:20]

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
    file.save(os.path.join(upload_dir, filename))
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
    return render_template("admin/corsi/partecipanti.html", corso=corso, prenotazioni=prenotazioni)


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


def _genera_attestato_html(prenotazione: Prenotazione) -> str:
    u = prenotazione.utente
    c = prenotazione.corso
    app_name = escape(Impostazione.get("app_name") or "Gestione Corsi")
    nome = escape(u.nome or "")
    cognome = escape(u.cognome or "")
    titolo = escape(c.titolo or "")
    luogo = escape(c.luogo or "")
    data_str = c.data_inizio.strftime("%d/%m/%Y") if c.data_inizio else ""
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


@admin_bp.route("/utenti/<string:utente_id>/elimina", methods=["POST"])
@admin_required
def utente_elimina(utente_id):
    if utente_id == current_user.id:
        flash("Non puoi eliminare te stesso.", "error")
        return redirect(url_for("admin.utenti"))
    u = Utente.query.get_or_404(utente_id)
    logger.info("Admin %s: utente eliminato %s", current_user.email, u.email)
    db.session.delete(u)
    db.session.commit()
    flash("Utente eliminato.", "success")
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

@admin_bp.route("/marketing")
@admin_required
def marketing():
    leads = LeadMarketing.query.order_by(LeadMarketing.created_at.desc()).all()
    corsi_pubblicati = Corso.query.filter_by(pubblicato=True).order_by(Corso.data_inizio.desc()).all()
    return render_template("admin/marketing/lista.html", leads=leads, corsi_pubblicati=corsi_pubblicati)


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
    corso_id = request.form.get("corso_id")
    corso = Corso.query.get_or_404(corso_id)
    leads = LeadMarketing.query.filter_by(attivo=True, verificato=True).all()
    sent = 0
    secret = current_app.config.get("SECRET_KEY", "")
    from ..utils import generate_unsubscribe_token
    for lead in leads:
        try:
            token = generate_unsubscribe_token(lead.email, secret)
            invia_email_marketing(lead, corso, token)
            sent += 1
        except Exception:
            pass
    logger.info("Admin %s: notifica marketing per corso %s a %d lead", current_user.email, corso.id, sent)
    flash(f"Notifica inviata a {sent} lead.", "success")
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
            lead = LeadMarketing(
                email=email,
                nome=(row.get("nome") or row.get("Nome") or "").strip()[:100],
                cognome=(row.get("cognome") or row.get("Cognome") or "").strip()[:100],
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
# IMPOSTAZIONI
# ===========================================================================

@admin_bp.route("/impostazioni", methods=["GET", "POST"])
@admin_required
def impostazioni():
    if request.method == "POST":
        keys = [
            "app_name", "smtp_host", "smtp_port", "smtp_user",
            "smtp_password", "smtp_from_name",
            "stripe_publishable_key", "stripe_secret_key",
            "paypal_client_id", "paypal_client_secret", "paypal_mode",
            "turnstile_site_key", "turnstile_secret_key",
        ]
        for key in keys:
            val = request.form.get(key, "").strip()[:500]
            Impostazione.set(key, val)
        db.session.commit()
        logger.info("Admin %s: impostazioni aggiornate", current_user.email)
        flash("Impostazioni salvate.", "success")
        return redirect(url_for("admin.impostazioni"))

    settings = {row.chiave: row.valore for row in Impostazione.query.all()}
    return render_template("admin/impostazioni.html", settings=settings)


@admin_bp.route("/impostazioni/test-email", methods=["POST"])
@admin_required
def test_email():
    from ..email_service import send_email, _html_wrapper, _ctx
    app_name, app_url = _ctx()
    try:
        send_email(
            current_user.email,
            f"Test email - {app_name}",
            _html_wrapper("<h2>Email di test</h2><p>La configurazione SMTP funziona correttamente.</p>", app_name, app_url),
        )
        flash(f"Email di test inviata a {current_user.email}.", "success")
    except Exception as e:
        flash(f"Errore invio email: {e}", "error")
    return redirect(url_for("admin.impostazioni"))


@admin_bp.route("/impostazioni/logo", methods=["POST"])
@admin_required
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
    file.save(os.path.join(upload_dir, filename))
    Impostazione.set("logo_url", f"/static/uploads/{filename}")
    db.session.commit()
    flash("Logo aggiornato.", "success")
    return redirect(url_for("admin.impostazioni"))


# ===========================================================================
# PAGINE LEGALI
# ===========================================================================

@admin_bp.route("/pagine-legali", methods=["GET", "POST"])
@admin_required
def pagine_legali():
    if request.method == "POST":
        for key in ["pagina_privacy", "pagina_cookie", "pagina_termini"]:
            Impostazione.set(key, sanitize_html(request.form.get(key, "")))
        db.session.commit()
        logger.info("Admin %s: pagine legali aggiornate", current_user.email)
        flash("Pagine aggiornate.", "success")
        return redirect(url_for("admin.pagine_legali"))

    settings = {row.chiave: row.valore for row in Impostazione.query.all()}
    return render_template("admin/pagine_legali.html", settings=settings)


# ===========================================================================
# BACKUP
# ===========================================================================

@admin_bp.route("/backup")
@admin_required
def backup():
    return render_template("admin/backup.html")


@admin_bp.route("/backup/scarica")
@admin_required
def backup_scarica():
    import subprocess
    db_url = current_app.config["SQLALCHEMY_DATABASE_URI"]
    try:
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        hostname = parsed.hostname or "localhost"
        port = str(parsed.port or 5432)
        username = parsed.username or "postgres"
        dbname = parsed.path.lstrip("/")
        for component in (hostname, port, username, dbname):
            if not component or any(c in component for c in (";", "&", "|", "$", "`", "\n", "\r", "'")):
                flash("Configurazione database non valida.", "error")
                return redirect(url_for("admin.backup"))
        env = os.environ.copy()
        env["PGPASSWORD"] = parsed.password or ""
        cmd = ["pg_dump", "-h", hostname, "-p", port, "-U", username, "-d", dbname, "--no-password"]
        result = subprocess.run(cmd, capture_output=True, env=env, timeout=60)
        if result.returncode != 0:
            logger.error("Backup fallito: %s", result.stderr.decode(errors="replace")[:500])
            flash("Errore durante il backup.", "error")
            return redirect(url_for("admin.backup"))
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        logger.info("Admin %s: backup DB eseguito", current_user.email)
        return Response(
            result.stdout,
            mimetype="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=backup_{ts}.sql"},
        )
    except Exception as e:
        logger.error("Errore backup: %s", e)
        flash(f"Errore backup: {e}", "error")
        return redirect(url_for("admin.backup"))
