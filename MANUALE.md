# Manuale Utente — Gestione Corsi

**Versione:** 1.2.0 · **Lingua:** Italiano

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Accesso alla piattaforma](#2-accesso-alla-piattaforma)
3. [Area Utente (Dashboard)](#3-area-utente-dashboard)
4. [Prenotare un corso](#4-prenotare-un-corso)
5. [Pagamento](#5-pagamento)
6. [Attestati](#6-attestati)
7. [Pannello Segreteria](#7-pannello-segreteria)
8. [Pannello Amministratore](#8-pannello-amministratore)
9. [Impostazioni di Sistema](#9-impostazioni-di-sistema)
10. [Backup e Ripristino](#10-backup-e-ripristino)
11. [Installazione e Aggiornamento](#11-installazione-e-aggiornamento)
12. [Risoluzione Problemi](#12-risoluzione-problemi)

---

## 1. Introduzione

**Gestione Corsi** è una piattaforma web per la gestione di corsi di formazione. Permette agli utenti di consultare il catalogo corsi, prenotare i posti e pagare online (bonifico, Stripe o PayPal). La segreteria gestisce prenotazioni e attestati; l'amministratore configura l'intero sistema.

### Ruoli disponibili

| Ruolo | Accesso |
|-------|---------|
| **UTENTE** | Sito pubblico, area personale, prenotazioni |
| **SEGRETERIA** | Pannello admin — corsi, prenotazioni, attestati, utenti |
| **ADMIN** | Tutto + impostazioni, backup, pagine legali, metodi di pagamento |

---

## 2. Accesso alla piattaforma

### 2.1 Registrazione

1. Vai su `/registrazione` o clicca **"Crea un account"** nella navbar.
2. Compila nome, cognome, email, telefono (opzionale) e password (minimo 8 caratteri).
3. Accetta la **Privacy Policy** (obbligatorio) e, se lo desideri, il consenso per le email promozionali (facoltativo).
4. Se il CAPTCHA è attivo, completa la verifica Cloudflare Turnstile.
5. Clicca **"Crea account"** — verrai automaticamente autenticato.

> **Nota:** Riceverai un'email di benvenuto dopo la registrazione. Verifica che l'email non sia finita nello spam.

### 2.2 Login

1. Vai su `/auth/login`.
2. Inserisci email e password.
3. Clicca **"Accedi"**.

### 2.3 Recupero password

1. Clicca **"Password dimenticata?"** nella pagina di login.
2. Inserisci la tua email e clicca **"Invia link di reset"**.
3. Controlla la posta in arrivo e clicca il link nel messaggio (valido 1 ora).
4. Imposta la nuova password.

---

## 3. Area Utente (Dashboard)

Accedi alla tua area personale dal menu in alto a destra → **"La mia area"** o vai su `/dashboard`.

### 3.1 Panoramica

La dashboard mostra:
- Le tue prenotazioni recenti con lo stato attuale
- Eventuali attestati disponibili per il download
- Notifiche su scadenze di pagamento imminenti

### 3.2 Lista prenotazioni

Ogni prenotazione mostra:
- **Corso** e **data**
- **Stato**: In attesa di pagamento / Pagamento ricevuto / Confermata / Annullata
- **Posti** prenotati
- **Importo** e metodo di pagamento
- Pulsante per caricare la ricevuta (solo per bonifico)
- Pulsante per scaricare l'attestato (quando disponibile)

---

## 4. Prenotare un corso

### 4.1 Catalogo corsi

1. Dalla homepage o dal menu clicca **"Corsi"** (oppure vai su `/corsi`).
2. Sfoglia il catalogo e filtra per categoria o data.
3. Clicca su un corso per vedere i dettagli.

### 4.2 Compilare il modulo di prenotazione

1. Nella pagina del corso clicca **"Prenota"**.
2. Se non sei autenticato, verrai reindirizzato al login/registrazione.
3. Seleziona il **numero di posti** desiderato.
4. Inserisci i dati dei partecipanti aggiuntivi (se applicabile).
5. Clicca **"Conferma prenotazione"**.

### 4.3 Corso gratuito

Se il costo del corso è **0 €**, la prenotazione viene **confermata immediatamente** senza passare dalla pagina di pagamento. Riceverai subito l'email di conferma.

---

## 5. Pagamento

### 5.1 Metodi disponibili

Dopo aver prenotato un corso a pagamento, verrai reindirizzato alla pagina di scelta del metodo:

- **Bonifico bancario** — sempre disponibile
- **Carta di credito/debito (Stripe)** — se abilitato dall'amministratore
- **PayPal** — se abilitato dall'amministratore

### 5.2 Bonifico bancario

1. Seleziona **"Bonifico bancario"**.
2. Trovi le coordinate bancarie nell'email di prenotazione e nella pagina della tua prenotazione.
3. Esegui il bonifico con la causale indicata.
4. **Carica la ricevuta** nella tua area prenotazioni (`/dashboard/prenotazioni/[id]`).
5. La segreteria verificherà il pagamento e confermerà la prenotazione.

> ⚠️ **Attenzione:** La prenotazione verrà annullata automaticamente se il bonifico non viene caricato entro la scadenza indicata.

### 5.3 Carta di credito (Stripe)

1. Seleziona **"Carta di credito/debito"**.
2. Inserisci i dati della carta nel modulo sicuro Stripe.
3. Se richiesta l'autenticazione 3D Secure, segui le istruzioni del tuo istituto bancario.
4. Al completamento, la prenotazione viene **confermata automaticamente**.

### 5.4 PayPal

1. Seleziona **"PayPal"**.
2. Clicca il pulsante PayPal e accedi al tuo account PayPal.
3. Approva il pagamento.
4. Al ritorno sulla piattaforma, la prenotazione viene **confermata automaticamente**.

### 5.5 Rimborsi

I rimborsi vengono processati **manualmente dalla segreteria**. Per richiedere un rimborso contatta direttamente la segreteria. Per i pagamenti Stripe e PayPal il rimborso viene elaborato direttamente sul metodo originale; per il bonifico il rimborso avviene tramite contatto diretto.

---

## 6. Attestati

Dopo il completamento del corso, la segreteria emette l'attestato di partecipazione.

1. Riceverai un'email con il link diretto per scaricare l'attestato.
2. L'attestato è disponibile anche nella tua area prenotazioni → scheda del corso.
3. Il file è in formato **PDF** con logo, dati del corso e dati del partecipante.

---

## 7. Pannello Segreteria

Accedi su `/admin` con un account SEGRETERIA o ADMIN.

### 7.1 Dashboard admin

Panoramica con:
- Prenotazioni recenti in attesa di verifica
- Corsi imminenti
- Statistiche rapide (prenotazioni totali, confermati, in attesa)

### 7.2 Gestione corsi

**Percorso:** Admin → Corsi (`/admin/corsi`)

- **Visualizza** tutti i corsi con filtri per stato e data
- **Crea nuovo corso** (`/admin/corsi/nuovo`): compila il form con titolo, descrizione, date, orario, luogo, posti, costo, immagine di copertina
- **Modifica** un corso esistente: modifica qualsiasi campo, archivia o cancella
- **Notifica marketing**: dalla pagina del corso, invia email promozionale a tutti gli utenti con consenso marketing (cooldown 1 ora)

### 7.3 Gestione prenotazioni

**Percorso:** Admin → Prenotazioni (`/admin/prenotazioni`)

- **Filtra** per stato, corso, data
- **Verifica pagamento**: apri la prenotazione → visualizza la ricevuta caricata → clicca **"Conferma pagamento"** (aggiorna lo stato a CONFERMATA)
- **Rifiuta / Annulla**: aggiorna lo stato con note per l'utente
- **Rimborso** (Stripe/PayPal): pulsante nella pagina prenotazione per avviare il rimborso dal gateway

### 7.4 Gestione attestati

**Percorso:** Admin → Attestati (`/admin/attestati`)

- **Emetti attestato**: seleziona le prenotazioni confermate e clicca "Emetti attestato"
- **Download PDF**: scarica l'attestato generato
- **Personalizza template**: carica il logo e imposta colori/testi dal pannello impostazioni

### 7.5 Gestione utenti

**Percorso:** Admin → Utenti (`/admin/utenti`)

- Visualizza tutti gli utenti con ruolo e data registrazione
- Modifica ruolo (UTENTE → SEGRETERIA o viceversa)
- Visualizza le prenotazioni dell'utente
- Blocca/sblocca account

---

## 8. Pannello Amministratore

Funzioni aggiuntive disponibili solo con ruolo ADMIN.

### 8.1 Pagine legali

**Percorso:** Admin → Pagine Legali (`/admin/pagine-legali`)

Tre editor HTML con anteprima per personalizzare:
- **Privacy Policy** (visibile su `/privacy-policy`)
- **Cookie Policy** (visibile su `/cookie-policy`)
- **Termini e Condizioni** (visibile su `/termini-condizioni`)

Clicca **"Anteprima"** per visualizzare il risultato prima di salvare.

### 8.2 Backup

**Percorso:** Admin → Backup (`/admin/backup`)

- **Backup manuale**: clicca **"Avvia backup ora"** per creare subito un backup completo
- Il backup include: dump del database PostgreSQL (`.sql.gz`) e archivio dei file caricati (`.tar.gz`)
- **Lista backup**: visualizza i backup salvati con data e dimensione
- **Configurazione automatica**: istruzioni per il cron notturno (vedi sezione [Backup e Ripristino](#10-backup-e-ripristino))

---

## 9. Impostazioni di Sistema

**Percorso:** Admin → Impostazioni (`/admin/impostazioni`)

### 9.1 Logo piattaforma

Carica un'immagine PNG, JPG, WebP o SVG (max 2 MB). Il logo appare nella navbar e nel pannello admin. Clicca **"Rimuovi logo"** per tornare al logo predefinito.

### 9.2 Metodi di pagamento

- **Bonifico bancario**: sempre attivo, nessuna configurazione richiesta
- **Stripe**: abilita la checkbox e inserisci *Publishable Key* (`pk_...`) e *Secret Key* (`sk_...`) ottenute da `dashboard.stripe.com`
- **PayPal**: abilita la checkbox e inserisci *Client ID* e *Client Secret* da `developer.paypal.com`. Scegli tra modalità **Sandbox** (test) e **Live** (produzione)

### 9.3 Email (SMTP)

Configura il server per l'invio di email automatiche:

| Campo | Esempio |
|-------|---------|
| Host SMTP | `smtp.gmail.com` |
| Porta SMTP | `587` (TLS) o `465` (SSL) |
| Utente SMTP | `noreply@miodominio.it` |
| Password SMTP | app password Gmail o password provider |
| Nome mittente | `Gestione Corsi` |

> **Gmail**: attiva la verifica a 2 fattori e genera una *App Password* su `myaccount.google.com/apppasswords`.

Clicca **"Invia email di test"** per verificare la configurazione prima di salvare. L'email di test verrà inviata alla tua casella admin.

### 9.4 CAPTCHA (Cloudflare Turnstile)

Proteggi il modulo di registrazione dal bot spam:

1. Accedi a `dash.cloudflare.com` → **Turnstile** → **Add Site**
2. Inserisci il dominio della piattaforma
3. Copia la **Site Key** (pubblica) e la **Secret Key** (privata)
4. Incollale nei rispettivi campi e salva

Lascia i campi vuoti per disabilitare il CAPTCHA.

### 9.5 Impostazioni generali

| Campo | Descrizione |
|-------|-------------|
| Nome applicazione | Appare nelle email e nella navbar |
| URL base | URL completa del sito (es. `https://corsi.miodominio.it`) |
| Email notifiche segreteria | Indirizzo che riceve le notifiche di nuove prenotazioni e ricevute caricate |
| Cron Secret | Token segreto per il job di rilascio posti — non modificare dopo l'installazione |

---

## 10. Backup e Ripristino

### 10.1 Cosa viene salvato

- **Database PostgreSQL**: dump completo in formato SQL compresso (`.sql.gz`)
- **File caricati**: ricevute, attestati, loghi in archivio `.tar.gz`

### 10.2 Dove vengono salvati

I backup sono salvati nella directory configurata (default: `/var/backups/gestione-corsi`), organizzati in sottocartelle con timestamp (`YYYYMMDD_HHMMSS`).

### 10.3 Backup manuale

Dal pannello Admin oppure da terminale:

```bash
bash /percorso/app/backup.sh
```

### 10.4 Backup automatico (cron)

Aggiunge il backup ogni notte alle 02:00. Sul server:

```bash
crontab -e
# Aggiungi la riga:
0 2 * * * /percorso/app/backup.sh >> /var/log/gestione-corsi-backup.log 2>&1
```

Oppure usa il comando `update.sh` che offre un'opzione guidata.

### 10.5 Configurazione

Nelle variabili d'ambiente (`.env`):

```env
BACKUP_DIR=/var/backups/gestione-corsi   # directory destinazione
RETENTION_DAYS=30                         # giorni di conservazione
```

### 10.6 Ripristino database

Per ripristinare un backup del database:

```bash
# Decomprimi il dump
gunzip /var/backups/gestione-corsi/YYYYMMDD_HHMMSS/database_*.sql.gz

# Ripristina nel database
PGPASSWORD="tuapassword" psql -h localhost -U utente_db -d nome_db \
  < /var/backups/gestione-corsi/YYYYMMDD_HHMMSS/database_*.sql
```

Per ripristinare i file caricati:

```bash
tar -xzf /var/backups/gestione-corsi/YYYYMMDD_HHMMSS/uploads_*.tar.gz \
  -C /percorso/app/public/
```

---

## 11. Installazione e Aggiornamento

### 11.1 Requisiti server

- **OS**: Ubuntu 20.04, 22.04 o 24.04 LTS
- **RAM**: minimo 1 GB (consigliato 2 GB)
- **Disco**: minimo 10 GB liberi
- **Rete**: porta 80/443 accessibile

### 11.2 Prima installazione

```bash
# Clona il repository sul server
git clone https://github.com/tuo/repo.git /var/www/gestione-corsi
cd /var/www/gestione-corsi

# Avvia l'installer guidato
sudo bash install.sh
```

L'installer si occupa automaticamente di:
- Node.js 20 LTS
- PostgreSQL (creazione database e utente)
- Dipendenze npm
- Configurazione `.env` interattiva
- Migrazioni database (Prisma)
- Build dell'applicazione
- PM2 (process manager con avvio al boot)
- Nginx (reverse proxy, opzionale)
- Let's Encrypt SSL (opzionale)
- Cron job per rilascio posti
- Cron job per backup notturno (opzionale)

Al termine dell'installazione, visita l'URL configurato e accedi con le credenziali di test (se hai eseguito il seed):
- Admin: `admin@example.com` / `AdminSystem2024!`
- Segreteria: `segreteria@example.com` / `Admin2024!`

> ⚠️ **Cambia immediatamente le password di default dal pannello Admin → Utenti!**

### 11.3 Aggiornamento

```bash
cd /var/www/gestione-corsi
sudo bash update.sh
```

Lo script di aggiornamento:
1. Esegue un backup preventivo (opzionale)
2. Controlla modifiche locali non salvate
3. Scarica i nuovi commit via `git pull`
4. Aggiorna le dipendenze npm
5. Applica le nuove migrazioni database
6. Ricompila l'applicazione
7. Riavvia PM2 con **zero downtime** (`pm2 reload`)

### 11.4 Comandi utili

```bash
# Stato dell'applicazione
pm2 status

# Log in tempo reale
pm2 logs gestione-corsi

# Riavvio manuale
pm2 restart gestione-corsi

# Reload senza downtime
pm2 reload gestione-corsi

# Backup manuale
bash /var/www/gestione-corsi/backup.sh
```

---

## 12. Risoluzione Problemi

### L'applicazione non si avvia

```bash
pm2 logs gestione-corsi --lines 50
```
Verifica che il file `.env` sia presente e corretto, poi: `pm2 restart gestione-corsi`.

### Le email non vengono inviate

1. Vai su **Admin → Impostazioni → Email (SMTP)**
2. Verifica le credenziali SMTP
3. Clicca **"Invia email di test"** — l'errore dettagliato apparirà in linea
4. Per Gmail: assicurati di usare un'**App Password** (non la password dell'account)

### Il CAPTCHA non appare sulla pagina di registrazione

Verifica che la **Site Key** sia inserita in **Admin → Impostazioni → CAPTCHA**. Se i campi sono vuoti, il CAPTCHA è disabilitato (comportamento normale in sviluppo).

### Il pagamento Stripe fallisce

- Verifica che le chiavi Stripe siano corrette (live vs test)
- Controlla i log dell'applicazione: `pm2 logs gestione-corsi`
- Verifica la dashboard Stripe per errori sul pagamento specifico

### Il backup fallisce

```bash
# Testa manualmente con output completo
bash /var/www/gestione-corsi/backup.sh

# Verifica che pg_dump sia disponibile
which pg_dump

# Installa il client PostgreSQL se mancante
sudo apt-get install postgresql-client
```

### Errore 502 Bad Gateway (Nginx)

L'applicazione Next.js non è in esecuzione. Verifica:
```bash
pm2 status
pm2 start gestione-corsi   # se non in esecuzione
```

### Database non raggiungibile

Verifica che PostgreSQL sia attivo:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql   # se non attivo
```

---

*Per supporto tecnico o segnalazioni di bug, apri una issue sul repository GitHub del progetto.*
