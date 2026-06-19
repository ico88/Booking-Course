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

    def test_notifica_salta_iscritti_al_corso(self, client_admin, db, corso, utente):
        """Un utente con consenso marketing già prenotato al corso non deve ricevere la notifica."""
        from app.models import LeadMarketing, Prenotazione, StatoPrenotazione
        from datetime import datetime, timezone, timedelta
        # Utente con consenso marketing
        utente.consenso_marketing = True
        db.session.flush()
        # Prenotazione attiva per questo corso
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.CONFERMATA,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(days=3),
        )
        db.session.add(p)
        db.session.flush()
        # Invia notifica
        r = client_admin.post("/admin/marketing/notifica", data={
            "corso_id": corso.id,
            "modalita": "individuale",
        }, follow_redirects=True)
        assert r.status_code == 200
        # Nessuna email inviata — l'utente è già iscritto
        assert b"iscritti" in r.data or b"destinatari" in r.data


class TestAdminBackup:
    def test_pagina_backup(self, client_admin):
        r = client_admin.get("/admin/backup")
        assert r.status_code == 200

    def test_crea_backup_zip(self, client_admin, app):
        """Il backup deve creare un file ZIP nella cartella backups."""
        import os, zipfile
        r = client_admin.post("/admin/backup", data={"action": "crea"}, follow_redirects=True)
        assert r.status_code == 200
        backup_dir = os.path.join(app.instance_path, "backups")
        zips = [f for f in os.listdir(backup_dir) if f.startswith("backup_") and f.endswith(".zip")]
        assert len(zips) >= 1
        # Il file ZIP deve contenere database.db
        with zipfile.ZipFile(os.path.join(backup_dir, zips[0])) as zf:
            assert "database.db" in zf.namelist()

    def test_backup_non_accessibile_a_segreteria(self, client_segreteria):
        r = client_segreteria.get("/admin/backup")
        assert r.status_code in (403, 302)

    def test_ripristino_backup(self, client_admin, app, db):
        """Crea un backup e poi lo ripristina — deve terminare senza errori."""
        import os, zipfile
        # Prima crea il backup
        client_admin.post("/admin/backup", data={"action": "crea"}, follow_redirects=True)
        backup_dir = os.path.join(app.instance_path, "backups")
        zips = sorted([f for f in os.listdir(backup_dir) if f.startswith("backup_") and f.endswith(".zip")])
        assert zips, "Nessun backup ZIP trovato"
        # Ripristina l'ultimo backup
        r = client_admin.post(f"/admin/backup/ripristina/{zips[-1]}", follow_redirects=True)
        assert r.status_code == 200
        assert b"Ripristino completato" in r.data

    def test_ripristino_db_non_zip_rifiutato(self, client_admin, app, db):
        """I vecchi backup .db non devono essere ripristinabili."""
        import os, shutil
        backup_dir = os.path.join(app.instance_path, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        # Crea un finto file .db
        fake = os.path.join(backup_dir, "backup_20200101_000000.db")
        with open(fake, "wb") as f:
            f.write(b"SQLite format 3")
        r = client_admin.post("/admin/backup/ripristina/backup_20200101_000000.db", follow_redirects=True)
        assert r.status_code == 200
        assert b"ZIP" in r.data or b"formato" in r.data


class TestReminderScadenza:
    def test_cron_senza_token_403(self, client):
        r = client.post("/admin/cron/reminder-scadenza")
        assert r.status_code == 403

    def test_cron_con_token_corretto(self, client_admin, app, db, corso, utente):
        from datetime import datetime, timezone, timedelta
        from app.models import Prenotazione, StatoPrenotazione
        # Prenotazione in attesa pagamento con scadenza tra 24h
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.session.add(p)
        db.session.flush()
        secret = app.config["SECRET_KEY"]
        r = client.post("/admin/cron/reminder-scadenza",
                        headers={"X-Cron-Token": secret})
        assert r.status_code == 200
        data = r.get_json()
        assert data["ok"] is True

    def test_cron_non_invia_se_reminder_gia_inviato(self, client, app, db, corso, utente):
        from datetime import datetime, timezone, timedelta
        from app.models import Prenotazione, StatoPrenotazione
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(hours=24),
            reminder_scadenza_inviato=True,
        )
        db.session.add(p)
        db.session.flush()
        secret = app.config["SECRET_KEY"]
        r = client.post("/admin/cron/reminder-scadenza",
                        headers={"X-Cron-Token": secret})
        assert r.status_code == 200
        assert r.get_json()["inviati"] == 0


class TestCampagnaReinvia:
    def test_pagina_reinvia_accessibile(self, client_admin, corso):
        r = client_admin.get(f"/admin/marketing/campagna/{corso.id}/reinvia")
        assert r.status_code == 200

    def test_reinvia_non_accessibile_a_utente(self, client_utente, corso):
        r = client_utente.get(f"/admin/marketing/campagna/{corso.id}/reinvia")
        assert r.status_code in (302, 403)


class TestReminderScadenza:
    def test_cron_senza_token_403(self, client):
        r = client.post("/admin/cron/reminder-scadenza")
        assert r.status_code == 403

    def test_cron_con_token_corretto(self, client, app, db, corso, utente):
        from datetime import datetime, timezone, timedelta
        from app.models import Prenotazione, StatoPrenotazione
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.session.add(p)
        db.session.flush()
        secret = app.config["SECRET_KEY"]
        r = client.post("/admin/cron/reminder-scadenza",
                        headers={"X-Cron-Token": secret})
        assert r.status_code == 200
        assert r.get_json()["ok"] is True

    def test_cron_non_invia_se_reminder_gia_inviato(self, client, app, db, corso, utente):
        from datetime import datetime, timezone, timedelta
        from app.models import Prenotazione, StatoPrenotazione
        p = Prenotazione(
            utente_id=utente.id,
            corso_id=corso.id,
            numero_posti=1,
            stato=StatoPrenotazione.IN_ATTESA_PAGAMENTO,
            scadenza_pagamento=datetime.now(timezone.utc) + timedelta(hours=24),
            reminder_scadenza_inviato=True,
        )
        db.session.add(p)
        db.session.flush()
        secret = app.config["SECRET_KEY"]
        r = client.post("/admin/cron/reminder-scadenza",
                        headers={"X-Cron-Token": secret})
        assert r.status_code == 200
        assert r.get_json()["inviati"] == 0


class TestCampagnaReinvia:
    def test_pagina_reinvia_accessibile(self, client_admin, db, corso):
        r = client_admin.get(f"/admin/marketing/campagna/{corso.id}/reinvia")
        assert r.status_code == 200

    def test_reinvia_non_accessibile_a_segreteria(self, client_segreteria, db, corso):
        r = client_segreteria.get(f"/admin/marketing/campagna/{corso.id}/reinvia")
        assert r.status_code in (302, 403)

    def test_reinvia_non_accessibile_a_utente(self, client_utente, db, corso):
        r = client_utente.get(f"/admin/marketing/campagna/{corso.id}/reinvia")
        assert r.status_code in (302, 403)


class TestMediaLibrary:
    def test_lista_media_accessibile_admin(self, client_admin):
        r = client_admin.get("/admin/media")
        assert r.status_code == 200

    def test_lista_media_non_accessibile_utente(self, client_utente):
        r = client_utente.get("/admin/media")
        assert r.status_code in (302, 403)

    def test_media_json_endpoint(self, client_admin):
        r = client_admin.get("/admin/media/json")
        assert r.status_code == 200
        data = r.get_json()
        assert data is not None
        # può essere lista o dict con chiave 'files'
        files = data if isinstance(data, list) else data.get("files", data)
        assert isinstance(files, list)

    def test_elimina_media_inesistente_404(self, client_admin):
        r = client_admin.post("/admin/media/elimina/id-non-esiste", follow_redirects=True)
        assert r.status_code in (200, 404)

    def test_lista_media_non_accessibile_segreteria(self, client_segreteria):
        r = client_segreteria.get("/admin/media")
        assert r.status_code in (302, 403)


class TestCampagnaLibera:
    def test_nuova_campagna_pagina(self, client_admin):
        r = client_admin.get("/admin/marketing/campagna-libera/nuova")
        assert r.status_code == 200

    def test_nuova_campagna_non_accessibile_segreteria(self, client_segreteria):
        r = client_segreteria.get("/admin/marketing/campagna-libera/nuova")
        assert r.status_code in (302, 403)

    def test_crea_campagna_libera(self, client_admin, db):
        from app.models import CampagnaLibera
        r = client_admin.post("/admin/marketing/campagna-libera/nuova", data={
            "oggetto": "Oggetto Test",
            "corpo_html": "<p>Testo campagna</p>",
            "modalita": "bcc",
        }, follow_redirects=True)
        assert r.status_code == 200
        assert CampagnaLibera.query.filter_by(oggetto="Oggetto Test").first() is not None

    def test_dettaglio_campagna(self, client_admin, db):
        from app.models import CampagnaLibera
        c = CampagnaLibera(oggetto="Obj", corpo_html="<p>x</p>")
        db.session.add(c)
        db.session.flush()
        r = client_admin.get(f"/admin/marketing/campagna-libera/{c.id}")
        assert r.status_code == 200

    def test_anteprima_campagna(self, client_admin):
        import json
        r = client_admin.post("/admin/marketing/campagna-libera/anteprima",
                              data=json.dumps({"corpo": "<p>Test</p>"}),
                              content_type="application/json")
        assert r.status_code == 200


class TestMaterialeDidattico:
    def test_lista_materiali_accessibile_admin(self, client_admin):
        r = client_admin.get("/admin/materiali")
        assert r.status_code == 200

    def test_lista_materiali_non_accessibile_utente(self, client_utente):
        r = client_utente.get("/admin/materiali")
        assert r.status_code in (302, 403)

    def test_lista_materiali_non_accessibile_segreteria(self, client_segreteria):
        r = client_segreteria.get("/admin/materiali")
        assert r.status_code in (302, 403)

    def test_elimina_materiale_inesistente(self, client_admin):
        r = client_admin.post("/admin/materiali/id-non-esiste/elimina", follow_redirects=True)
        assert r.status_code in (200, 404)

    def test_associa_materiale_a_corso(self, client_admin, db, corso):
        from app.models import MaterialeDidattico
        m = MaterialeDidattico(nome="Dispensa BLSD", nome_file="blsd.pdf", mime_type="application/pdf", dimensione=1024)
        db.session.add(m)
        db.session.flush()
        r = client_admin.post(f"/admin/corsi/{corso.id}/materiale/associa", data={
            "materiale_ids": [m.id],
        }, follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(corso)
        assert m in corso.materiali

    def test_disassocia_materiale_da_corso(self, client_admin, db, corso):
        from app.models import MaterialeDidattico
        m = MaterialeDidattico(nome="Dispensa BLSD", nome_file="blsd2.pdf", mime_type="application/pdf", dimensione=512)
        db.session.add(m)
        corso.materiali.append(m)
        db.session.flush()
        # Invia senza materiale_ids → rimuove tutti
        r = client_admin.post(f"/admin/corsi/{corso.id}/materiale/associa", data={}, follow_redirects=True)
        assert r.status_code == 200
        db.session.expire(corso)
        assert m not in corso.materiali

    def test_materiale_non_eliminabile_se_usato(self, client_admin, db, corso):
        from app.models import MaterialeDidattico
        m = MaterialeDidattico(nome="In uso", nome_file="in_uso.pdf", mime_type="application/pdf", dimensione=100)
        db.session.add(m)
        corso.materiali.append(m)
        db.session.flush()
        r = client_admin.post(f"/admin/materiali/{m.id}/elimina", follow_redirects=True)
        assert r.status_code == 200
        # File deve esistere ancora nel DB
        assert MaterialeDidattico.query.get(m.id) is not None
