# Gestione Corsi

Sistema completo per la gestione di corsi formativi con prenotazioni, pagamenti tramite bonifico bancario e rilascio attestati.

## Funzionalità principali

### Lato pubblico (utenti)
- Homepage con tutti i corsi disponibili, con indicazione posti liberi e stato
- Scheda corso dettagliata con info, orari, costo, modalità di prenotazione
- Registrazione e login (con reset password via email)
- Prenotazione con supporto a **più posti** per sé e per terzi
- Upload ricevuta bonifico dall'area personale
- Dashboard personale: storico prenotazioni, download attestati
- Notifiche email automatiche a ogni cambio di stato

### Ruolo Admin (super-amministratore)
- Tutti i permessi della segreteria
- Pannello **Impostazioni di sistema**: configura SMTP, WhatsApp Business API, Telegram Bot API, URL applicazione, cron secret
- I valori sensibili (password, token) sono mascherati nella UI e non vengono sovrascritti se non modificati esplicitamente
- Gestione utenti con possibilità di assegnare qualsiasi ruolo

### Lato segreteria (back office)
- Creazione e gestione corsi (titolo, date, orario, posti, costo, timeout pagamento)
- Caricamento template attestato per ogni corso (PDF o immagine)
- Gestione prenotazioni con filtri per stato
- Verifica contabili: conferma o rifiuto con note per l'utente
- Emissione attestati (da template o file personalizzato) con notifica automatica
- Creazione utenti e iscrizione diretta a corsi (senza pagamento)
- Dashboard con statistiche e alert su contabili in attesa

### Automazioni
- Posto riservato alla prenotazione, rilasciato automaticamente se il bonifico non viene caricato entro il timeout (configurabile per corso)
- Endpoint cron `/api/cron/rilascia-posti` da chiamare ogni ora
- Email automatiche per ogni evento (prenotazione, contabile caricata, conferma, attestato, reset password)

---

## Stack tecnologico

| Tecnologia | Utilizzo |
|---|---|
| Next.js 16 (App Router) | Framework full-stack |
| TypeScript | Tipizzazione |
| Prisma 7 | ORM per database |
| PostgreSQL | Database |
| NextAuth.js 4 | Autenticazione |
| Tailwind CSS 4 | Stili |
| bcryptjs | Hashing password |
| Nodemailer | Invio email SMTP |
| Zod | Validazione dati |
| React Hook Form | Gestione form |

---

## Setup locale

### Prerequisiti
- Node.js 18+
- PostgreSQL 14+ in esecuzione
- Account SMTP per le email (es. Gmail con app password)

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/booking_corsi"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tua@gmail.com"
SMTP_PASS="tua-app-password"
SMTP_FROM="noreply@tuodominio.it"

APP_URL="http://localhost:3000"
APP_NAME="Gestione Corsi"
```

> **Gmail:** Vai su Impostazioni Account → Sicurezza → Password per le app per generare una password specifica.

### 3. Crea il database e applica lo schema

```bash
# Sviluppo (senza migration history)
npm run db:push

# Oppure con migration (consigliato per produzione)
npm run db:migrate
```

### 4. Genera il client Prisma

```bash
npm run db:generate
```

### 5. (Opzionale) Popola con dati di esempio

```bash
npm install -D ts-node
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

Crea:
- **Admin:** `admin@example.com` / `AdminSystem2024!`
- **Segreteria:** `segreteria@example.com` / `Admin2024!`
- **Utente test:** `utente@example.com` / `Utente2024!`
- 3 corsi di esempio

### 6. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## Struttura del progetto

```
src/
├── app/
│   ├── (public)/              # Pagine pubbliche con Navbar
│   │   ├── page.tsx            # Homepage corsi
│   │   ├── corsi/[id]/         # Scheda corso + form prenotazione
│   │   └── auth/               # Login, registrazione, reset password
│   ├── (dashboard)/           # Area utente autenticata
│   │   └── dashboard/          # Dashboard + dettaglio prenotazione + upload contabile
│   ├── (admin)/               # Back office segreteria (sidebar dark)
│   │   └── admin/              # Dashboard, corsi, prenotazioni, utenti, attestati
│   └── api/
│       ├── auth/               # NextAuth + registrazione + reset password
│       ├── corsi/              # CRUD corsi
│       ├── prenotazioni/       # Creazione + upload contabile
│       ├── admin/              # Conferma, attestati, iscrizione diretta, utenti
│       └── cron/               # Rilascio automatico posti scaduti
├── components/
│   ├── ui/                     # Button, Input, Textarea, Alert, Badge, Card
│   ├── layout/                 # Navbar (pubblica), AdminSidebar (dark)
│   └── corsi/                  # FormCorso (crea/modifica)
├── lib/
│   ├── prisma.ts               # Client Prisma singleton
│   ├── auth.ts                 # Configurazione NextAuth
│   ├── email.ts                # Template HTML email + funzioni invio
│   └── utils.ts                # cn(), formatCurrency, formatDate, STATI_PRENOTAZIONE
└── types/
    └── next-auth.d.ts          # Estensione tipi sessione (id, ruolo)

prisma/
├── schema.prisma               # Schema completo con tutti i modelli
└── seed.ts                     # Dati di esempio per sviluppo

public/
└── uploads/                    # File utente (gitignored in produzione)
    ├── contabili/               # Ricevute bonifico caricate dagli utenti
    ├── attestati/               # Attestati emessi dalla segreteria
    └── attestati-template/      # Template attestati per corso
```

---

## Schema database

### Modelli principali

**Utente** — ruolo `UTENTE` o `SEGRETERIA`

**Corso** — con posti totali, posti occupati, timeout pagamento, coordinate bancarie, template attestato

**Prenotazione** — collega utente e corso, tiene traccia di contabile e attestato

**Partecipante** — dati dei singoli partecipanti per ogni prenotazione

### Ruoli utente

| Ruolo | Descrizione |
|---|---|
| `UTENTE` | Visualizza corsi, prenota, carica contabili, scarica attestati |
| `SEGRETERIA` | Tutto + gestione corsi, conferma bonifici, emissione attestati, iscrizione diretta |
| `ADMIN` | Tutto + impostazioni di sistema (SMTP, WhatsApp, Telegram, cron) |

### Ciclo di vita prenotazione

```
Prenotazione creata
    ↓ posto bloccato
IN_ATTESA_PAGAMENTO (timeout: X ore, configurabile)
    ↓ utente carica contabile
PAGAMENTO_CARICATO
    ↓ segreteria verifica
CONFERMATA ──→ attestato emettibile
    o
ANNULLATA (posto liberato)

Se timeout scade senza contabile → SCADUTA (posto liberato automaticamente dal cron)
```

---

## Comandi utili

```bash
npm run dev              # Avvia sviluppo su http://localhost:3000
npm run build            # Build per produzione
npm run db:push          # Applica schema Prisma senza migration
npm run db:migrate       # Crea e applica migration (con history)
npm run db:generate      # Rigenera client Prisma dopo modifiche allo schema
npm run db:studio        # Apri Prisma Studio (GUI per il database)
npm run db:seed          # Popola database con dati di esempio
```

---

## Deploy in produzione

### Variabili d'ambiente aggiuntive

```env
NEXTAUTH_URL="https://tuo-dominio.it"
APP_URL="https://tuo-dominio.it"
CRON_SECRET="token-sicuro-random-lungo"
NODE_ENV="production"
```

### Vercel (raccomandato)

1. Connetti il repository su [vercel.com](https://vercel.com)
2. Configura tutte le variabili d'ambiente nel pannello Vercel
3. Per il database: [Neon](https://neon.tech) o [Supabase](https://supabase.com) (gratuiti)
4. Per file upload scalabili: sostituire il filesystem locale con **Vercel Blob** o **AWS S3**

### Cron per rilascio posti

Configura un job ogni ora su:
```
POST https://tuo-dominio.it/api/cron/rilascia-posti
Header: x-cron-secret: [CRON_SECRET]
```

Con **Vercel Cron** aggiungere a `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/rilascia-posti", "schedule": "0 * * * *" }]
}
```

---

## Evoluzioni future già predisposte

### Login con Google
Il codice è già nel file `src/lib/auth.ts` (commentato):
1. Crea credenziali OAuth su [Google Cloud Console](https://console.cloud.google.com)
2. Aggiungi `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` all'`.env`
3. Decommentare il provider Google in `src/lib/auth.ts`

### Pagamenti PayPal
Il sistema è strutturato per accettare un provider di pagamento:
1. Installa `@paypal/react-paypal-js`
2. Aggiungi il bottone PayPal nel form di prenotazione
3. Su conferma PayPal, la prenotazione passa direttamente a `CONFERMATA`

### Notifiche WhatsApp / Telegram
Funzioni dedicate in `src/lib/email.ts`:
1. Installa il SDK (es. `twilio` per WhatsApp, `node-telegram-bot-api` per Telegram)
2. Aggiungi funzioni parallele alle email esistenti
3. Configura i token nelle variabili d'ambiente

---

## Sicurezza

- Password hashate con **bcrypt** (12 rounds)
- Sessioni **JWT** (cookie HttpOnly, sicuri in produzione)
- **Validazione Zod** su tutti gli input delle API
- **Middleware Next.js** per protezione automatica delle route
- **Controllo ruolo** su ogni endpoint admin
- Upload file: tipo MIME e dimensione validati server-side
- Token reset password: **mono-uso** con scadenza 1 ora
- Endpoint cron protetto da `CRON_SECRET`

---

## Changelog

### v1.0.0
- Sistema di prenotazione corsi con bonifico bancario
- Gestione posti con timeout configurabile per corso
- Upload ricevute e verifica segreteria
- Emissione attestati con template per corso
- Iscrizione diretta utenti da back office
- Email transazionali per tutti gli eventi
- Dashboard utente e back office segreteria
