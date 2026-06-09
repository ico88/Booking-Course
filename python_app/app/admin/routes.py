import os
import uuid
import csv
import io
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import (
    Blueprint, render_template, redirect, url_for,
    request, flash, current_app, abort, jsonify,
    send_from_directory, Response,
)
from flask_login import login_required, current_user
from sqlalchemy import func

from ..models import (
    db, Utente, Corso, Prenotazione, Partecipante, LeadMarketing,
    Impostazione, StatoPrenotazione, MetodoPagamento, Ruolo,
)
from ..email_service import (
    invia_email_conferma_prenotazione, invia_email_attestato,
    invia_email_marketing, invia_email_benvenuto,
)
from ..utils import allowed_file, safe_filename

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


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
            db.session.delete(corso)
            db.session.commit()
            flash("Corso eliminato.", "success")
            return redirect(url_for("admin.corsi"))
        _corso_da_form(corso)
        db.session.commit()
        flash("Corso aggiornato.", "success")
        return redirect(url_for("admin.corso_modifica", corso_id=corso.id))
    return render_template("admin/corsi/form.html", corso=corso)


def _corso_da_form(corso: Corso) -> Corso:
    corso.titolo = request.form.get("titolo", "").strip()
    corso.descrizione = request.form.get("descrizione", "").strip()
    corso.luogo = request.form.get("luogo", "").strip()
    corso.orario = request.form.get("orario", "").strip()
    corso.durata = request.form.get("durata", "").strip()
    corso.coordinate_bancarie = request.form.get("coordinate_bancarie", "").strip()
    try:
        corso.costo = float(request.form.get("costo", "0").replace(",", "."))
    except ValueError:
        corso.costo = 0
    corso.posti_totali = int(request.form.get("posti_totali", 0) or 0)
    corso.timeout_pagamento_ore = int(request.form.get("timeout_pagamento_ore", 24) or 24)
    corso.pubblicato = request.form.get("pubblicato") == "on"
    corso.attestato_abilitato = request.form.get("attestato_abilitato") == "on"
    tags_raw = request.form.get("tags", "")
    corso.tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

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
        titolo=f"Copia di {corso.titolo}",
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
        p.note_segreteria = request.form.get("note_segreteria", "").strip()
        db.session.commit()
        flash("Note aggiornate.", "success")
    return render_template("admin/prenotazioni/dettaglio.html", prenotazione=p)


@admin_bp.route("/prenotazioni/<string:prenotazione_id>/conferma", methods=["POST"])
@admin_required
def prenotazione_conferma(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    p.stato = StatoPrenotazione.CONFERMATA
    db.session.commit()
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
    flash("Prenotazione annullata.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


@admin_bp.route("/prenotazioni/<string:prenotazione_id>/attestato", methods=["POST"])
@admin_required
def emetti_attestato(prenotazione_id):
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.stato != StatoPrenotazione.CONFERMATA:
        flash("La prenotazione deve essere confermata per emettere l'attestato.", "error")
        return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))

    # Generate simple HTML attestato
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

    try:
        invia_email_attestato(p)
    except Exception:
        pass

    flash("Attestato emesso e inviato.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


def _genera_attestato_html(prenotazione: Prenotazione) -> str:
    u = prenotazione.utente
    c = prenotazione.corso
    app_name = Impostazione.get("app_name") or "Gestione Corsi"
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
<p class="nome">{u.nome} {u.cognome}</p>
<p class="corso">ha partecipato al corso<br><strong>{c.titolo}</strong></p>
<p class="data">Tenuto in data {data_str} — {c.luogo or ''}</p>
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
    email = request.form.get("email", "").strip().lower()
    nome = request.form.get("nome", "").strip()
    cognome = request.form.get("cognome", "").strip()
    password = request.form.get("password", "")
    ruolo = request.form.get("ruolo", "UTENTE")

    if Utente.query.filter_by(email=email).first():
        flash("Email già registrata.", "error")
        return redirect(url_for("admin.utenti"))

    u = Utente(nome=nome, cognome=cognome, email=email, ruolo=Ruolo(ruolo))
    u.set_password(password)
    db.session.add(u)
    db.session.commit()

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
    db.session.delete(u)
    db.session.commit()
    flash("Utente eliminato.", "success")
    return redirect(url_for("admin.utenti"))


@admin_bp.route("/iscrivi-utente", methods=["POST"])
@admin_required
def iscrivi_utente():
    corso_id = request.form.get("corso_id")
    utente_id = request.form.get("utente_id")
    numero_posti = int(request.form.get("numero_posti", 1))

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
    flash(f"{utente.nome_completo} iscritto a {corso.titolo}.", "success")
    return redirect(url_for("admin.prenotazione_dettaglio", prenotazione_id=p.id))


# ===========================================================================
# MARKETING LEADS
# ===========================================================================

@admin_bp.route("/marketing")
@admin_required
def marketing():
    leads = LeadMarketing.query.order_by(LeadMarketing.created_at.desc()).all()
    return render_template("admin/marketing/lista.html", leads=leads)


@admin_bp.route("/marketing/leads/<string:lead_id>/elimina", methods=["POST"])
@admin_required
def lead_elimina(lead_id):
    lead = LeadMarketing.query.get_or_404(lead_id)
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
    flash(f"Notifica inviata a {sent} lead.", "success")
    return redirect(url_for("admin.marketing"))


@admin_bp.route("/marketing/importa", methods=["POST"])
@admin_required
def marketing_importa():
    file = request.files.get("csv")
    if not file:
        flash("Nessun file.", "error")
        return redirect(url_for("admin.marketing"))
    stream = io.StringIO(file.stream.read().decode("utf-8", errors="ignore"))
    reader = csv.DictReader(stream)
    added = 0
    for row in reader:
        email = (row.get("email") or row.get("Email") or "").strip().lower()
        if not email or "@" not in email:
            continue
        if not LeadMarketing.query.filter_by(email=email).first():
            lead = LeadMarketing(
                email=email,
                nome=(row.get("nome") or row.get("Nome") or "").strip(),
                cognome=(row.get("cognome") or row.get("Cognome") or "").strip(),
                verificato=True,
                attivo=True,
            )
            db.session.add(lead)
            added += 1
    db.session.commit()
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
            val = request.form.get(key, "")
            Impostazione.set(key, val)
        db.session.commit()
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
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"logo.{ext}"
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"])
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
            Impostazione.set(key, request.form.get(key, ""))
        db.session.commit()
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
    import subprocess, tempfile
    db_url = current_app.config["SQLALCHEMY_DATABASE_URI"]
    # Extract connection details from URL
    # postgresql://user:pass@host:port/dbname
    try:
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        env = os.environ.copy()
        env["PGPASSWORD"] = parsed.password or ""
        cmd = [
            "pg_dump",
            "-h", parsed.hostname or "localhost",
            "-p", str(parsed.port or 5432),
            "-U", parsed.username or "postgres",
            "-d", parsed.path.lstrip("/"),
            "--no-password",
        ]
        result = subprocess.run(cmd, capture_output=True, env=env, timeout=60)
        if result.returncode != 0:
            flash("Errore durante il backup.", "error")
            return redirect(url_for("admin.backup"))
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return Response(
            result.stdout,
            mimetype="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=backup_{ts}.sql"},
        )
    except Exception as e:
        flash(f"Errore backup: {e}", "error")
        return redirect(url_for("admin.backup"))
