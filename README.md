# 🎓 Booking Corsi — Piattaforma di Gestione Iscrizioni

**Booking Corsi** è una piattaforma web completa per la gestione delle iscrizioni a corsi di formazione, progettata per enti, associazioni e scuole che vogliono digitalizzare il processo di prenotazione e pagamento in modo semplice, sicuro e conforme alla normativa europea.

---

## ✨ Perché scegliere Booking Corsi?

Dimentica fogli Excel, email disperse e bonifici da tracciare manualmente. Con Booking Corsi hai tutto in un unico posto: i tuoi corsisti si iscrivono online, caricano la ricevuta del pagamento, e tu gestisci tutto dal pannello di amministrazione — in pochi clic.

---

## 🚀 Funzionalità principali

### Per i corsisti
- **Iscrizione online semplice** — registrazione in pochi passi, anche per più partecipanti contemporaneamente
- **Area personale** — visualizza le tue prenotazioni, lo stato del pagamento e scarica gli attestati
- **Pagamento flessibile** — bonifico bancario, Stripe (carta di credito) o PayPal
- **Calendario integrato** — aggiungi il corso al tuo Google Calendar o iCal con un click
- **Email di conferma dettagliate** — riepilogo completo del corso con date, luogo e istruzioni

### Per la segreteria e gli amministratori
- **Pannello di controllo completo** — gestisci corsi, iscrizioni, pagamenti e utenti da un'unica interfaccia; ottimizzato per smartphone e tablet
- **Gestione posti in tempo reale** — i posti si aggiornano automaticamente, niente doppie iscrizioni
- **Workflow pagamenti guidato** — dalla prenotazione alla conferma, ogni passaggio è tracciato
- **Attestati digitali** — genera e invia automaticamente gli attestati di partecipazione personalizzati
- **Newsletter e marketing intelligente** — campagne email segmentate per interessi con esclusione automatica degli iscritti al corso notificato; rilevamento bounce sincroni (errori 5xx) con marcatura automatica degli indirizzi non validi
- **Backup completo con ripristino** — ZIP con database + tutti i file caricati (attestati, ricevute, locandine); backup automatico pianificabile; ripristino in un click con backup di emergenza automatico
- **Gestione utenti GDPR-compliant** — disattivazione account, anonimizzazione dati personali (Art. 17), eliminazione sicura solo senza dati correlati

---

## 🆕 Novità recenti (v1.8.0)

| Funzionalità | Dettaglio |
|---|---|
| **Media Library** | Sezione dedicata (menu admin) per caricare e gestire immagini e PDF (max 15 MB); griglia con filtro per tipo; eliminazione file fisico + DB; endpoint JSON per integrazione con altri form |
| **Campagna email libera** | Composer Quill con anteprima live in iframe; filtro tag opzionale per destinatari; allegato PDF dalla Media Library; modalità individuale o BCC; storico invii per campagna |
| **Migrazione DB** | Nuove tabelle `media_files`, `campagne_libere`, `invii_campagne_libere` |
| **Reminder scadenza prenotazione** | Email automatica ~48h prima della scadenza a chi non ha ancora caricato la ricevuta; inviato una sola volta per prenotazione |
| **Re-invio notifica corso** | Dal dettaglio campagna è possibile re-inviare la notifica rispettando lo schema (escludi iscritti, escludi bounce, filtra tag); ogni invio tracciato separatamente |
| **Backup ZIP completo** | Il backup include database + tutti i file caricati (attestati, ricevute, locandine, prerequisiti) in formato ZIP compresso |
| **Ripristino backup** | Dalla lista backup, un click ripristina database e file; il sistema salva automaticamente un backup di emergenza prima di sovrascrivere |
| **Bounce detection sincrona** | Gli indirizzi rifiutati con errore 5xx vengono marcati automaticamente come non validi e saltati negli invii futuri |

---

## 🔒 Privacy e conformità GDPR — al centro del progetto

Booking Corsi è stato progettato con la **privacy by design**: la conformità al GDPR non è un'aggiunta, è parte dell'architettura.

### Cosa questo significa in pratica:

| Requisito GDPR | Come è implementato |
|---|---|
| **Consenso esplicito** | Doppio opt-in per newsletter, checkbox separata per marketing, dichiarazione età minima (16 anni) |
| **Cookie banner** | Consenso informato prima di qualsiasi tracciamento, conforme alla direttiva ePrivacy |
| **Diritto di accesso (Art. 15)** | L'utente può scaricare tutti i suoi dati in formato JSON dall'area personale |
| **Diritto alla portabilità (Art. 20)** | Esportazione dati strutturata e leggibile da macchina |
| **Diritto all'oblio (Art. 17)** | Anonimizzazione dei dati personali con conservazione dello storico anonimizzato |
| **Limitazione del trattamento** | Disattivazione account senza cancellazione dei dati storici |
| **Retention policy** | Pulizia automatica di lead non verificati (>7 giorni) e inattivi (>2 anni) |
| **Notifica data breach (Art. 33-34)** | Strumento integrato per documentare e notificare violazioni entro 72 ore |
| **Privacy policy dinamica** | Testo aggiornabile dal pannello admin con placeholders per dati aziendali |

---

## 💳 Metodi di pagamento supportati

- **Bonifico bancario** — con upload ricevuta e verifica manuale da parte della segreteria
- **Stripe** — pagamento con carta di credito/debito, completamente sicuro (PCI-DSS compliant)
- **PayPal** — per chi preferisce pagare con il proprio account PayPal

---

## 📧 Comunicazioni automatiche

La piattaforma invia automaticamente email per ogni momento del ciclo di vita dell'iscrizione:

- Benvenuto alla registrazione
- Conferma prenotazione con riepilogo corso e link al calendario
- Aggiornamenti sullo stato del pagamento
- Conferma iscrizione definitiva
- Promemoria e comunicazioni dalla segreteria
- Attestato di partecipazione al termine del corso

Tutte le email sono in **italiano**, con date e orari localizzati.

---

## 🛠️ Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Backend | Python 3.11–3.13 / Flask 3.x |
| Database | SQLite (con migrazioni Flask-Migrate) |
| Frontend | Tailwind CSS (CDN) — no build step |
| Web server | Nginx + Gunicorn |
| Autenticazione | Flask-Login + bcrypt |
| Sicurezza | Flask-WTF CSRF, rate limiting, HSTS, CSP |
| Pagamenti | Stripe, PayPal |
| Email | SMTP configurabile (Gmail, Aruba, ecc.) |
| Certificati SSL | Let's Encrypt / certbot |

---

## ⚡ Installazione rapida

```bash
git clone https://github.com/ico88/booking-course /opt/booking-corsi
cd /opt/booking-corsi/python_app
sudo bash install_python.sh
```

Lo script guida l'installazione completa: Python, virtualenv, database, Nginx, Gunicorn, servizio systemd e certificato SSL Let's Encrypt.

**Requisiti:** Debian/Ubuntu, Python 3.11–3.13, accesso root.

### Aggiornamento

```bash
cd /opt/booking-corsi/python_app
sudo bash update_python.sh
```

Aggiorna dipendenze, esegue le migrazioni del database e riavvia il servizio automaticamente.

---

## 🔐 Sicurezza

- CSRF protection su tutti i form
- Rate limiting su login e registrazione
- Password hashate con bcrypt
- Sessioni sicure con flag `HttpOnly`, `SameSite` e `Secure` (su HTTPS)
- Content Security Policy (CSP) configurata
- HSTS abilitato in produzione
- Captcha Cloudflare Turnstile (opzionale)
- Webhook Stripe verificati con firma crittografica

---

## 📋 Licenza

Progetto sviluppato per uso interno. Per informazioni su licenza e utilizzo commerciale, contatta il maintainer.
