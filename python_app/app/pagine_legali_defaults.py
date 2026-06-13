DEFAULT_PRIVACY_POLICY = """
<h2>Informativa sulla Privacy</h2>
<p><em>Ultimo aggiornamento: {{DATA_AGGIORNAMENTO}}</em></p>

<h3>1. Titolare del trattamento</h3>
<p><strong>{{RAGIONE_SOCIALE}}</strong><br>
{{INDIRIZZO_SEDE}}<br>
Email: <a href="mailto:{{PRIVACY_EMAIL}}">{{PRIVACY_EMAIL}}</a></p>
<p>Per qualsiasi richiesta relativa ai dati personali scrivere all'indirizzo email sopra indicato.</p>

<h3>2. Dati raccolti</h3>
<p>Raccogliamo i seguenti dati personali:</p>
<ul>
  <li>Dati anagrafici (nome, cognome) forniti in fase di registrazione o prenotazione</li>
  <li>Indirizzo email utilizzato come credenziale di accesso e per le comunicazioni</li>
  <li>Numero di telefono e codice fiscale (opzionali, forniti in fase di prenotazione)</li>
  <li>Dati dei partecipanti ai corsi (nome, cognome, email, codice fiscale)</li>
  <li>Dati di pagamento (trattati esclusivamente dal provider di pagamento; non vengono memorizzati sul nostro server)</li>
  <li>Dati di navigazione (log tecnici del server web)</li>
  <li>Preferenze di comunicazione (aree di interesse per le notifiche sui corsi)</li>
</ul>

<h3>3. Finalità del trattamento</h3>
<p>I dati raccolti vengono utilizzati per:</p>
<ul>
  <li>Gestire l'account utente e le prenotazioni ai corsi (base giuridica: esecuzione del contratto)</li>
  <li>Inviare comunicazioni relative ai corsi prenotati: conferme, promemoria, attestati (base giuridica: esecuzione del contratto)</li>
  <li>Adempiere agli obblighi di legge fiscali e contabili (base giuridica: obbligo legale)</li>
  <li>Inviare comunicazioni di marketing sui prossimi corsi, <em>solo previo consenso esplicito</em> (base giuridica: consenso)</li>
</ul>

<h3>4. Età minima</h3>
<p>La piattaforma è destinata a persone di età pari o superiore a 16 anni. Non raccogliamo consapevolmente dati di minori di 16 anni. Se ritieni che un minore abbia fornito dati senza il consenso del genitore, contattaci all'indirizzo indicato.</p>

<h3>5. Conservazione dei dati</h3>
<ul>
  <li><strong>Dati account e prenotazioni:</strong> 10 anni dalla cessazione del rapporto contrattuale, salvo diversi obblighi di legge</li>
  <li><strong>Dati di marketing (lead non registrati):</strong> fino alla revoca del consenso o a 2 anni dall'ultima interazione</li>
  <li><strong>Log tecnici:</strong> 90 giorni</li>
  <li><strong>Token temporanei (reset password, verifica email):</strong> 1–7 giorni</li>
</ul>

<h3>6. Destinatari dei dati</h3>
<p>I dati non vengono ceduti a terzi per finalità commerciali. Possono essere comunicati a:</p>
<ul>
  <li>Provider di servizi email (per l'invio delle comunicazioni)</li>
  <li>Provider di pagamento Stripe / PayPal (per la gestione delle transazioni; soggetti a proprie informative)</li>
  <li>Cloudflare (CAPTCHA antibot, se abilitato; soggetto a propria informativa)</li>
  <li>Autorità competenti se richiesto dalla legge</li>
</ul>

<h3>7. Diritti dell'interessato</h3>
<p>In conformità al Regolamento UE 2016/679 (GDPR), l'interessato ha diritto di:</p>
<ul>
  <li><strong>Accesso</strong> — ottenere conferma che siano trattati dati che lo riguardano e riceverne copia</li>
  <li><strong>Rettifica</strong> — correggere dati inesatti o incompleti</li>
  <li><strong>Cancellazione</strong> ("diritto all'oblio") — richiedere la cancellazione dei propri dati</li>
  <li><strong>Opposizione</strong> — opporsi al trattamento, in particolare per finalità di marketing</li>
  <li><strong>Portabilità</strong> — ricevere i propri dati in formato strutturato e leggibile da macchina</li>
  <li><strong>Limitazione</strong> — chiedere la sospensione temporanea del trattamento</li>
  <li><strong>Reclamo</strong> — proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank">garanteprivacy.it</a>)</li>
</ul>
<p>Per esercitare i propri diritti è sufficiente inviare una richiesta a: <a href="mailto:{{PRIVACY_EMAIL}}">{{PRIVACY_EMAIL}}</a>. Risponderemo entro 30 giorni.</p>
<p>Gli utenti registrati possono inoltre:</p>
<ul>
  <li>Modificare i propri dati personali dalla sezione "Dati personali" del portale</li>
  <li>Scaricare una copia dei propri dati in formato JSON dalla sezione "Dati personali"</li>
  <li>Eliminare il proprio account dalla sezione "Dati personali"</li>
  <li>Revocare il consenso al marketing dalla sezione "Privacy e comunicazioni"</li>
</ul>
"""

DEFAULT_COOKIE_POLICY = """
<h2>Cookie Policy</h2>
<p><em>Ultimo aggiornamento: aggiornare con la data effettiva</em></p>

<h3>Cosa sono i cookie</h3>
<p>I cookie sono piccoli file di testo che i siti visitati inviano al browser dell'utente, dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva.</p>

<h3>Cookie tecnici</h3>
<p>Questo sito utilizza esclusivamente cookie tecnici, necessari al funzionamento della piattaforma:</p>
{{TABELLA_COOKIE}}

<h3>Cookie di terze parti</h3>
<p>Alcune funzionalità opzionali possono caricare script di terze parti (es. gateway di pagamento, CAPTCHA). In tal caso vengono visualizzate specifiche informative prima del caricamento.</p>

<h3>Come disabilitare i cookie</h3>
<p>È possibile disabilitare i cookie nelle impostazioni del proprio browser. Si noti che la disabilitazione dei cookie tecnici può compromettere il funzionamento del sito.</p>
"""


def genera_tabella_cookie(app_name: str = "") -> str:
    _s_hdr = "text-align:left;padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600"
    _s_td = "padding:8px 12px;border:1px solid #e5e7eb"
    _s_code = "background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace"
    rows = [
        ("session", "Sessione autenticata dell'utente", "8 ore"),
        ("csrf_token", "Protezione CSRF dei moduli", "Sessione"),
        ("cookie_consenso", "Memorizza il consenso ai cookie", "1 anno"),
    ]
    tbody_rows = "".join(
        f'<tr>'
        f'<td style="{_s_td}"><span style="{_s_code}">{name}</span></td>'
        f'<td style="{_s_td}">{scopo}</td>'
        f'<td style="{_s_td}">{durata}</td>'
        f'</tr>'
        for name, scopo, durata in rows
    )
    return (
        f'<table style="width:100%;border-collapse:collapse;font-size:0.9em">'
        f'<thead><tr>'
        f'<th style="{_s_hdr}">Cookie</th>'
        f'<th style="{_s_hdr}">Scopo</th>'
        f'<th style="{_s_hdr}">Durata</th>'
        f'</tr></thead>'
        f'<tbody>{tbody_rows}</tbody>'
        f'</table>'
    )

DEFAULT_TERMINI = """
<h2>Termini e Condizioni di Utilizzo</h2>
<p><em>Ultimo aggiornamento: aggiornare con la data effettiva</em></p>

<h3>1. Accettazione dei termini</h3>
<p>L'utilizzo della piattaforma e la prenotazione dei corsi implicano l'accettazione integrale dei presenti termini e condizioni. Si prega di leggerli attentamente prima di procedere alla registrazione.</p>

<h3>2. Registrazione e account</h3>
<p>Per prenotare un corso è necessario creare un account fornendo dati veritieri e aggiornati. L'utente è responsabile della custodia delle proprie credenziali di accesso e di tutte le attività effettuate tramite il proprio account.</p>

<h3>3. Prenotazione e pagamento</h3>
<ul>
  <li>La prenotazione è confermata solo a seguito del pagamento integrale della quota di partecipazione (o immediatamente per i corsi gratuiti)</li>
  <li>Il pagamento può avvenire tramite i metodi indicati sulla piattaforma (bonifico bancario, carta di credito, PayPal)</li>
  <li>In caso di pagamento tramite bonifico, il posto è riservato per il periodo indicato; in assenza di conferma entro tale termine, la prenotazione viene annullata automaticamente</li>
</ul>

<h3>4. Cancellazioni e rimborsi</h3>
<p>Le politiche di cancellazione e rimborso sono definite per ciascun corso. Salvo diversa indicazione:</p>
<ul>
  <li>Cancellazione fino a 7 giorni prima del corso: rimborso integrale</li>
  <li>Cancellazione da 7 a 3 giorni prima: rimborso del 50%</li>
  <li>Cancellazione negli ultimi 3 giorni: nessun rimborso</li>
</ul>
<p>L'ente si riserva il diritto di annullare un corso per cause di forza maggiore, con rimborso integrale ai partecipanti iscritti.</p>

<h3>5. Attestati di partecipazione</h3>
<p>Al termine dei corsi per cui è previsto, viene rilasciato un attestato di partecipazione ai partecipanti che hanno completato il percorso formativo. L'attestato viene inviato per email o reso disponibile per il download dalla propria area personale.</p>

<h3>6. Proprietà intellettuale</h3>
<p>Tutti i materiali didattici, le presentazioni e i contenuti dei corsi sono di proprietà esclusiva dell'ente erogatore. È vietata la riproduzione, distribuzione o utilizzo a fini commerciali senza autorizzazione scritta.</p>

<h3>7. Limitazione di responsabilità</h3>
<p>L'ente non è responsabile per danni indiretti o consequenziali derivanti dall'utilizzo della piattaforma o dalla partecipazione ai corsi. La responsabilità massima è limitata all'importo pagato per il corso.</p>

<h3>8. Modifiche ai termini</h3>
<p>L'ente si riserva il diritto di modificare i presenti termini in qualsiasi momento. Le modifiche saranno comunicate agli utenti registrati via email con almeno 15 giorni di preavviso.</p>

<h3>9. Legge applicabile</h3>
<p>I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro del luogo in cui ha sede l'ente erogatore.</p>
"""
