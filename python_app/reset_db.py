"""
Script di reset DB per sviluppo locale.
Ricrea tutte le tabelle e crea un utente admin di default.

Uso:
    cd python_app
    python reset_db.py

Non usare in produzione.
"""
import os
import sys
from datetime import datetime

# Carica .env se presente
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

os.environ.setdefault("SECRET_KEY", "dev-secret-key-locale")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.abspath('booking.db')}")

from app import create_app
from app.models import db, Utente, Ruolo

app = create_app("development")

with app.app_context():
    db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    print(f"DB: {db_uri}")
    print("Eliminazione tabelle esistenti...")
    db.drop_all()
    print("Creazione tabelle...")
    db.create_all()

    # Timbra alembic al revision head per evitare conflitti con flask db migrate
    try:
        from flask_migrate import stamp
        stamp()
        print("Alembic stampato a head.")
    except Exception as e:
        print(f"Alembic stamp fallito (ignorabile): {e}")

    # Crea admin via SQL diretto (evita problemi timezone con SQLite)
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    password = os.environ.get("ADMIN_PASSWORD", "Admin1234!")

    existing = db.session.execute(
        db.text("SELECT id FROM utenti WHERE email = :e"), {"e": email}
    ).fetchone()

    if not existing:
        import uuid
        import bcrypt as _bcrypt
        uid = str(uuid.uuid4())
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        pw_hash = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()
        db.session.execute(db.text("""
            INSERT INTO utenti
              (id, email, nome, cognome, password_hash, ruolo,
               consenso_privacy, attivo, email_verificata,
               email_non_valida, consenso_marketing, tags_marketing,
               created_at, updated_at)
            VALUES
              (:id, :email, 'Admin', 'Locale', :pw, 'ADMIN',
               1, 1, 1,
               0, 0, '[]',
               :now, :now)
        """), {"id": uid, "email": email, "pw": pw_hash, "now": now})
        db.session.commit()
        print(f"\nAdmin creato: {email} / {password}")
    else:
        print(f"\nAdmin già esistente: {email}")

    print("\nDB pronto. Avvia l'app con:")
    print("  flask --app wsgi:app run --debug")
    print(f"\nOppure in PyCharm: imposta FLASK_APP=wsgi:app e avvia wsgi.py")
