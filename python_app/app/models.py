import uuid
import enum
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
import bcrypt
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

db = SQLAlchemy()


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    if isinstance(dbapi_conn, sqlite3.Connection):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def gen_id():
    return str(uuid.uuid4())


def now_utc():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enum types
# ---------------------------------------------------------------------------

class Ruolo(str, enum.Enum):
    UTENTE = "UTENTE"
    SEGRETERIA = "SEGRETERIA"
    ADMIN = "ADMIN"


class StatoPrenotazione(str, enum.Enum):
    IN_ATTESA_PAGAMENTO = "IN_ATTESA_PAGAMENTO"
    PAGAMENTO_CARICATO = "PAGAMENTO_CARICATO"
    CONFERMATA = "CONFERMATA"
    ANNULLATA = "ANNULLATA"
    SCADUTA = "SCADUTA"


class MetodoPagamento(str, enum.Enum):
    BONIFICO = "BONIFICO"
    STRIPE = "STRIPE"
    PAYPAL = "PAYPAL"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Utente(UserMixin, db.Model):
    __tablename__ = "utenti"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    nome = db.Column(db.String(100), nullable=False)
    cognome = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(30))
    codice_fiscale = db.Column(db.String(20))
    password_hash = db.Column(db.String(255))
    ruolo = db.Column(db.Enum(Ruolo), nullable=False, default=Ruolo.UTENTE)
    email_verificata = db.Column(db.DateTime(timezone=True))
    token_reset = db.Column(db.String(255))
    scadenza_token = db.Column(db.DateTime(timezone=True))
    consenso_privacy = db.Column(db.Boolean, default=False)
    consenso_marketing = db.Column(db.Boolean, default=False)
    data_consenso = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    prenotazioni = db.relationship("Prenotazione", back_populates="utente", lazy="dynamic")

    def set_password(self, plain: str):
        self.password_hash = bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

    def check_password(self, plain: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.checkpw(plain.encode(), self.password_hash.encode())

    @property
    def nome_completo(self):
        return f"{self.nome} {self.cognome}"

    def is_admin(self):
        return self.ruolo in (Ruolo.ADMIN, Ruolo.SEGRETERIA)


class Corso(db.Model):
    __tablename__ = "corsi"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    titolo = db.Column(db.String(255), nullable=False)
    descrizione = db.Column(db.Text)
    data_inizio = db.Column(db.DateTime(timezone=True))
    data_fine = db.Column(db.DateTime(timezone=True))
    orario = db.Column(db.String(100))
    durata = db.Column(db.String(100))
    luogo = db.Column(db.String(255))
    costo = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    posti_totali = db.Column(db.Integer, default=0)
    posti_occupati = db.Column(db.Integer, default=0)
    timeout_pagamento_ore = db.Column(db.Integer, default=24)
    coordinate_bancarie = db.Column(db.Text)
    immagine_url = db.Column(db.String(500))
    pubblicato = db.Column(db.Boolean, default=False)
    tags = db.Column(db.JSON, default=list)
    attestato_template_url = db.Column(db.String(500))
    attestato_nome_file = db.Column(db.String(255))
    attestato_html_template = db.Column(db.Text)
    attestato_abilitato = db.Column(db.Boolean, default=False)
    ultima_notifica_marketing = db.Column(db.DateTime(timezone=True))
    ultima_notifica_leads = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    prenotazioni = db.relationship("Prenotazione", back_populates="corso", lazy="dynamic")

    @property
    def posti_disponibili(self):
        return max(0, (self.posti_totali or 0) - (self.posti_occupati or 0))

    @property
    def costo_formattato(self):
        return f"€ {float(self.costo):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


class Prenotazione(db.Model):
    __tablename__ = "prenotazioni"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    utente_id = db.Column(db.String, db.ForeignKey("utenti.id", ondelete="CASCADE"), nullable=False)
    corso_id = db.Column(db.String, db.ForeignKey("corsi.id", ondelete="CASCADE"), nullable=False)
    numero_posti = db.Column(db.Integer, default=1)
    stato = db.Column(db.Enum(StatoPrenotazione), default=StatoPrenotazione.IN_ATTESA_PAGAMENTO)
    scadenza_pagamento = db.Column(db.DateTime(timezone=True))
    metodo_pagamento = db.Column(db.Enum(MetodoPagamento))
    id_transazione = db.Column(db.String(255))
    importo_pagato = db.Column(db.Numeric(10, 2))
    url_contabile = db.Column(db.String(500))
    nome_file_contabile = db.Column(db.String(255))
    note = db.Column(db.Text)
    note_segreteria = db.Column(db.Text)
    attestato_url = db.Column(db.String(500))
    attestato_emesso = db.Column(db.Boolean, default=False)
    attestato_emesso_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    utente = db.relationship("Utente", back_populates="prenotazioni")
    corso = db.relationship("Corso", back_populates="prenotazioni")
    partecipanti = db.relationship("Partecipante", back_populates="prenotazione", cascade="all, delete-orphan")

    @property
    def importo_totale(self):
        if self.corso:
            return float(self.corso.costo) * (self.numero_posti or 1)
        return 0.0

    STATO_LABEL = {
        StatoPrenotazione.IN_ATTESA_PAGAMENTO: ("In attesa di pagamento", "yellow"),
        StatoPrenotazione.PAGAMENTO_CARICATO: ("Pagamento caricato", "blue"),
        StatoPrenotazione.CONFERMATA: ("Confermata", "green"),
        StatoPrenotazione.ANNULLATA: ("Annullata", "red"),
        StatoPrenotazione.SCADUTA: ("Scaduta", "gray"),
    }

    @property
    def stato_label(self):
        return self.STATO_LABEL.get(self.stato, (str(self.stato), "gray"))[0]

    @property
    def stato_color(self):
        return self.STATO_LABEL.get(self.stato, (str(self.stato), "gray"))[1]


class Partecipante(db.Model):
    __tablename__ = "partecipanti"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    prenotazione_id = db.Column(db.String, db.ForeignKey("prenotazioni.id", ondelete="CASCADE"), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    cognome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255))
    telefono = db.Column(db.String(30))
    codice_fiscale = db.Column(db.String(20))

    prenotazione = db.relationship("Prenotazione", back_populates="partecipanti")


class Impostazione(db.Model):
    __tablename__ = "impostazioni"

    id = db.Column(db.Integer, primary_key=True)
    chiave = db.Column(db.String(100), unique=True, nullable=False, index=True)
    valore = db.Column(db.Text)
    gruppo = db.Column(db.String(50))
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    @classmethod
    def get(cls, chiave: str, default=None):
        row = cls.query.filter_by(chiave=chiave).first()
        return row.valore if row else default

    @classmethod
    def set(cls, chiave: str, valore: str, gruppo: str = None):
        row = cls.query.filter_by(chiave=chiave).first()
        if row:
            row.valore = valore
            row.updated_at = now_utc()
        else:
            row = cls(chiave=chiave, valore=valore, gruppo=gruppo)
            db.session.add(row)


class LeadMarketing(db.Model):
    __tablename__ = "leads_marketing"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    nome = db.Column(db.String(100))
    cognome = db.Column(db.String(100))
    tags = db.Column(db.JSON, default=list)
    verificato = db.Column(db.Boolean, default=False)
    token_verifica = db.Column(db.String(255))
    token_scadenza = db.Column(db.DateTime(timezone=True))
    attivo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    ultimo_contatto = db.Column(db.DateTime(timezone=True))
