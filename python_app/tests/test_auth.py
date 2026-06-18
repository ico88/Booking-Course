"""
Test autenticazione: registrazione, login, logout, accesso protetto.
"""
import pytest
from app.models import Utente, Ruolo


class TestLogin:
    def test_login_page_accessibile(self, client):
        r = client.get("/auth/login")
        assert r.status_code == 200

    def test_login_corretto(self, client, utente):
        r = client.post("/auth/login", data={"email": utente.email, "password": "Password1!"}, follow_redirects=True)
        assert r.status_code == 200
        assert b"Logout" in r.data or b"dashboard" in r.data.lower()

    def test_login_password_errata(self, client, utente):
        r = client.post("/auth/login", data={"email": utente.email, "password": "sbagliata"}, follow_redirects=True)
        assert r.status_code == 200
        assert b"Logout" not in r.data

    def test_login_email_inesistente(self, client):
        r = client.post("/auth/login", data={"email": "nessuno@test.com", "password": "qualcosa"}, follow_redirects=True)
        assert r.status_code == 200
        assert b"Logout" not in r.data

    def test_logout(self, client_utente):
        r = client_utente.get("/auth/logout", follow_redirects=True)
        assert r.status_code == 200

    def test_utente_disattivato_non_accede(self, client, utente, db):
        utente.attivo = False
        db.session.flush()
        r = client.post("/auth/login", data={"email": utente.email, "password": "Password1!"}, follow_redirects=True)
        assert b"Logout" not in r.data


class TestRegistrazione:
    def test_pagina_registrazione_accessibile(self, client):
        r = client.get("/auth/registrazione")
        assert r.status_code == 200

    def test_registrazione_nuovo_utente(self, client, db):
        from unittest.mock import patch
        # validate_email_address fa DNS lookup — lo patchiamo in test
        with patch("app.auth.routes.validate_email_address", return_value="nuovo@example.com"):
            r = client.post("/auth/registrazione", data={
                "nome": "Mario",
                "cognome": "Rossi",
                "email": "nuovo@example.com",
                "password": "Password1!",
                "conferma_password": "Password1!",
                "consenso_privacy": "on",
                "eta_minima": "on",
            }, follow_redirects=True)
        assert r.status_code == 200
        assert Utente.query.filter_by(email="nuovo@example.com").first() is not None

    def test_registrazione_email_duplicata(self, client, utente):
        from unittest.mock import patch
        with patch("app.auth.routes.validate_email_address", return_value=utente.email):
            r = client.post("/auth/registrazione", data={
                "nome": "Mario",
                "cognome": "Rossi",
                "email": utente.email,
                "password": "Password1!",
                "conferma_password": "Password1!",
                "consenso_privacy": "on",
                "eta_minima": "on",
            }, follow_redirects=True)
        assert r.status_code == 200
        assert Utente.query.filter_by(email=utente.email).count() == 1


class TestAccessoProtetto:
    def test_dashboard_richiede_login(self, client):
        r = client.get("/dashboard/", follow_redirects=False)
        assert r.status_code in (302, 301)

    def test_admin_richiede_login(self, client):
        r = client.get("/admin/", follow_redirects=False)
        assert r.status_code in (302, 301)

    def test_utente_normale_non_accede_admin(self, client_utente):
        r = client_utente.get("/admin/", follow_redirects=False)
        # utente normale deve essere redirectato o ricevere 403
        assert r.status_code in (403, 302, 301)

    def test_admin_accede_admin(self, client_admin):
        r = client_admin.get("/admin/", follow_redirects=True)
        assert r.status_code == 200
