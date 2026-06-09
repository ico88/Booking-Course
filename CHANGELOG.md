# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/).

---

## [1.2.0] — 2026-06-09

### Aggiunto
- **Sistema di backup automatico** (`backup.sh`): backup del database PostgreSQL via `pg_dump`, archivio dei file caricati (`public/uploads/`), rotazione automatica dei backup più vecchi di `RETENTION_DAYS` giorni (default 30). Configurable via variabili d'ambiente `BACKUP_DIR` e `RETENTION_DAYS`.
- **Pannello Admin → Backup** (`/admin/backup`): interfaccia per avviare backup manuali, visualizzare backup salvati con dimensioni, e istruzioni per la configurazione del cron notturno.
- **Configurazione SMTP dal pannello Admin** (`/admin/impostazioni → Email`): le impostazioni host/porta/utente/password/nome mittente vengono lette dal database al momento dell'invio, con fallback alle variabili d'ambiente. Nessun riavvio necessario dopo la modifica.
- **Bottone "Invia email di test"** nella sezione SMTP del pannello Admin: invia un'email di prova alla casella dell'amministratore per verificare la configurazione, con feedback in linea di successo/errore.
- **CAPTCHA Cloudflare Turnstile configurabile dal pannello Admin** (`/admin/impostazioni → CAPTCHA`): site key e secret key si inseriscono dal pannello senza modificare variabili d'ambiente. La pagina di registrazione legge la chiave pubblica dal database.
- **Installer v2.0** (`install.sh`): aggiunto step per configurazione directory backup, installazione di `postgresql-client` per `pg_dump`, cron notturno backup opzionale, sezione "Prossimi passi" nel riepilogo finale con link al pannello Admin.
- **Script di aggiornamento guidato** (`update.sh`): backup preventivo opzionale, rilevamento modifiche locali con stash automatico, conteggio nuovi commit da applicare, prisma db push, npm build, riavvio PM2 con zero-downtime.

### Modificato
- La pagina di registrazione (`/auth/registrazione`) è ora un server component che legge la Turnstile site key dal database; la voce di menu "Backup" è stata aggiunta alla sidebar admin.
- Le variabili d'ambiente SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) sono ora facoltative se configurate dal pannello Admin.

---

## [1.1.0] — 2026-05-28

### Aggiunto
- **Sistema di pagamento multi-gateway**: supporto Stripe (carta di credito/debito con 3DS) e PayPal, entrambi opzionali e configurabili dal pannello Admin.
- **Corsi gratuiti**: quando il costo è 0 €, la prenotazione viene confermata immediatamente senza passare dalla pagina di pagamento.
- **Pagina scelta metodo di pagamento** (`/dashboard/pagamento/[id]`): selezione tra bonifico bancario, Stripe e PayPal con UI a schede.
- **Rimborso manuale** dalla segreteria: bottone di rimborso nella pagina prenotazione admin per Stripe e PayPal con conferma a due step.
- **Editor pagine legali** (`/admin/pagine-legali`): editor HTML con anteprima in tempo reale per Privacy Policy, Cookie Policy e Termini e Condizioni. I testi vengono salvati nel database e mostrati nelle pagine pubbliche.
- **Sistema di email marketing**: bottone "Notifica utenti" nella pagina corso admin per inviare email promozionali a tutti gli utenti con consenso marketing. Cooldown di 1 ora per evitare spam. Template email con immagine corso, dettagli e CTA.
- **Link di disiscrizione** nelle email marketing: token HMAC-SHA256 sicuro, endpoint `GET /api/disiscrivi`, pagina pubblica `/disiscrivi`.
- **CAPTCHA Cloudflare Turnstile** sulla pagina di registrazione (opzionale).
- **Rate limiting** su login, registrazione e recupero password (sliding window in-memory).
- **HTTP Security Headers** in `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`.

### Modificato
- Header email: colore aggiornato da blu (`#1e40af`) a rosso (`#dc2626`) coerente con il tema generale.
- Le pagine pubbliche Privacy Policy, Cookie Policy e Termini e Condizioni mostrano il contenuto personalizzato dal pannello Admin con fallback al testo predefinito.

---

## [1.0.0] — 2026-05-01

### Aggiunto
- **Autenticazione** con NextAuth.js: login, registrazione, recupero password via email, reset password.
- **Tre ruoli**: ADMIN, SEGRETERIA, UTENTE con pannelli dedicati.
- **Gestione corsi**: creazione, modifica, archiviazione, caricamento immagine copertina. Campi: titolo, descrizione, date, orario, durata, luogo, posti, costo, modalità (in presenza / online / ibrida), visibilità.
- **Prenotazioni**: modulo pubblico multi-posti, scadenza pagamento automatica, lista d'attesa.
- **Pagamenti tramite bonifico**: upload ricevuta contabile, verifica da segreteria, conferma manuale.
- **Attestati**: generazione PDF automatica con template personalizzabile (logo, colori), download utente e segreteria.
- **Area dashboard utente**: lista prenotazioni, stato, download attestati.
- **Pannello Admin**: gestione corsi, prenotazioni, utenti, attestati, impostazioni.
- **Notifiche email** automatiche: benvenuto, prenotazione ricevuta, ricevuta caricata, conferma iscrizione, attestato disponibile, reset password, notifica segreteria.
- **Logo personalizzato**: caricamento dal pannello Admin, visibile in navbar e sidebar.
- **Cron job** per rilascio automatico posti scaduti (`/api/cron/rilascia-posti`).
- **Installer guidato** (`install.sh`) per Ubuntu Server: Node.js, PostgreSQL, PM2, Nginx, SSL Let's Encrypt.
- **Backup script** di base (`backup.sh`).

---

*Legenda:*
- **Aggiunto** — nuove funzionalità
- **Modificato** — cambiamenti a funzionalità esistenti
- **Corretto** — bug fix
- **Rimosso** — funzionalità rimosse
- **Sicurezza** — correzioni di vulnerabilità
