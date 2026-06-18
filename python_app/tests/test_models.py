"""
Test modelli: logica di business, validazioni, metodi.
"""
import pytest
from app.models import (
    Utente, Corso, Prenotazione, LeadMarketing, InvioMarketing,
    StatoPrenotazione, Ruolo,
)
from datetime import datetime, timezone, timedelta


class TestUtente:
    def test_password_hashing(self, db):
        u = Utente(email="hash@test.com", nome="A", cognome="B", ruolo=Ruolo.UTENTE)
        u.set_password("segreto123")
        db.session.add(u)
        db.session.flush()
        assert u.check_password("segreto123")
        assert not u.check_password("sbagliata")

    def test_is_admin_per_admin(self, admin):
        assert admin.is_admin() is True

    def test_is_admin_per_segreteria(self, segreteria):
        assert segreteria.is_admin() is True

    def test_is_admin_per_utente(self, utente):
        assert utente.is_admin() is False

    def test_nome_completo(self, db):
        u = Utente(email="nc@test.com", nome="Mario", cognome="Rossi", ruolo=Ruolo.UTENTE)
        db.session.add(u)
        db.session.flush()
        assert u.nome_completo == "Mario Rossi"

    def test_email_non_valida_default_false(self, db):
        u = Utente(email="env@test.com", nome="X", cognome="Y", ruolo=Ruolo.UTENTE)
        db.session.add(u)
        db.session.flush()
        assert u.email_non_valida is False


class TestCorso:
    def test_posti_disponibili(self, corso):
        assert corso.posti_disponibili == 10

    def test_posti_disponibili_con_occupati(self, corso, db):
        corso.posti_occupati = 3
        db.session.flush()
        assert corso.posti_disponibili == 7

    def test_corso_esaurito(self, db):
        from app.models import Corso
        c = Corso(
            titolo="Pieno",
            data_inizio=datetime.now(timezone.utc) + timedelta(days=5),
            data_fine=datetime.now(timezone.utc) + timedelta(days=6),
            posti_totali=5,
            posti_occupati=5,
            costo=0,
            pubblicato=True,
        )
        db.session.add(c)
        db.session.flush()
        assert c.posti_disponibili == 0


class TestPrenotazione:
    def _make_prenotazione(self, db, utente, corso, stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO):
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=2,
            stato=stato,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.session.add(p)
        db.session.flush()
        return p

    def test_crea_prenotazione(self, db, utente, corso):
        p = self._make_prenotazione(db, utente, corso)
        assert p.id is not None
        assert p.stato == StatoPrenotazione.IN_ATTESA_PAGAMENTO

    def test_stato_label(self, db, utente, corso):
        p = self._make_prenotazione(db, utente, corso)
        label, color = p.STATO_LABEL[p.stato]
        assert isinstance(label, str)
        assert len(label) > 0

    def test_stato_in_attesa_validazione(self, db, utente, corso):
        p = self._make_prenotazione(db, utente, corso, StatoPrenotazione.IN_ATTESA_VALIDAZIONE)
        assert p.stato == StatoPrenotazione.IN_ATTESA_VALIDAZIONE
        label, color = p.STATO_LABEL[p.stato]
        assert color == "orange"


class TestLeadMarketing:
    def test_crea_lead(self, db):
        lead = LeadMarketing(email="lead@test.com", nome="Test", attivo=True, verificato=True)
        db.session.add(lead)
        db.session.flush()
        assert lead.id is not None

    def test_email_non_valida_default_false(self, db):
        lead = LeadMarketing(email="lead2@test.com", attivo=True)
        db.session.add(lead)
        db.session.flush()
        assert lead.email_non_valida is False

    def test_marca_email_non_valida(self, db):
        lead = LeadMarketing(email="bounce@test.com", attivo=True, verificato=True)
        db.session.add(lead)
        db.session.flush()
        lead.email_non_valida = True
        db.session.flush()
        assert LeadMarketing.query.filter_by(email_non_valida=True).count() == 1


class TestInvioMarketing:
    def test_registra_invio(self, db, corso):
        inv = InvioMarketing(corso_id=corso.id, email="dest@test.com")
        db.session.add(inv)
        db.session.flush()
        assert inv.id is not None

    def test_unicita_per_corso_email(self, db, corso):
        from sqlalchemy.exc import IntegrityError
        db.session.add(InvioMarketing(corso_id=corso.id, email="dup@test.com"))
        db.session.flush()
        db.session.add(InvioMarketing(corso_id=corso.id, email="dup@test.com"))
        with pytest.raises(IntegrityError):
            db.session.flush()
