"""
Fixtures condivise per l'intera suite di test.

Usa SQLite in-memory; ogni test riceve un DB pulito tramite drop/create.
CSRF è disabilitato (TestingConfig).
"""
import os
import pytest

os.environ.setdefault("SECRET_KEY", "test-secret-key-non-usare-in-produzione")
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/test_booking.db")

from app import create_app, limiter
from app.models import db as _db, Utente, Corso, Ruolo
from datetime import datetime, timezone, timedelta


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    # Disabilita tutti i limiti per i test
    app.config["RATELIMIT_ENABLED"] = False
    return app


@pytest.fixture(scope="function", autouse=True)
def reset_rate_limit():
    """Pulisce i tentativi di login tra un test e l'altro."""
    import importlib
    import sys
    mod = sys.modules.get("app.auth.routes")
    if mod and hasattr(mod, "_login_attempts"):
        mod._login_attempts.clear()
    yield
    if mod and hasattr(mod, "_login_attempts"):
        mod._login_attempts.clear()


@pytest.fixture(scope="function", autouse=False)
def db(app):
    """Ricrea tutte le tabelle prima di ogni test e le pulisce dopo."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope="function")
def client(app, db):
    return app.test_client()


# ---------------------------------------------------------------------------
# Helper per creare utenti di test
# ---------------------------------------------------------------------------

def _make_utente(db, email, ruolo=Ruolo.UTENTE, password="Password1!"):
    u = Utente(
        email=email,
        nome="Test",
        cognome="User",
        ruolo=ruolo,
        consenso_privacy=True,
        attivo=True,
    )
    u.set_password(password)
    db.session.add(u)
    db.session.flush()
    return u


@pytest.fixture
def utente(db):
    return _make_utente(db, "utente@test.com")


@pytest.fixture
def admin(db):
    return _make_utente(db, "admin@test.com", Ruolo.ADMIN)


@pytest.fixture
def segreteria(db):
    return _make_utente(db, "segreteria@test.com", Ruolo.SEGRETERIA)


def _login(client, email, password="Password1!"):
    return client.post("/auth/login", data={"email": email, "password": password}, follow_redirects=True)


@pytest.fixture
def client_utente(client, utente):
    _login(client, utente.email)
    return client


@pytest.fixture
def client_admin(client, admin):
    _login(client, admin.email)
    return client


@pytest.fixture
def client_segreteria(client, segreteria):
    _login(client, segreteria.email)
    return client


# ---------------------------------------------------------------------------
# Corso di test
# ---------------------------------------------------------------------------

@pytest.fixture
def corso(db):
    c = Corso(
        titolo="Corso di Test",
        descrizione="<p>Descrizione test</p>",
        data_inizio=datetime.now(timezone.utc) + timedelta(days=30),
        data_fine=datetime.now(timezone.utc) + timedelta(days=31),
        luogo="Aula Test",
        posti_totali=10,
        posti_occupati=0,
        costo=100.0,
        pubblicato=True,
    )
    db.session.add(c)
    db.session.flush()
    return c
