"""
Test area utente: dashboard, prenotazioni, dati personali.
"""
import pytest
from app.models import Prenotazione, StatoPrenotazione
from datetime import datetime, timezone, timedelta


def _make_prenotazione(db, utente, corso, stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO):
    p = Prenotazione(
        utente_id=utente.id,
        corso_id=corso.id,
        numero_posti=1,
        stato=stato,
        scadenza_pagamento=datetime.now(timezone.utc) + timedelta(days=3),
    )
    db.session.add(p)
    db.session.flush()
    return p


class TestDashboard:
    def test_dashboard_accessibile(self, client_utente):
        r = client_utente.get("/dashboard/")
        assert r.status_code == 200

    def test_dashboard_mostra_prenotazioni(self, client_utente, db, utente, corso):
        p = _make_prenotazione(db, utente, corso)
        r = client_utente.get("/dashboard/")
        assert r.status_code == 200
        assert corso.titolo.encode() in r.data

    def test_dettaglio_prenotazione_utente(self, client_utente, db, utente, corso):
        p = _make_prenotazione(db, utente, corso)
        r = client_utente.get(f"/dashboard/prenotazioni/{p.id}")
        assert r.status_code == 200

    def test_utente_non_vede_prenotazione_altrui(self, client_utente, db, admin, corso, utente):
        p = _make_prenotazione(db, admin, corso)
        r = client_utente.get(f"/dashboard/prenotazioni/{p.id}")
        assert r.status_code in (403, 404, 302)

    def test_carica_ricevuta_richiede_login(self, client, db, utente, corso):
        p = _make_prenotazione(db, utente, corso)
        r = client.post(f"/dashboard/prenotazioni/{p.id}/upload", follow_redirects=False)
        assert r.status_code in (302, 301)


class TestDatiPersonali:
    def test_pagina_dati_personali(self, client_utente):
        r = client_utente.get("/dashboard/dati-personali")
        assert r.status_code == 200

    def test_aggiorna_dati_personali(self, client_utente, utente, db):
        r = client_utente.post("/dashboard/dati-personali", data={
            "nome": "Mario",
            "cognome": "Verdi",
            "telefono": "3331234567",
            "codice_fiscale": "",
        }, follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(utente)
        assert utente.cognome == "Verdi"
