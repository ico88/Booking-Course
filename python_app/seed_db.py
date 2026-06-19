"""
Script di seed per DB di sviluppo locale.
Crea utenti, corsi, prenotazioni e lead di esempio per testare tutte le funzionalità.

Uso:
    cd python_app
    python seed_db.py           # ricrea tutto da zero
    python seed_db.py --keep    # aggiunge dati senza cancellare il DB esistente
"""
import os, sys, uuid
from datetime import datetime, timezone, timedelta

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

os.environ.setdefault("SECRET_KEY", "dev-secret-key-locale")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.abspath('booking.db')}")

from app import create_app
from app.models import (
    db, Utente, Ruolo, Corso, Prenotazione, StatoPrenotazione,
    MetodoPagamento, LeadMarketing, Impostazione, MaterialeDidattico,
)

app = create_app("development")
keep = "--keep" in sys.argv

def uid():
    return str(uuid.uuid4())

def now(delta_days=0, delta_hours=0):
    return datetime.now(timezone.utc) + timedelta(days=delta_days, hours=delta_hours)

def insert_raw(table, **kwargs):
    """Insert via raw SQL per evitare problemi TZDateTime."""
    cols = ", ".join(kwargs.keys())
    placeholders = ", ".join([f":{k}" for k in kwargs])
    db.session.execute(db.text(f"INSERT OR IGNORE INTO {table} ({cols}) VALUES ({placeholders})"), kwargs)

with app.app_context():
    print(f"DB: {app.config['SQLALCHEMY_DATABASE_URI']}")

    if not keep:
        print("Eliminazione tabelle esistenti...")
        db.drop_all()

    print("Creazione tabelle...")
    db.create_all()

    try:
        from flask_migrate import stamp
        stamp()
        print("Alembic stampato a head.")
    except Exception as e:
        print(f"Alembic stamp ignorato: {e}")

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    import bcrypt as _bcrypt

    def pw(plain):
        return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()

    # ------------------------------------------------------------------ #
    # UTENTI
    # ------------------------------------------------------------------ #
    print("\n→ Utenti...")

    users = [
        dict(id=uid(), email="admin@example.com",      nome="Admin",     cognome="Sistema",
             password_hash=pw("Admin1234!"),    ruolo="ADMIN",      attivo=1, consenso_privacy=1,
             email_verificata=now_str, email_non_valida=0, consenso_marketing=0, tags_marketing="[]"),
        dict(id=uid(), email="segreteria@example.com", nome="Sara",      cognome="Verdi",
             password_hash=pw("Segr1234!"),     ruolo="SEGRETERIA", attivo=1, consenso_privacy=1,
             email_verificata=now_str, email_non_valida=0, consenso_marketing=0, tags_marketing="[]"),
        dict(id=uid(), email="mario.rossi@example.com",nome="Mario",     cognome="Rossi",
             password_hash=pw("User1234!"),     ruolo="UTENTE",     attivo=1, consenso_privacy=1,
             email_verificata=now_str, email_non_valida=0, consenso_marketing=1, tags_marketing='["blsd"]',
             telefono="3331234567"),
        dict(id=uid(), email="giulia.bianchi@example.com", nome="Giulia",cognome="Bianchi",
             password_hash=pw("User1234!"),     ruolo="UTENTE",     attivo=1, consenso_privacy=1,
             email_verificata=now_str, email_non_valida=0, consenso_marketing=1, tags_marketing='["blsd","pblsd"]',
             telefono="3469876543"),
        dict(id=uid(), email="luca.neri@example.com",  nome="Luca",      cognome="Neri",
             password_hash=pw("User1234!"),     ruolo="UTENTE",     attivo=1, consenso_privacy=1,
             email_non_valida=0, consenso_marketing=0, tags_marketing="[]"),
        dict(id=uid(), email="anna.ferri@example.com", nome="Anna",      cognome="Ferri",
             password_hash=pw("User1234!"),     ruolo="UTENTE",     attivo=0, consenso_privacy=1,
             email_non_valida=0, consenso_marketing=1, tags_marketing="[]"),  # disattivata
        dict(id=uid(), email="bounce@invalid.com",     nome="Bounce",    cognome="Test",
             password_hash=pw("User1234!"),     ruolo="UTENTE",     attivo=1, consenso_privacy=1,
             email_non_valida=1, consenso_marketing=1, tags_marketing="[]"),  # email non valida
    ]

    for u in users:
        insert_raw("utenti", created_at=now_str, updated_at=now_str, **u)
    db.session.commit()
    print(f"  {len(users)} utenti creati")

    # Recupera ID per riferimenti
    def get_id(email):
        r = db.session.execute(db.text("SELECT id FROM utenti WHERE email=:e"), {"e": email}).fetchone()
        return r[0] if r else None

    id_admin   = get_id("admin@example.com")
    id_mario   = get_id("mario.rossi@example.com")
    id_giulia  = get_id("giulia.bianchi@example.com")
    id_luca    = get_id("luca.neri@example.com")
    id_anna    = get_id("anna.ferri@example.com")

    # ------------------------------------------------------------------ #
    # TAG NEWSLETTER (salvati come JSON in Impostazione)
    # ------------------------------------------------------------------ #
    print("→ Tag newsletter...")
    import json as _json
    newsletter_tags = _json.dumps([
        {"label": "Corsi BLSD",  "slug": "blsd"},
        {"label": "Corsi PBLSD", "slug": "pblsd"},
        {"label": "Corsi ECG",   "slug": "ecg"},
    ])
    db.session.execute(db.text(
        "INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES ('newsletter_tags', :v)"
    ), {"v": newsletter_tags})
    db.session.commit()
    print("  3 tag newsletter configurati")

    # ------------------------------------------------------------------ #
    # CORSI
    # ------------------------------------------------------------------ #
    print("→ Corsi...")
    corsi = [
        dict(id=uid(), titolo="Corso BLSD — Giugno 2026",
             descrizione="<p>Corso di <strong>Basic Life Support and Defibrillation</strong>. Impara le manovre di rianimazione cardiopolmonare e l'uso del defibrillatore.</p>",
             data_inizio=(now(10)).strftime("%Y-%m-%d %H:%M:%S"),
             data_fine=(now(10, 8)).strftime("%Y-%m-%d %H:%M:%S"),
             luogo="Via Roma 1, Catania", costo="120.00", posti_totali=12, posti_occupati=3,
             pubblicato=1, timeout_pagamento_ore=48, tags='["blsd"]',
             coordinate_bancarie="IBAN: IT60X0542811101000000123456\nIntestato a: Associazione Esempio\nCausale: BLSD Giugno 2026"),
        dict(id=uid(), titolo="Corso PBLSD — Luglio 2026",
             descrizione="<p>Corso di <strong>Pediatric Basic Life Support and Defibrillation</strong>. Rianimazione su lattanti e bambini.</p>",
             data_inizio=(now(40)).strftime("%Y-%m-%d %H:%M:%S"),
             data_fine=(now(40, 8)).strftime("%Y-%m-%d %H:%M:%S"),
             luogo="Via Etnea 50, Catania", costo="150.00", posti_totali=10, posti_occupati=1,
             pubblicato=1, timeout_pagamento_ore=24, tags='["pblsd"]',
             coordinate_bancarie="IBAN: IT60X0542811101000000123456\nCausale: PBLSD Luglio 2026"),
        dict(id=uid(), titolo="Corso ECG Base — Agosto 2026",
             descrizione="<p>Interpretazione di base dell'elettrocardiogramma. Rivolto a operatori sanitari.</p>",
             data_inizio=(now(60)).strftime("%Y-%m-%d %H:%M:%S"),
             data_fine=(now(60, 6)).strftime("%Y-%m-%d %H:%M:%S"),
             luogo="Online via Zoom", costo="80.00", posti_totali=20, posti_occupati=0,
             pubblicato=1, timeout_pagamento_ore=72, tags='["ecg"]',
             coordinate_bancarie=""),
        dict(id=uid(), titolo="Corso BLSD — Bozza (non pubblicato)",
             descrizione="<p>Corso in preparazione.</p>",
             data_inizio=(now(90)).strftime("%Y-%m-%d %H:%M:%S"),
             data_fine=(now(91)).strftime("%Y-%m-%d %H:%M:%S"),
             luogo="TBD", costo="120.00", posti_totali=12, posti_occupati=0,
             pubblicato=0, timeout_pagamento_ore=48, tags='["blsd"]',
             coordinate_bancarie=""),
    ]

    for c in corsi:
        insert_raw("corsi", created_at=now_str, updated_at=now_str,
                   validazione_preventiva=0, attestato_abilitato=0,
                   durata=None, orario=None, immagine_url=None,
                   attestato_template_url=None, attestato_nome_file=None,
                   attestato_html_template=None, descrizione_prerequisito=None,
                   ultima_notifica_marketing=None, ultima_notifica_leads=None, **c)
    db.session.commit()
    print(f"  {len(corsi)} corsi creati")

    def get_corso(titolo_fragment):
        r = db.session.execute(db.text("SELECT id FROM corsi WHERE titolo LIKE :t"), {"t": f"%{titolo_fragment}%"}).fetchone()
        return r[0] if r else None

    id_blsd   = get_corso("BLSD — Giugno")
    id_pblsd  = get_corso("PBLSD")
    id_ecg    = get_corso("ECG")

    # ------------------------------------------------------------------ #
    # PRENOTAZIONI
    # ------------------------------------------------------------------ #
    print("→ Prenotazioni...")

    scadenza_futura  = now(2).strftime("%Y-%m-%d %H:%M:%S")
    scadenza_passata = now(-1).strftime("%Y-%m-%d %H:%M:%S")
    scadenza_vicina  = now(0, 20).strftime("%Y-%m-%d %H:%M:%S")  # scade tra 20h → reminder

    prenotazioni = [
        # Mario — BLSD — CONFERMATA
        dict(id=uid(), utente_id=id_mario, corso_id=id_blsd, numero_posti=1,
             stato="CONFERMATA", scadenza_pagamento=scadenza_futura,
             importo_pagato="120.00", metodo_pagamento="BONIFICO",
             reminder_scadenza_inviato=0, attestato_emesso=0),
        # Giulia — BLSD — PAGAMENTO_CARICATO
        dict(id=uid(), utente_id=id_giulia, corso_id=id_blsd, numero_posti=1,
             stato="PAGAMENTO_CARICATO", scadenza_pagamento=scadenza_futura,
             reminder_scadenza_inviato=0, attestato_emesso=0),
        # Luca — BLSD — IN_ATTESA_PAGAMENTO (scadenza vicina, no reminder → pulsante visibile)
        dict(id=uid(), utente_id=id_luca, corso_id=id_blsd, numero_posti=1,
             stato="IN_ATTESA_PAGAMENTO", scadenza_pagamento=scadenza_vicina,
             reminder_scadenza_inviato=0, attestato_emesso=0),
        # Mario — PBLSD — IN_ATTESA_PAGAMENTO (reminder già inviato)
        dict(id=uid(), utente_id=id_mario, corso_id=id_pblsd, numero_posti=1,
             stato="IN_ATTESA_PAGAMENTO", scadenza_pagamento=scadenza_futura,
             reminder_scadenza_inviato=1, reminder_scadenza_inviato_at=now(-1).strftime("%Y-%m-%d %H:%M:%S"),
             attestato_emesso=0),
        # Giulia — ECG — ANNULLATA
        dict(id=uid(), utente_id=id_giulia, corso_id=id_ecg, numero_posti=1,
             stato="ANNULLATA", scadenza_pagamento=scadenza_passata,
             reminder_scadenza_inviato=0, attestato_emesso=0,
             note_rifiuto="Annullata su richiesta dell'utente."),
    ]

    for p in prenotazioni:
        if "reminder_scadenza_inviato_at" not in p:
            p["reminder_scadenza_inviato_at"] = None
        if "metodo_pagamento" not in p:
            p["metodo_pagamento"] = None
        if "importo_pagato" not in p:
            p["importo_pagato"] = None
        if "note_rifiuto" not in p:
            p["note_rifiuto"] = None
        insert_raw("prenotazioni", created_at=now_str, updated_at=now_str,
                   note=None, note_segreteria=None, url_contabile=None,
                   nome_file_contabile=None, prerequisito_url=None,
                   prerequisito_nome_file=None, attestato_url=None,
                   id_transazione=None, **p)
    db.session.commit()
    print(f"  {len(prenotazioni)} prenotazioni create")

    # ------------------------------------------------------------------ #
    # LEAD MARKETING
    # ------------------------------------------------------------------ #
    print("→ Lead marketing...")
    leads = [
        dict(id=uid(), email="lead1@example.com", nome="Carlo",   cognome="Esposito",
             tags='["blsd"]',    email_non_valida=0),
        dict(id=uid(), email="lead2@example.com", nome="Marta",   cognome="Colombo",
             tags='["blsd","pblsd"]', email_non_valida=0),
        dict(id=uid(), email="lead3@example.com", nome="Giorgio", cognome="Ricci",
             tags='["ecg"]',     email_non_valida=0),
        dict(id=uid(), email="bounce.lead@invalid.com", nome="Bounce", cognome="Lead",
             tags="[]",          email_non_valida=1),
    ]
    for l in leads:
        insert_raw("leads_marketing", created_at=now_str, **l)
    db.session.commit()
    print(f"  {len(leads)} lead creati")

    # ------------------------------------------------------------------ #
    # MATERIALI DIDATTICI
    # ------------------------------------------------------------------ #
    print("→ Materiali didattici...")
    mat_id = uid()
    insert_raw("materiale_didattico",
               id=mat_id, nome="Dispensa BLSD 2024", nome_file="dispensa_blsd_2024.pdf",
               mime_type="application/pdf", dimensione=204800,
               uploaded_by=id_admin, created_at=now_str)
    # Associa al corso BLSD
    if id_blsd:
        db.session.execute(db.text(
            "INSERT OR IGNORE INTO corso_materiale (corso_id, materiale_id, aggiunto_at) VALUES (:c,:m,:t)"
        ), {"c": id_blsd, "m": mat_id, "t": now_str})
    db.session.commit()
    print("  1 materiale didattico creato e associato a BLSD")

    # ------------------------------------------------------------------ #
    # IMPOSTAZIONI BASE
    # ------------------------------------------------------------------ #
    print("→ Impostazioni...")
    impostazioni = {
        "app_name": "Booking Corsi (Dev)",
        "color_scheme": "blu",
        "smtp_host": "",
        "smtp_port": "587",
        "smtp_user": "",
        "smtp_from": "noreply@example.com",
        "app_url": "http://127.0.0.1:5000",
        "ragione_sociale": "Associazione di Esempio",
        "piva": "01234567890",
        "indirizzo": "Via Roma 1, 95100 Catania (CT)",
    }
    for chiave, valore in impostazioni.items():
        db.session.execute(db.text(
            "INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES (:k, :v)"
        ), {"k": chiave, "v": valore})
    db.session.commit()
    print(f"  {len(impostazioni)} impostazioni")

    # ------------------------------------------------------------------ #
    # RIEPILOGO
    # ------------------------------------------------------------------ #
    print("""
╔══════════════════════════════════════════════════════╗
║           DB DI TEST PRONTO                          ║
╠══════════════════════════════════════════════════════╣
║  ADMIN      admin@example.com      Admin1234!        ║
║  SEGRETERIA segreteria@example.com Segr1234!         ║
║  UTENTE     mario.rossi@example.com  User1234!       ║
║  UTENTE     giulia.bianchi@example.com User1234!     ║
║  UTENTE     luca.neri@example.com    User1234!       ║
╠══════════════════════════════════════════════════════╣
║  Corsi:         4  (3 pubblicati, 1 bozza)           ║
║  Prenotazioni:  5  (vari stati)                      ║
║  Lead:          4  (1 bounce)                        ║
║  Materiali:     1  (associato a BLSD)                ║
╠══════════════════════════════════════════════════════╣
║  Luca → BLSD: IN_ATTESA_PAGAMENTO, reminder 🔔       ║
║  Giulia → BLSD: PAGAMENTO_CARICATO, da confermare    ║
║  Mario → BLSD: CONFERMATA                            ║
╚══════════════════════════════════════════════════════╝

Avvia l'app:
  flask --app wsgi:app run --debug
""")
