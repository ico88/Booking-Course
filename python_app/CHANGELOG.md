# Changelog

## [1.0.0] — 2026-06-09

### Riscrittura completa in Python

Il progetto è stato riscritto da zero in Python per eliminare i problemi di
compatibilità di Next.js su VPS con kernel che bloccano `mmap(PROT_EXEC)`.

**Stack tecnico:**
- **Python 3.11** + **Flask 3.1** (framework web)
- **SQLAlchemy** + **Flask-Migrate** (ORM e migrazioni DB)
- **Flask-Login** (autenticazione sessioni)
- **PostgreSQL** (database, invariato)
- **Gunicorn** (server WSGI produzione)
- **Nginx** (reverse proxy)
- **Jinja2** (template HTML server-side)
- **Tailwind CSS via CDN** (stili, zero build step)

### Funzionalità implementate

**Autenticazione:**
- Login/logout con sessione sicura
- Registrazione con consenso privacy
- Reset password via email con token (scade in 1 ora)
- Rate limiting login (10 tentativi / 15 min per IP)
- Ruoli: UTENTE, SEGRETERIA, ADMIN

**Area pubblica:**
- Homepage con catalogo corsi pubblicati
- Pagina dettaglio corso con informazioni complete
- Form prenotazione con inserimento partecipanti
- Iscrizione notifiche marketing (lead)
- Verifica email lead con token
- Disiscrizione notifiche
- Pagine legali (Privacy, Cookie, Termini) editabili dall'admin

**Dashboard utente:**
- Lista prenotazioni con stati
- Dettaglio prenotazione
- Upload ricevuta bonifico
- Pagamento Stripe (carta di credito)
- Pagamento PayPal
- Download attestato
- Gestione dati personali e password
- Cancellazione account

**Pannello admin:**
- Dashboard con statistiche
- CRUD corsi (crea, modifica, elimina, duplica)
- Upload immagine corso
- Lista partecipanti per corso
- Lista e filtro prenotazioni
- Conferma / annullamento prenotazioni
- Emissione attestati (HTML generato automaticamente)
- Gestione utenti (crea, elimina, cambio ruolo)
- Marketing leads (lista, importa CSV, invia notifica corso, elimina)
- Impostazioni di sistema (SMTP, Stripe, PayPal, logo)
- Editor pagine legali
- Backup database (pg_dump)

**Email transazionali:**
- Benvenuto nuovo utente
- Conferma prenotazione con dettagli pagamento
- Notifica ricevuta caricata
- Conferma prenotazione da segreteria
- Attestato disponibile
- Reset password
- Notifica segreteria (nuove prenotazioni)
- Email marketing corsi ai lead
- Verifica email lead

**Pagamenti:**
- Bonifico bancario con upload ricevuta
- Stripe (PaymentIntent API)
- PayPal (Orders API v2)
- Rilascio automatico posti prenotazioni scadute (cron ogni 15 min)

**Infrastruttura:**
- `install_python.sh` — installazione automatica su VPS Debian/Ubuntu
- `update_python.sh` — aggiornamento zero-downtime
- `gunicorn.conf.py` — configurazione server WSGI
- Systemd service con restart automatico
- Nginx reverse proxy con cache file statici
- Flask-Migrate per migrazioni DB automatiche

### Motivo della riscrittura

Next.js 16 usa SWC (Rust/NAPI), WASM JIT e `@tailwindcss/oxide` (Rust/NAPI)
durante il build. Il VPS bloccava tutte le chiamate `mmap(PROT_EXEC)` per
pagine anonime (kernel hardened), causando `Bus error (core dumped)` ad ogni
tentativo di build nonostante tutti i workaround possibili (.babelrc, Tailwind v3,
NEXT_TEST_WASM=1).

La riscrittura in Python elimina completamente il problema: nessun build step,
nessun codice nativo, deployment immediato con `git pull + restart`.
