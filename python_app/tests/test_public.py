"""
Test pagine pubbliche: homepage, dettaglio corso, prenotazione.
"""
import pytest
from app.models import Prenotazione, StatoPrenotazione


class TestHomepage:
    def test_homepage_accessibile(self, client):
        r = client.get("/")
        assert r.status_code == 200

    def test_homepage_mostra_corsi_pubblicati(self, client, corso):
        r = client.get("/")
        assert r.status_code == 200
        assert corso.titolo.encode() in r.data


class TestDettaglioCorso:
    def test_dettaglio_corso_accessibile(self, client, corso):
        r = client.get(f"/corsi/{corso.id}")
        assert r.status_code == 200
        assert corso.titolo.encode() in r.data

    def test_corso_inesistente_404(self, client):
        r = client.get("/corsi/id-che-non-esiste")
        assert r.status_code == 404

    def test_corso_non_pubblicato_non_visibile(self, client, db):
        from app.models import Corso
        from datetime import datetime, timezone, timedelta
        c = Corso(
            titolo="Corso Privato",
            data_inizio=datetime.now(timezone.utc) + timedelta(days=10),
            data_fine=datetime.now(timezone.utc) + timedelta(days=11),
            posti_totali=5,
            costo=50.0,
            pubblicato=False,
        )
        db.session.add(c)
        db.session.flush()
        r = client.get(f"/corsi/{c.id}")
        assert r.status_code in (404, 302, 403)


class TestPrenotazione:
    def test_prenota_richiede_login(self, client, corso):
        r = client.post(f"/corsi/{corso.id}/prenota", data={"numero_posti": "1"}, follow_redirects=False)
        assert r.status_code in (302, 301)

    def test_prenota_crea_prenotazione(self, client_utente, corso, db):
        r = client_utente.post(f"/corsi/{corso.id}/prenota", data={
            "numero_posti": "1",
            "partecipanti-0-nome": "Mario",
            "partecipanti-0-cognome": "Rossi",
            "partecipanti-0-codice_fiscale": "RSSMRA80A01H501Z",
        }, follow_redirects=True)
        assert r.status_code == 200
        assert Prenotazione.query.count() == 1

    def test_prenota_corso_esaurito(self, client_utente, db):
        from app.models import Corso
        from datetime import datetime, timezone, timedelta
        c = Corso(
            titolo="Corso Pieno",
            data_inizio=datetime.now(timezone.utc) + timedelta(days=10),
            data_fine=datetime.now(timezone.utc) + timedelta(days=11),
            posti_totali=2,
            posti_occupati=2,
            costo=50.0,
            pubblicato=True,
        )
        db.session.add(c)
        db.session.flush()
        r = client_utente.post(f"/corsi/{c.id}/prenota", data={"numero_posti": "1"}, follow_redirects=True)
        assert r.status_code == 200
        assert Prenotazione.query.count() == 0


class TestPagineStatiche:
    def test_privacy_policy(self, client):
        r = client.get("/privacy-policy")
        assert r.status_code == 200

    def test_notifiche_corsi(self, client):
        r = client.get("/notifiche-corsi")
        assert r.status_code == 200
