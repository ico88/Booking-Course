import uuid
import enum
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
import bcrypt
from sqlalchemy import event, types
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


class TZDateTime(types.TypeDecorator):
    """DateTime che funziona correttamente sia con SQLite (naive) che con altri DB (aware)."""
    impl = types.DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, datetime):
            # Converte in naive UTC per SQLite
            if value.tzinfo is not None:
                value = value.astimezone(timezone.utc).replace(tzinfo=None)
            return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value)
            except (ValueError, TypeError):
                return None
        # Aggiunge UTC se naive
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


# ---------------------------------------------------------------------------
# Enum types
# ---------------------------------------------------------------------------

class Ruolo(str, enum.Enum):
    UTENTE = "UTENTE"
    SEGRETERIA = "SEGRETERIA"
    ADMIN = "ADMIN"


class StatoPrenotazione(str, enum.Enum):
    IN_ATTESA_VALIDAZIONE = "IN_ATTESA_VALIDAZIONE"
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
    email_verificata = db.Column(TZDateTime)
    token_reset = db.Column(db.String(255))
    scadenza_token = db.Column(TZDateTime)
    consenso_privacy = db.Column(db.Boolean, default=False)
    consenso_marketing = db.Column(db.Boolean, default=False)
    email_non_valida = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    tags_marketing = db.Column(db.JSON, default=list)
    data_consenso = db.Column(TZDateTime)
    attivo = db.Column(db.Boolean, default=True, server_default="1", nullable=False)
    created_at = db.Column(TZDateTime, default=now_utc)
    updated_at = db.Column(TZDateTime, default=now_utc, onupdate=now_utc)

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
    data_inizio = db.Column(TZDateTime)
    data_fine = db.Column(TZDateTime)
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
    validazione_preventiva = db.Column(db.Boolean, default=False)
    descrizione_prerequisito = db.Column(db.String(500))
    ultima_notifica_marketing = db.Column(TZDateTime)
    ultima_notifica_leads = db.Column(TZDateTime)
    created_at = db.Column(TZDateTime, default=now_utc)
    updated_at = db.Column(TZDateTime, default=now_utc, onupdate=now_utc)

    prenotazioni = db.relationship("Prenotazione", back_populates="corso", lazy="dynamic")
    materiali = db.relationship("MaterialeDidattico", secondary="corso_materiale", back_populates="corsi")

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
    scadenza_pagamento = db.Column(TZDateTime)
    metodo_pagamento = db.Column(db.Enum(MetodoPagamento))
    id_transazione = db.Column(db.String(255))
    importo_pagato = db.Column(db.Numeric(10, 2))
    url_contabile = db.Column(db.String(500))
    nome_file_contabile = db.Column(db.String(255))
    note = db.Column(db.Text)
    note_segreteria = db.Column(db.Text)
    prerequisito_url = db.Column(db.String(500))
    prerequisito_nome_file = db.Column(db.String(255))
    note_rifiuto = db.Column(db.Text)
    attestato_url = db.Column(db.String(500))
    attestato_emesso = db.Column(db.Boolean, default=False)
    attestato_emesso_at = db.Column(TZDateTime)
    reminder_scadenza_inviato = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    reminder_scadenza_inviato_at = db.Column(TZDateTime)
    created_at = db.Column(TZDateTime, default=now_utc)
    updated_at = db.Column(TZDateTime, default=now_utc, onupdate=now_utc)

    utente = db.relationship("Utente", back_populates="prenotazioni")
    corso = db.relationship("Corso", back_populates="prenotazioni")
    partecipanti = db.relationship("Partecipante", back_populates="prenotazione", cascade="all, delete-orphan")

    @property
    def importo_totale(self):
        if self.corso:
            return float(self.corso.costo) * (self.numero_posti or 1)
        return 0.0

    STATO_LABEL = {
        StatoPrenotazione.IN_ATTESA_VALIDAZIONE: ("In attesa di validazione", "orange"),
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
    created_at = db.Column(TZDateTime, default=now_utc)
    updated_at = db.Column(TZDateTime, default=now_utc, onupdate=now_utc)

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
    token_scadenza = db.Column(TZDateTime)
    attivo = db.Column(db.Boolean, default=True)
    email_non_valida = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(TZDateTime, default=now_utc)
    updated_at = db.Column(TZDateTime, default=now_utc, onupdate=now_utc)
    ultimo_contatto = db.Column(TZDateTime)


class InvioMarketing(db.Model):
    """Traccia le email marketing già inviate per corso, per evitare duplicati."""
    __tablename__ = "invii_marketing"
    __table_args__ = (db.UniqueConstraint("corso_id", "email", name="uq_invio_corso_email"),)

    id = db.Column(db.String, primary_key=True, default=gen_id)
    corso_id = db.Column(db.String, db.ForeignKey("corsi.id", ondelete="CASCADE"), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    inviato_at = db.Column(TZDateTime, default=now_utc)


class MediaFile(db.Model):
    __tablename__ = "media_files"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    nome = db.Column(db.String(255), nullable=False)
    nome_file = db.Column(db.String(255), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # "immagine" | "documento"
    mime_type = db.Column(db.String(100))
    dimensione = db.Column(db.Integer)  # bytes
    url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(TZDateTime, default=now_utc)
    uploaded_by = db.Column(db.String, db.ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True)


class CampagnaLibera(db.Model):
    __tablename__ = "campagne_libere"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    oggetto = db.Column(db.String(255), nullable=False)
    corpo_html = db.Column(db.Text, nullable=False)
    tag_filtro = db.Column(db.Text)  # JSON list di slug, None = tutti
    allegato_id = db.Column(db.String, db.ForeignKey("media_files.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(TZDateTime, default=now_utc)
    creato_da = db.Column(db.String, db.ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True)

    allegato = db.relationship("MediaFile", foreign_keys=[allegato_id])
    invii = db.relationship("InvioCampagnaLibera", backref="campagna", lazy="dynamic",
                            cascade="all, delete-orphan")

    @property
    def tag_filtro_list(self):
        import json
        if not self.tag_filtro:
            return []
        try:
            return json.loads(self.tag_filtro)
        except Exception:
            return []

    @property
    def n_inviati(self):
        return self.invii.count()


class InvioCampagnaLibera(db.Model):
    __tablename__ = "invii_campagne_libere"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    campagna_id = db.Column(db.String, db.ForeignKey("campagne_libere.id", ondelete="CASCADE"), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    inviato_at = db.Column(TZDateTime, default=now_utc)


class VisitaCorso(db.Model):
    __tablename__ = "visite_corso"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    corso_id = db.Column(db.String, db.ForeignKey("corsi.id", ondelete="CASCADE"), nullable=False, index=True)
    visitato_at = db.Column(TZDateTime, default=now_utc, index=True)
    ip_hash = db.Column(db.String(64))  # SHA256 of IP, anonymized
    utente_id = db.Column(db.String, db.ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True)


class MaterialeDidattico(db.Model):
    """Libreria centralizzata di materiale didattico riutilizzabile su più corsi."""
    __tablename__ = "materiale_didattico"

    id = db.Column(db.String, primary_key=True, default=gen_id)
    nome = db.Column(db.String(255), nullable=False)
    nome_file = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100))
    dimensione = db.Column(db.Integer)
    created_at = db.Column(TZDateTime, default=now_utc)
    uploaded_by = db.Column(db.String, db.ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True)

    corsi = db.relationship("Corso", secondary="corso_materiale", back_populates="materiali")


# Join table corso ↔ materiale didattico
corso_materiale = db.Table(
    "corso_materiale",
    db.Column("corso_id", db.String, db.ForeignKey("corsi.id", ondelete="CASCADE"), primary_key=True),
    db.Column("materiale_id", db.String, db.ForeignKey("materiale_didattico.id", ondelete="CASCADE"), primary_key=True),
    db.Column("aggiunto_at", TZDateTime, default=now_utc),
)
