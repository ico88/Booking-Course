# Manuale Utente — Gestione Corsi (Python)

## Indice
1. [Installazione](#installazione)
2. [Primo accesso e configurazione](#primo-accesso)
3. [Gestione Corsi](#gestione-corsi)
4. [Gestione Prenotazioni](#gestione-prenotazioni)
5. [Gestione Utenti](#gestione-utenti)
6. [Marketing e Lead](#marketing-e-lead)
7. [Pagamenti](#pagamenti)
8. [Impostazioni](#impostazioni)
9. [Aggiornamento](#aggiornamento)
10. [Backup](#backup)
11. [Risoluzione problemi](#risoluzione-problemi)

---

## 1. Installazione

### Requisiti VPS
- Debian 11/12 o Ubuntu 22.04/24.04
- 1 GB RAM minimo (2 GB consigliati)
- Python 3.11 o superiore
- Accesso root SSH

### Procedura

```bash
# Clona il repository
git clone <repo-url> /opt/booking-corsi
cd /opt/booking-corsi/python_app

# Esegui l'installer
sudo bash install_python.sh
```

L'installer automaticamente:
- Installa Python, PostgreSQL, Nginx
- Crea il database e l'utente PostgreSQL
- Configura il virtualenv e installa le dipendenze
- Esegue le migrazioni del database
- Crea l'admin iniziale: `admin@example.com` / `Admin1234!`
- Configura il servizio systemd e Nginx
- Attiva il cron per rilascio posti scaduti

**Dopo l'installazione cambia subito la password admin!**

---

## 2. Primo accesso e configurazione

1. Vai su `http://IP-DEL-SERVER/auth/login`
2. Accedi con `admin@example.com` / `Admin1234!`
3. Vai su **Admin → Impostazioni** e configura:
   - **Nome applicazione**: il nome del tuo ente
   - **SMTP**: configura l'email per le notifiche
   - **Stripe** (opzionale): per pagamenti con carta
   - **PayPal** (opzionale): per pagamenti PayPal
4. Vai su **Admin → Dati personali** e cambia email e password

---

## 3. Gestione Corsi

### Creare un corso
1. Vai su **Admin → Corsi → Nuovo corso**
2. Compila i campi:
   - **Titolo**: nome del corso (obbligatorio)
   - **Descrizione**: puoi usare HTML per formattare il testo
   - **Data inizio/fine**: date del corso
   - **Luogo**: dove si svolge il corso
   - **Orario**: es. "9:00-13:00"
   - **Durata**: es. "8 ore" o "2 giorni"
   - **Costo**: prezzo per partecipante in EUR
   - **Posti totali**: 0 = illimitati
   - **Timeout pagamento**: ore entro cui completare il pagamento
   - **Coordinate bancarie**: IBAN e dati per il bonifico
   - **Tag**: parole chiave separate da virgola

3. Attiva **Pubblicato** quando il corso è pronto per essere visibile

### Immagine corso
Dalla pagina di modifica del corso, carica un'immagine JPG/PNG/WebP.

### Duplicare un corso
Usa il pulsante **Duplica** per creare una copia (utile per corsi ricorrenti). La copia viene creata come bozza.

### Attestati
1. Attiva **Attestato abilitato** nella scheda del corso
2. Quando una prenotazione è **Confermata**, dalla scheda della prenotazione puoi usare **Emetti attestato**
3. L'attestato viene generato e inviato automaticamente al partecipante

---

## 4. Gestione Prenotazioni

### Flusso prenotazione
```
IN_ATTESA_PAGAMENTO → PAGAMENTO_CARICATO → CONFERMATA
                   ↘                    ↗
                    ANNULLATA / SCADUTA
```

| Stato | Significato |
|-------|-------------|
| In attesa di pagamento | L'utente ha prenotato ma non ha ancora pagato |
| Pagamento caricato | L'utente ha caricato la ricevuta o pagato online |
| Confermata | La segreteria ha verificato il pagamento |
| Annullata | Prenotazione cancellata |
| Scaduta | Pagamento non completato entro il timeout |

### Azioni segreteria
- **Conferma**: verifica il pagamento e conferma l'iscrizione (invia email)
- **Annulla**: cancella la prenotazione (i posti vengono rilasciati)
- **Emetti attestato**: genera e invia l'attestato al partecipante

### Filtri
Usa i pulsanti di filtro per vedere solo le prenotazioni in un determinato stato (es. "Da verificare" = pagamento caricato).

---

## 5. Gestione Utenti

### Ruoli
| Ruolo | Permessi |
|-------|----------|
| **UTENTE** | Può prenotare corsi, gestire le proprie prenotazioni |
| **SEGRETERIA** | Accesso al pannello admin, gestione prenotazioni |
| **ADMIN** | Accesso completo |

### Creare un utente
1. Vai su **Admin → Utenti → Nuovo utente**
2. Compila nome, cognome, email, password e ruolo
3. L'utente riceve un'email di benvenuto

### Iscrivere un utente a un corso
Dalla scheda di una prenotazione o dal pannello corsi, puoi iscrivere direttamente un utente esistente a un corso (la prenotazione viene creata come **Confermata**).

---

## 6. Marketing e Lead

### Media Library

La Media Library (Admin → Media) permette di caricare e gestire immagini e documenti PDF riutilizzabili in tutto il sistema.

**Caricare un file**
1. Vai su **Admin → Media**
2. Clicca **Carica file**
3. (Opzionale) Inserisci un nome visualizzato; se lasci vuoto viene usato il nome del file
4. Seleziona il file (JPG, PNG, WebP, GIF o PDF — max 15 MB) e clicca **Carica**

**Filtri**
Usa i pulsanti in cima alla griglia per visualizzare solo **Immagini** o **Documenti PDF**.

**Eliminare un file**
Clicca **Elimina** sotto il file. Il file viene rimosso sia dal disco che dal database.

> **Nota**: i file della Media Library sono memorizzati nella cartella `static/uploads/media/` e sono accessibili tramite URL diretto.

### Campagna email libera

La campagna email libera (Admin → Marketing → tab Campagne → Nuova campagna email) permette di inviare una email personalizzata a tutti i lead e/o utenti con consenso marketing, con filtro opzionale per tag.

**Creare e inviare una campagna**
1. Vai su **Admin → Marketing**, tab **Campagne**
2. Clicca **Nuova campagna email**
3. Compila:
   - **Oggetto**: oggetto dell'email
   - **Corpo**: usa l'editor Quill per formattare il testo (grassetto, link, liste, colori…)
   - **Allegato PDF** (opzionale): seleziona un PDF dalla Media Library
   - **Destinatari**: spunta "Tutti" oppure seleziona uno o più tag per filtrare
   - **Modalità invio**: *Individuale* (personalizzata, più lenta) o *BCC* (unica email, più veloce)
4. Clicca **Invia campagna** — l'invio avviene in background

**Anteprima live**
Mentre scrivi, il pannello a destra mostra in tempo reale come apparirà l'email ai destinatari.

**Storico campagna**
Dopo l'invio vieni reindirizzato alla pagina di dettaglio dove puoi vedere il numero di email inviate e l'elenco dei destinatari raggiunti.



### Come funziona
I visitatori possono iscriversi alle notifiche corsi tramite la pagina `/notifiche-corsi`. Dopo la verifica email, vengono aggiunti ai lead.

### Inviare notifiche
1. Vai su **Admin → Marketing**
2. Clicca **Invia notifica** e seleziona il corso
3. L'email viene inviata a tutti i lead attivi e verificati

### Importare lead da CSV
Il file CSV deve avere le colonne: `email`, `nome` (opz.), `cognome` (opz.)

### Eliminare un lead
Dalla lista dei lead, clicca **Elimina** accanto al lead.

### Email non valide (bounce sincroni)
Se il server SMTP rifiuta definitivamente una email durante un invio (es. indirizzo inesistente, dominio non esistente — errore 5xx), il sistema marca automaticamente quell'indirizzo come **non valido**:
- Il lead o l'utente riceve il badge **bounce** in rosso accanto all'email nella lista marketing.
- Nelle spedizioni successive quell'indirizzo viene **saltato automaticamente**.
- Il contatore "Email non valide" in cima alla pagina Marketing mostra il totale complessivo.

> **Nota**: vengono rilevati solo i bounce sincroni (rifiuto immediato durante l'invio). Bounce differiti (NDR ricevuti via IMAP) non sono gestiti automaticamente.

---

## 7. Pagamenti

### Bonifico bancario
- Sempre disponibile
- L'utente carica la ricevuta
- La segreteria verifica manualmente e conferma

### Stripe (carta di credito)
1. Crea un account su [stripe.com](https://stripe.com)
2. Vai su **Impostazioni** e inserisci le chiavi API (pk_... e sk_...)
3. Il pagamento appare automaticamente nel checkout

### PayPal
1. Crea un'app su [developer.paypal.com](https://developer.paypal.com)
2. Vai su **Impostazioni** e inserisci Client ID e Client Secret
3. Seleziona la modalità: **sandbox** (test) o **live** (produzione)

---

## 8. Impostazioni

| Impostazione | Descrizione |
|--------------|-------------|
| Nome applicazione | Nome mostrato nel sito e nelle email |
| SMTP | Configurazione server email per le notifiche |
| Logo | Logo mostrato nella navbar |
| Stripe | Chiavi API per pagamenti con carta |
| PayPal | Credenziali per pagamenti PayPal |
| Pagine legali | Privacy Policy, Cookie Policy, Termini e Condizioni |

### Test email
Dopo aver configurato l'SMTP, usa il pulsante **Invia email di test** per verificare che funzioni.

---

## 9. Aggiornamento

```bash
cd /opt/booking-corsi/python_app
sudo bash update_python.sh
```

L'updater:
1. Fa `git pull` per scaricare il codice aggiornato
2. Aggiorna le dipendenze Python
3. Esegue le nuove migrazioni del database
4. Riavvia il servizio
5. Ricarica Nginx

---

## 10. Backup

### Backup manuale dal pannello admin
1. Vai su **Admin → Backup**
2. Clicca **Scarica backup** — scarica un file SQL completo

### Backup automatico da riga di comando
```bash
pg_dump -U booking_user booking_corsi > backup_$(date +%Y%m%d).sql
```

### Ripristino backup
```bash
psql -U booking_user booking_corsi < backup_20240101.sql
```

---

## 11. Risoluzione problemi

### Il servizio non parte
```bash
# Vedi i log
journalctl -u booking-corsi -n 50

# Riavvia manualmente
sudo systemctl restart booking-corsi
```

### Errore database
```bash
# Controlla connessione
sudo -u www-data /opt/booking-corsi/python_app/.venv/bin/flask \
  --app wsgi:app shell -c "from app.models import db; print(db.engine.url)"
```

### Email non inviate
1. Vai su **Admin → Impostazioni → Test email**
2. Se fallisce, verifica host SMTP, porta, credenziali
3. Per Gmail usa una **App Password**, non la password normale

### Reset password admin da riga di comando
```bash
cd /opt/booking-corsi/python_app
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
flask --app wsgi:app shell
```
```python
from app.models import db, Utente
u = Utente.query.filter_by(email='admin@example.com').first()
u.set_password('NuovaPassword123!')
db.session.commit()
exit()
```

### Posti bloccati non rilasciati
Il cron rilascia i posti ogni 15 minuti. Per forzare manualmente:
```bash
curl -X POST -H "X-Cron-Secret: $(grep SECRET_KEY /opt/booking-corsi/python_app/.env | cut -d= -f2)" \
  http://localhost:5000/api/cron/rilascia-posti
```
