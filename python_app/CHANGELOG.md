# Changelog

## [1.9.0] — 2026-06-19

### Nuove funzionalità

- **Materiale didattico per corso**: gli admin possono caricare file didattici (PDF, Word, PPT, Excel, immagini, ZIP — max 50 MB ciascuno) dalla pagina partecipanti del corso; i partecipanti con prenotazione confermata vedono e scaricano il materiale dalla propria area prenotazione.
- **Notifica automatica**: quando viene caricato del materiale dopo la creazione del corso, i partecipanti confermati ricevono una notifica email con elenco dei file disponibili e link all'area personale.
- Migrazione DB `add_materiale_corso` con tabella `materiale_corso`.

---

## [1.8.0] — 2026-06-19

### Nuove funzionalità

- **Media Library**: sezione dedicata (menu admin) per caricare e gestire immagini e PDF; griglia con filtro per tipo (immagine/documento); upload modal con nome personalizzato, eliminazione file fisico + DB; endpoint JSON per integrazione con altri form.
- **Campagna email libera**: composer Quill con anteprima live in iframe (aggiornamento asincrono); filtro tag opzionale per destinatari; allegato PDF selezionabile dalla Media Library; modalità individuale o BCC; storico invii per campagna con contatore.
- Migrazione DB `add_media_library` con tabelle `media_files`, `campagne_libere`, `invii_campagne_libere`.

---

## [1.7.0] — 2026-06-18

### Nuove funzionalità

- **Reminder scadenza prenotazione**: email automatica inviata ~48h prima della scadenza a chi ha una prenotazione "In attesa di pagamento" e non ha ancora caricato la ricevuta; inviata una sola volta per prenotazione tramite cron endpoint `/admin/cron/reminder-scadenza` protetto da token.
- **Re-invio notifica corso**: dal dettaglio campagna marketing è possibile re-inviare la notifica del corso rispettando esclusione iscritti attivi, bounce e filtro tag; ogni re-invio viene tracciato separatamente nello storico con pagina di anteprima e conferma.

---

## [1.6.0] — 2026-06-18

### Nuove funzionalità

- **Backup completo (DB + file)**: il backup ora crea uno ZIP che include il database SQLite e tutti i file caricati (attestati, ricevute di pagamento, locandine corsi, documenti prerequisiti). In precedenza veniva salvato solo il database.
- **Ripristino backup**: dalla lista backup, il pulsante "Ripristina" riporta il sistema allo stato del backup selezionato (database + uploads). Prima di sovrascrivere viene salvato automaticamente un backup di emergenza del DB corrente (`pre_restore_*.db`).
- **Badge tipo backup**: nella lista backup, ogni file mostra un badge che indica se contiene "DB + file" (ZIP) o "solo DB" (vecchi backup `.db`).
- **Script cron aggiornato**: il backup automatico pianificato genera anch'esso il nuovo formato ZIP completo.
- **Layout admin mobile**: tutte le pagine del pannello admin sono ora ottimizzate per smartphone (tabelle con scroll orizzontale, header responsive, griglie adattive).

---

## [1.5.0] — 2026-06-18

### Nuove funzionalità

- **Rilevamento bounce sincroni**: quando il server SMTP rifiuta una email con codice permanente 5xx (indirizzo inesistente, casella non valida), l'indirizzo viene automaticamente marcato come "non valido" (`email_non_valida = true`) sia su `LeadMarketing` che su `Utente`.
- **Esclusione automatica email non valide**: gli indirizzi marcati come non validi vengono esclusi dagli invii marketing futuri senza necessità di intervento manuale.
- **Badge "bounce" in lista marketing**: nella pagina Marketing i lead e gli utenti con email non valida mostrano un badge rosso "bounce" accanto all'indirizzo.
- **Contatore email non valide**: aggiunto un quinto riquadro statistiche nella pagina Marketing con il totale delle email non valide.

---

## [1.4.0] — 2026-06-16

### Nuove funzionalità

- **Deduplicazione email marketing**: il sistema tiene traccia delle email già inviate per ogni corso (tabella `invii_marketing`). Reinviando una notifica, i destinatari già contattati vengono saltati automaticamente con indicazione del conteggio.
- **Modalità CCN (BCC)**: nel modale di invio notifica è ora possibile scegliere tra invio individuale (con token disiscrizione personalizzato) e invio in CCN (un'unica email con tutti i destinatari nascosti in copia, più veloce per grandi liste).
- **Contatore "già notificati"**: nel modale di invio, al cambio del corso selezionato appare il numero di destinatari già contattati in precedenza per quel corso.
- **Invio email in background**: le email marketing vengono inviate in un thread separato per evitare timeout HTTP su liste grandi.
- **Connessione SMTP condivisa**: l'invio bulk riusa la stessa connessione SMTP per tutti i messaggi (con riconnessione automatica in caso di disconnessione).

### Fix

- **Errore battitura** "10 postoi disponibili" → "10 posti disponibili" nella card corso in homepage.

---

## [1.3.0] — 2026-06-14

### Nuove funzionalità

- **Gestione utenti GDPR-compliant**: l'eliminazione totale è ora bloccata per utenti con prenotazioni associate. Introdotte tre azioni distinte:
  - **Disattiva / Riattiva** — l'utente non può accedere ma i dati restano intatti (soft delete)
  - **Anonimizza (Art. 17 GDPR)** — cancella tutti i dati personali mantenendo lo storico prenotazioni anonimizzato
  - **Elimina** — disponibile solo per utenti senza nessuna prenotazione
- **Badge "Disattivato"** visibile in lista utenti; righe disattivate appaiono in semitrasparenza
- **Login bloccato per utenti disattivati** con messaggio esplicativo
- **Favicon personalizzabile** — upload da Admin → Impostazioni → Aspetto (ICO, PNG, SVG, WebP)
- **Immagine di sfondo hero** — upload immagine personalizzata per la homepage; sovrappone overlay scuro con testo bianco
- **SSL / HTTPS su corsi.cricatania.it** — configurazione Let's Encrypt tramite certbot
- **Fix permessi nginx**: le directory nel path verso `static/uploads` sono ora attraversabili da nginx (`o+x`) — risolto errore 403 sul logo e sugli upload

### Fix

- **Eliminazione utente con prenotazioni**: il tentativo di eliminare un utente con prenotazioni associate ora mostra un messaggio chiaro invece di fallire silenziosamente con errore di integrità referenziale
- **Permessi static/uploads**: installazione fresca generava 403 su logo e file caricati perché `APP_DIR` aveva permessi `750`

---

## [1.2.0] — 2026-06-13

### Nuove funzionalità

- **Navbar con avatar**: sostituito il nome utente testuale con un cerchio iniziali (es. "FD") con dropdown contenente prenotazioni, dati personali, pannello admin e logout.
- **Home pubblica riprogettata**: hero section con gradiente e colori del tema, statistiche (corsi attivi, partecipanti), carousel corsi e footer multi-colonna scuro con dati aziendali.
- **Hero personalizzabile**: sottotitolo e testo dei due pulsanti principali editabili dal pannello admin (Aspetto → Hero).
- **Footer con dati aziendali**: il footer pubblico mostra ragione sociale e link al sito prelevandoli dalle impostazioni.
- **Impostazioni admin con sidebar**: pagina impostazioni completamente ridisegnata con navigazione verticale a tab (Generale, Azienda, Aspetto, Email, Pagamenti, Notifiche, Sicurezza).
- **Tab Azienda**: nuovo tab dedicato a ragione sociale, P.IVA e indirizzo sede (usati nel footer email e nel footer pubblico).
- **Tab Aspetto**: raggruppa logo, schema colori e editor hero in un unico posto.
- **Cloudflare Turnstile CAPTCHA**: toggle abilitazione/disabilitazione nel tab Sicurezza, attivabile solo se le chiavi sono presenti; il widget scompare dal form di registrazione quando disabilitato.
- **Lista corsi admin**: campo ricerca live per titolo/luogo; azioni "Modifica" e "Partecipanti" diventati pulsanti con icone.
- **Aggiunta manuale partecipanti**: dalla pagina partecipanti di un corso è possibile aggiungere un utente cercandolo tra quelli registrati o creandone uno nuovo direttamente.
- **Lista utenti admin**: campo ricerca live; pulsanti Modifica (con modal) ed Elimina (con conferma); avatar con iniziali colorato per ruolo.
- **Modifica dati utente**: modal admin per modificare nome, cognome, email, telefono, CF, ruolo e password (opzionale) di qualsiasi utente.
- **Backup con cron integrato**: è possibile configurare la pianificazione dei backup automatici direttamente dal pannello admin senza toccare il server.
- **Email con color scheme**: l'header e i bottoni delle email seguono il tema colori impostato (blu/rosso/verde).
- **Logo nelle email**: il logo viene incluso nelle email come URL assoluto (richiede URL App compilato nelle impostazioni).

### Fix

- **Test email**: la route `/impostazioni/test-email` crashava con Internal Server Error perché `_ctx()` restituiva 4 valori ma ne venivano spacchettati solo 2.
- **Cloudflare Turnstile visibile anche se disabilitato**: il widget compariva in fase di registrazione indipendentemente dal flag di abilitazione.
- **Salvataggio hero non funzionante**: i campi hero erano nel form del tab Aspetto ma `_TAB_KEYS` li cercava nel tab Generale.
- **Salvataggio dati azienda**: i campi ragione_sociale, P.IVA, indirizzo non avevano un tab dedicato in `_TAB_KEYS`.
- **Email colore fisso**: header e bottoni usavano sempre blu `#1d4ed8` ignorando il color scheme impostato.

---

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
