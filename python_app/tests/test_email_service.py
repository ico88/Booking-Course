"""
Test email_service: bounce detection, send_email_bulk con SMTP mockato.
"""
import smtplib
import pytest
from unittest.mock import MagicMock, patch, call


class TestSendEmailBulk:
    """Testa send_email_bulk senza una connessione SMTP reale."""

    def _make_smtp_mock(self):
        mock = MagicMock()
        mock.__enter__ = lambda s: s
        mock.__exit__ = MagicMock(return_value=False)
        return mock

    def test_ritorna_zero_se_smtp_non_configurato(self, app):
        with app.app_context():
            from app.email_service import send_email_bulk
            from app.models import Impostazione
            # Nessuna configurazione SMTP → (0, [])
            with patch("app.email_service._get_smtp_config", return_value={
                "host": "", "port": 587, "user": "", "password": "",
                "from_name": "Test", "from_addr": "",
            }):
                sent, bounced = send_email_bulk([("a@b.com", "sub", "<p>test</p>")])
        assert sent == 0
        assert bounced == []

    def test_invia_messaggio_singolo(self, app):
        with app.app_context():
            from app.email_service import send_email_bulk
            smtp_mock = self._make_smtp_mock()
            with patch("smtplib.SMTP", return_value=smtp_mock), \
                 patch("app.email_service._get_smtp_config", return_value={
                     "host": "smtp.test", "port": 587,
                     "user": "u@test.com", "password": "pass",
                     "from_name": "Test", "from_addr": "u@test.com",
                 }):
                sent, bounced = send_email_bulk([("dest@test.com", "Sub", "<p>body</p>")])
        assert sent == 1
        assert bounced == []

    def test_bounce_5xx_marcato(self, app):
        """Un SMTPRecipientsRefused con codice 550 finisce in bounced."""
        with app.app_context():
            from app.email_service import send_email_bulk
            smtp_mock = self._make_smtp_mock()
            smtp_mock.sendmail.side_effect = smtplib.SMTPRecipientsRefused(
                {"bad@test.com": (550, b"User unknown")}
            )
            with patch("smtplib.SMTP", return_value=smtp_mock), \
                 patch("app.email_service._get_smtp_config", return_value={
                     "host": "smtp.test", "port": 587,
                     "user": "u@test.com", "password": "pass",
                     "from_name": "Test", "from_addr": "u@test.com",
                 }):
                sent, bounced = send_email_bulk([("bad@test.com", "Sub", "<p>body</p>")])
        assert sent == 0
        assert "bad@test.com" in bounced

    def test_bounce_4xx_non_marcato(self, app):
        """Un errore temporaneo 4xx NON finisce in bounced (non è permanente)."""
        with app.app_context():
            from app.email_service import send_email_bulk
            smtp_mock = self._make_smtp_mock()
            smtp_mock.sendmail.side_effect = smtplib.SMTPRecipientsRefused(
                {"tmp@test.com": (421, b"Service unavailable")}
            )
            with patch("smtplib.SMTP", return_value=smtp_mock), \
                 patch("app.email_service._get_smtp_config", return_value={
                     "host": "smtp.test", "port": 587,
                     "user": "u@test.com", "password": "pass",
                     "from_name": "Test", "from_addr": "u@test.com",
                 }):
                sent, bounced = send_email_bulk([("tmp@test.com", "Sub", "<p>body</p>")])
        assert sent == 0
        assert bounced == []

    def test_invio_multiplo_con_bounce_misto(self, app):
        """2 email ok + 1 bounce → sent=2, bounced=['bad@test.com']."""
        with app.app_context():
            from app.email_service import send_email_bulk

            def sendmail_side_effect(from_addr, to_list, msg):
                if to_list == ["bad@test.com"]:
                    raise smtplib.SMTPRecipientsRefused({"bad@test.com": (550, b"No such user")})

            smtp_mock = self._make_smtp_mock()
            smtp_mock.sendmail.side_effect = sendmail_side_effect

            messages = [
                ("ok1@test.com", "Sub", "<p>ok</p>"),
                ("bad@test.com", "Sub", "<p>bad</p>"),
                ("ok2@test.com", "Sub", "<p>ok</p>"),
            ]
            with patch("smtplib.SMTP", return_value=smtp_mock), \
                 patch("app.email_service._get_smtp_config", return_value={
                     "host": "smtp.test", "port": 587,
                     "user": "u@test.com", "password": "pass",
                     "from_name": "Test", "from_addr": "u@test.com",
                 }):
                sent, bounced = send_email_bulk(messages)

        assert sent == 2
        assert bounced == ["bad@test.com"]
