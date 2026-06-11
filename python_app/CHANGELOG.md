# Changelog

## [1.1.0] — 2026-06-11

### Nuove funzionalità

- **Tag newsletter con nome e slug**: ogni tag ha un nome visualizzato per gli iscritti (es. "Corsi BLSD") e uno slug interno per il filtraggio (es. `fulld`). Gestibile da Marketing → Gestione Tag nel formato `Nome | slug`.
- **Sidebar admin responsive**: su mobile la sidebar è nascosta di default; un pulsante hamburger nella topbar la apre come drawer con overlay. Su desktop il layout rimane invariato.
- **Manuale utente integrato**: guida in-app accessibile da admin, segreteria e utenti, con contenuto differenziato per ruolo.
- **Changelog e versione**: numero di versione visibile nel pannello admin; pagina changelog accessibile solo agli amministratori.
- **Test email migliorato**: il campo destinatario è ora personalizzabile nella tab Email delle impostazioni; il redirect dopo l'invio torna correttamente alla tab Email.
- `reset_admin.sh`: script per reimpostare la password admin da shell senza accedere all'app.
- `uninstall_python.sh`: script per disinstallazione completa con backup opzionale del database.

### Fix

- **Logo su Ubuntu Server**: il logo non veniva servito correttamente da nginx quando l'app era installata sotto `/home/`. Fix: percorso salvato relativo a `static/` e risolto con `url_for('static', ...)`. Aggiornati i permessi `uploads/` a 755 con `chmod 644` esplicito su ogni file caricato.
- **Percorso installazione**: installer e updater ora usano `/opt/booking-corsi/` come percorso raccomandato (world-traversable, nessun ACL hack necessario). Warning se si installa fuori da `/opt`.
- **update_python.sh**: rimossa la riga `export $(grep .env | xargs)` che causava errori silenziosi; aggiunto check esplicito della presenza di `.env` con rigenerazione automatica se mancante; `APP_DIR` ora letto dal servizio systemd installato come fonte di verità.
- **Bottoni email**: aggiunto `style` inline su tutti i `<a class="btn">` per garantire testo bianco anche in Gmail (che ignora i CSS nelle `<style>`).
- **Preview logo nelle impostazioni**: usava il path grezzo del DB invece di `logo_url` dal context processor.

---

## [1.0.0] — 2026-06-09

### Riscrittura completa in Python

Il progetto è stato riscritto da zero in Python per eliminare i problemi di
compatibilità di Next.js su VPS con kernel che bloccano `mmap(PROT_EXEC)`.

**Stack tecnico:**
- **Python 3.11** + **Flask 3.1**
- **SQLAlchemy** + **Flask-Migrate**
- **Flask-Login**
- **Gunicorn** + **Nginx**
- **Jinja2** + **Tailwind CSS via CDN**

### Funzionalità implementate

**Autenticazione:** login/logout, registrazione, reset password, rate limiting, ruoli UTENTE/SEGRETERIA/ADMIN.

**Area pubblica:** catalogo corsi, prenotazione, iscrizione newsletter con verifica email, disiscrizione, pagine legali editabili.

**Dashboard utente:** prenotazioni, upload ricevuta, pagamento Stripe/PayPal, download attestato, gestione profilo.

**Pannello admin:** dashboard statistiche, CRUD corsi, gestione prenotazioni, attestati, utenti, marketing leads, impostazioni SMTP/pagamenti/logo, backup database.

**Email:** benvenuto, conferma prenotazione, notifica ricevuta, conferma segreteria, attestato, reset password, marketing, verifica lead.

**Infrastruttura:** `install_python.sh`, `update_python.sh`, systemd, nginx, Flask-Migrate.
