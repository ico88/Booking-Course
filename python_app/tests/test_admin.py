"""
Test pannello admin: corsi, prenotazioni, utenti, marketing.
"""
import pytest
from app.models import Corso, Utente, Prenotazione, StatoPrenotazione, LeadMarketing


class TestAdminCorsi:
    def test_lista_corsi(self, client_admin):
        r = client_admin.get("/admin/corsi")
        assert r.status_code == 200

    def test_crea_corso(self, client_admin, db):
        from datetime import datetime, timezone, timedelta
        r = client_admin.post("/admin/corsi/nuovo", data={
            "titolo": "Nuovo Corso Admin",
            "descrizione": "<p>Test</p>",
            "data_inizio": (datetime.now(timezone.utc) + timedelta(days=10)).strftime("%Y-%m-%dT%H:%M"),
            "data_fine": (datetime.now(timezone.utc) + timedelta(days=11)).strftime("%Y-%m-%dT%H:%M"),
            "luogo": "Aula 1",
            "posti_totali": "20",
            "costo": "150.00",
            "pubblicato": "y",
        }, follow_redirects=True)
        assert r.status_code == 200
        assert Corso.query.filter_by(titolo="Nuovo Corso Admin").first() is not None

    def test_modifica_corso(self, client_admin, corso, db):
        r = client_admin.post(f"/admin/corsi/{corso.id}", data={
            "titolo": "Titolo Modificato",
            "descrizione": "<p>Aggiornato</p>",
            "data_inizio": corso.data_inizio.strftime("%Y-%m-%dT%H:%M"),
            "data_fine": corso.data_fine.strftime("%Y-%m-%dT%H:%M"),
            "luogo": corso.luogo or "Aula",
            "posti_totali": "10",
            "costo": "100.00",
            "pubblicato": "y",
        }, follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(corso)
        assert corso.titolo == "Titolo Modificato"

    def test_elimina_corso(self, client_admin, corso, db):
        corso_id = corso.id
        r = client_admin.post(f"/admin/corsi/{corso_id}", data={"_action": "delete"}, follow_redirects=True)
        assert r.status_code == 200
        assert Corso.query.get(corso_id) is None

    def test_accesso_negato_a_utente(self, client_utente):
        r = client_utente.get("/admin/corsi")
        assert r.status_code in (403, 302)


class TestAdminPrenotazioni:
    def test_lista_prenotazioni(self, client_admin):
        r = client_admin.get("/admin/prenotazioni")
        assert r.status_code == 200

    def test_dettaglio_prenotazione(self, client_admin, db, corso, utente):
        from datetime import datetime, timezone, timedelta
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.session.add(p)
        db.session.flush()
        r = client_admin.get(f"/admin/prenotazioni/{p.id}")
        assert r.status_code == 200

    def test_conferma_prenotazione(self, client_admin, db, corso, utente):
        from datetime import datetime, timezone, timedelta
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.PAGAMENTO_CARICATO,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.session.add(p)
        db.session.flush()
        r = client_admin.post(f"/admin/prenotazioni/{p.id}/conferma", follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(p)
        assert p.stato == StatoPrenotazione.CONFERMATA


class TestAdminUtenti:
    def test_lista_utenti(self, client_admin):
        r = client_admin.get("/admin/utenti")
        assert r.status_code == 200

    def test_disattiva_utente(self, client_admin, utente, db):
        r = client_admin.post(f"/admin/utenti/{utente.id}/disattiva", follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(utente)
        assert utente.attivo is False

    def test_riattiva_utente(self, client_admin, utente, db):
        utente.attivo = False
        db.session.flush()
        r = client_admin.post(f"/admin/utenti/{utente.id}/disattiva", follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(utente)
        assert utente.attivo is True


class TestAdminMarketing:
    def test_pagina_marketing(self, client_admin):
        r = client_admin.get("/admin/marketing")
        assert r.status_code == 200

    def test_statistiche(self, client_admin):
        r = client_admin.get("/admin/statistiche")
        assert r.status_code == 200

    def test_accesso_marketing_segreteria(self, client_segreteria):
        r = client_segreteria.get("/admin/marketing")
        assert r.status_code == 200
