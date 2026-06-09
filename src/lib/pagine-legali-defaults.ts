export const DEFAULT_PRIVACY_POLICY = `<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Titolare del trattamento</h2>
  <p>
    Il titolare del trattamento dei dati personali è <strong>[Nome organizzazione]</strong>, con sede legale in
    [indirizzo], C.F./P.IVA: [inserire], email:
    <a href="mailto:[email privacy]" class="text-red-600 hover:underline">[email privacy]</a>.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Tipologie di dati trattati</h2>
  <p>Trattiamo le seguenti categorie di dati personali:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li><strong>Dati di registrazione:</strong> nome, cognome, indirizzo email, numero di telefono, password (in forma hash irreversibile).</li>
    <li><strong>Dati di prenotazione:</strong> dati dei partecipanti ai corsi (nome, cognome, email, telefono).</li>
    <li><strong>Dati di pagamento:</strong> ricevuta del bonifico bancario caricata dall'utente (file immagine/PDF).</li>
    <li><strong>Dati di navigazione:</strong> indirizzo IP, tipo di browser, pagine visitate, durata della sessione (se consenso ai cookie analitici).</li>
    <li><strong>Dati di consenso:</strong> data e tipo di consenso espresso in sede di registrazione e/o gestione cookie.</li>
  </ul>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Finalità e basi giuridiche del trattamento</h2>
  <div class="overflow-x-auto">
    <table class="w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden">
      <thead class="bg-gray-50">
        <tr>
          <th class="text-left px-3 py-2 border-b border-gray-200 font-medium text-gray-700">Finalità</th>
          <th class="text-left px-3 py-2 border-b border-gray-200 font-medium text-gray-700">Base giuridica</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr>
          <td class="px-3 py-2">Gestione del profilo utente e autenticazione</td>
          <td class="px-3 py-2">Esecuzione del contratto (art. 6, c. 1, lett. b GDPR)</td>
        </tr>
        <tr class="bg-gray-50">
          <td class="px-3 py-2">Gestione prenotazioni e pagamenti</td>
          <td class="px-3 py-2">Esecuzione del contratto (art. 6, c. 1, lett. b GDPR)</td>
        </tr>
        <tr>
          <td class="px-3 py-2">Invio email transazionali (conferme, attestati, reset password)</td>
          <td class="px-3 py-2">Esecuzione del contratto (art. 6, c. 1, lett. b GDPR)</td>
        </tr>
        <tr class="bg-gray-50">
          <td class="px-3 py-2">Adempimenti fiscali e contabili</td>
          <td class="px-3 py-2">Obbligo legale (art. 6, c. 1, lett. c GDPR)</td>
        </tr>
        <tr>
          <td class="px-3 py-2">Analisi statistica anonima del sito</td>
          <td class="px-3 py-2">Consenso (art. 6, c. 1, lett. a GDPR)</td>
        </tr>
        <tr class="bg-gray-50">
          <td class="px-3 py-2">Comunicazioni commerciali e marketing</td>
          <td class="px-3 py-2">Consenso (art. 6, c. 1, lett. a GDPR)</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Modalità del trattamento e conservazione</h2>
  <p>
    I dati sono trattati con strumenti elettronici su server ubicati nell'Unione Europea. Adottiamo misure
    tecniche e organizzative adeguate (cifratura, controllo accessi, backup) per garantire la sicurezza dei dati.
  </p>
  <p class="mt-2">I dati sono conservati per i seguenti periodi:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li>Dati del profilo: per tutta la durata del rapporto contrattuale e fino a 2 anni dalla cancellazione dell'account.</li>
    <li>Dati di prenotazione e pagamento: 10 anni per obblighi fiscali.</li>
    <li>Log di sistema: 12 mesi.</li>
    <li>Dati di marketing: fino a revoca del consenso.</li>
  </ul>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">5. Destinatari dei dati</h2>
  <p>I dati possono essere comunicati a:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li>Fornitori di servizi cloud e hosting (responsabili del trattamento ex art. 28 GDPR).</li>
    <li>Fornitori di servizi email transazionali.</li>
    <li>Autorità pubbliche, su richiesta e nei limiti di legge.</li>
  </ul>
  <p class="mt-2">I dati non vengono ceduti a terzi per scopi propri né trasferiti fuori dallo Spazio Economico Europeo.</p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">6. Diritti degli interessati</h2>
  <p>Ai sensi degli artt. 15-22 del GDPR, hai il diritto di:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li><strong>Accesso</strong> (art. 15): ottenere conferma e copia dei tuoi dati.</li>
    <li><strong>Rettifica</strong> (art. 16): correggere dati inesatti o incompleti.</li>
    <li><strong>Cancellazione</strong> (art. 17): richiedere l'eliminazione dei dati («diritto all'oblio»).</li>
    <li><strong>Limitazione</strong> (art. 18): limitare il trattamento in determinati casi.</li>
    <li><strong>Portabilità</strong> (art. 20): ricevere i tuoi dati in formato strutturato.</li>
    <li><strong>Opposizione</strong> (art. 21): opporti al trattamento per marketing o per legittimo interesse.</li>
    <li><strong>Revoca del consenso</strong>: in qualsiasi momento, senza pregiudizio per la liceità del trattamento anteriore.</li>
  </ul>
  <p class="mt-2">
    Puoi esercitare i tuoi diritti dalla tua area personale oppure scrivendo a
    <a href="mailto:[email privacy]" class="text-red-600 hover:underline">[email privacy]</a>.
    Risponderemo entro 30 giorni.
  </p>
  <p class="mt-2">
    Hai inoltre il diritto di proporre reclamo all'autorità di controllo italiana:
    <strong>Garante per la Protezione dei Dati Personali</strong>, Piazza Venezia 11, Roma —
    <a href="https://www.garanteprivacy.it" class="text-red-600 hover:underline" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">7. Cookie</h2>
  <p>
    Per informazioni dettagliate sui cookie utilizzati consulta la
    <a href="/cookie-policy" class="text-red-600 hover:underline">Cookie Policy</a>.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">8. Modifiche alla Privacy Policy</h2>
  <p>
    Ci riserviamo il diritto di aggiornare la presente informativa. In caso di modifiche sostanziali
    ti notificheremo via email. La versione più recente è sempre disponibile a questo indirizzo.
  </p>
</section>`;

export const DEFAULT_COOKIE_POLICY = `<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Cosa sono i cookie</h2>
  <p>
    I cookie sono piccoli file di testo che vengono memorizzati nel tuo browser quando visiti un sito web.
    Consentono al sito di ricordare le tue azioni e preferenze (come lingua, dimensioni dei caratteri e altre
    impostazioni di visualizzazione) per un determinato periodo di tempo, in modo da non doverle inserire
    ogni volta che torni sul sito.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Cookie utilizzati da questo sito</h2>

  <h3 class="font-semibold text-gray-800 mt-4 mb-2">2.1 Cookie strettamente necessari</h3>
  <p class="mb-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 inline-block">
    Sempre attivi — non richiedono consenso
  </p>
  <div class="overflow-x-auto mt-2">
    <table class="w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden">
      <thead class="bg-gray-50">
        <tr>
          <th class="text-left px-3 py-2 border-b border-gray-200 font-medium">Nome</th>
          <th class="text-left px-3 py-2 border-b border-gray-200 font-medium">Fornitore</th>
          <th class="text-left px-3 py-2 border-b border-gray-200 font-medium">Scopo</th>
          <th class="text-left px-3 py-2 border-b border-gray-200 font-medium">Scadenza</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr>
          <td class="px-3 py-2 font-mono">next-auth.session-token</td>
          <td class="px-3 py-2">[Nome organizzazione]</td>
          <td class="px-3 py-2">Mantiene la sessione autenticata dell'utente</td>
          <td class="px-3 py-2">Sessione / 30 giorni</td>
        </tr>
        <tr class="bg-gray-50">
          <td class="px-3 py-2 font-mono">next-auth.csrf-token</td>
          <td class="px-3 py-2">[Nome organizzazione]</td>
          <td class="px-3 py-2">Protezione contro attacchi CSRF</td>
          <td class="px-3 py-2">Sessione</td>
        </tr>
        <tr>
          <td class="px-3 py-2 font-mono">cookie_consenso</td>
          <td class="px-3 py-2">[Nome organizzazione]</td>
          <td class="px-3 py-2">Memorizza le preferenze cookie dell'utente (localStorage)</td>
          <td class="px-3 py-2">1 anno</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3 class="font-semibold text-gray-800 mt-6 mb-2">2.2 Cookie analitici</h3>
  <p class="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
    Richiedono consenso
  </p>
  <p class="mt-2">
    Al momento non utilizziamo cookie analitici di terze parti. In caso di futura attivazione (es. Google
    Analytics in modalità anonimizzata) questa sezione verrà aggiornata prima dell'installazione.
  </p>

  <h3 class="font-semibold text-gray-800 mt-6 mb-2">2.3 Cookie di marketing e profilazione</h3>
  <p class="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 inline-block">
    Richiedono consenso esplicito
  </p>
  <p class="mt-2">Al momento non utilizziamo cookie di marketing o profilazione di terze parti.</p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Come gestire i cookie</h2>

  <h3 class="font-semibold text-gray-800 mb-2">3.1 Tramite il banner del sito</h3>
  <p>
    Al primo accesso puoi scegliere quali categorie di cookie accettare. Puoi modificare le tue preferenze
    in qualsiasi momento cancellando il dato <code class="bg-gray-100 px-1 rounded text-xs">cookie_consenso</code>
    dal localStorage del tuo browser (DevTools → Application → Local Storage).
  </p>

  <h3 class="font-semibold text-gray-800 mt-4 mb-2">3.2 Tramite le impostazioni del browser</h3>
  <p>Puoi bloccare o eliminare i cookie dalle impostazioni del tuo browser:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li><strong>Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti</li>
    <li><strong>Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e dati dei siti web</li>
    <li><strong>Safari:</strong> Preferenze → Privacy → Gestisci i dati dei siti web</li>
    <li><strong>Edge:</strong> Impostazioni → Cookie e autorizzazioni del sito</li>
  </ul>
  <p class="mt-2">Attenzione: disabilitare i cookie strettamente necessari potrebbe compromettere il funzionamento del sito.</p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Riferimenti normativi</h2>
  <p>
    La presente Cookie Policy è redatta in conformità al Regolamento UE 2016/679 (GDPR),
    al D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018,
    e alle Linee guida del Garante per la protezione dei dati personali in materia di cookie
    (10 giugno 2021, doc. web n. 9677876).
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">5. Contatti</h2>
  <p>
    Per qualsiasi domanda relativa ai cookie scrivi a
    <a href="mailto:[email privacy]" class="text-red-600 hover:underline">[email privacy]</a>.
    Per maggiori informazioni sul trattamento dei dati personali consulta la
    <a href="/privacy-policy" class="text-red-600 hover:underline">Privacy Policy</a>.
  </p>
</section>`;

export const DEFAULT_TERMINI_CONDIZIONI = `<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">1. Accettazione dei termini</h2>
  <p>
    Utilizzando questa piattaforma, accetti integralmente i presenti Termini e Condizioni d'Uso.
    Se non accetti, ti invitiamo a non utilizzare la piattaforma.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">2. Descrizione del servizio</h2>
  <p>La piattaforma consente agli utenti di:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li>Visualizzare il catalogo dei corsi formativi disponibili.</li>
    <li>Prenotare uno o più posti per sé o per terzi.</li>
    <li>Caricare la ricevuta del bonifico bancario a conferma del pagamento.</li>
    <li>Scaricare l'attestato di partecipazione dopo la conferma della segreteria.</li>
  </ul>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">3. Registrazione e account</h2>
  <p>
    Per effettuare una prenotazione è necessario registrarsi con un indirizzo email valido. L'utente è
    responsabile della riservatezza delle proprie credenziali di accesso e di tutte le attività svolte con
    il proprio account. Ci riserviamo il diritto di sospendere o disattivare account che violino i presenti termini.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">4. Prenotazione e pagamento</h2>
  <ol class="list-decimal pl-5 space-y-2">
    <li>Al momento della prenotazione, il posto viene bloccato temporaneamente per il tempo indicato nel corso.</li>
    <li>L'utente deve effettuare il bonifico bancario alle coordinate indicate e caricare la ricevuta entro il termine stabilito.</li>
    <li>La prenotazione diventa definitiva solo dopo la verifica della ricevuta da parte della segreteria (<strong>stato: CONFERMATA</strong>).</li>
    <li>Se la ricevuta non viene caricata entro il timeout, il posto viene automaticamente liberato e la prenotazione passa allo stato <strong>SCADUTA</strong>.</li>
    <li>La segreteria può rifiutare una ricevuta non corrispondente al pagamento dovuto, comunicandone il motivo all'utente.</li>
  </ol>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">5. Disdette e rimborsi</h2>
  <p>Le condizioni di disdetta e rimborso sono specificate per ogni singolo corso. In assenza di indicazioni specifiche, si applicano le seguenti regole:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li>Disdetta oltre 7 giorni prima dell'inizio: rimborso integrale.</li>
    <li>Disdetta tra 3 e 7 giorni prima dell'inizio: rimborso del 50%.</li>
    <li>Disdetta meno di 3 giorni prima: nessun rimborso.</li>
  </ul>
  <p class="mt-2">
    Per richiedere una disdetta contatta la segreteria all'indirizzo email indicato nel corso.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">6. Attestati</h2>
  <p>
    Gli attestati di partecipazione vengono emessi dalla segreteria dopo la conferma del pagamento e
    al termine del corso. L'attestato è disponibile per il download nell'area personale dell'utente.
    L'attestato certifica la partecipazione al corso e non costituisce titolo professionale abilitante,
    salvo diversa indicazione nel corso stesso.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">7. Limitazione di responsabilità</h2>
  <p>Il gestore della piattaforma non è responsabile per:</p>
  <ul class="list-disc pl-5 mt-2 space-y-1">
    <li>Interruzioni del servizio per cause di forza maggiore o manutenzione programmata.</li>
    <li>Errori nelle informazioni fornite dagli utenti in fase di prenotazione.</li>
    <li>Danni derivanti dall'uso improprio della piattaforma.</li>
  </ul>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">8. Proprietà intellettuale</h2>
  <p>
    Tutti i contenuti della piattaforma (testi, immagini, loghi, software) sono di proprietà del gestore
    o dei rispettivi titolari e sono protetti dalla normativa sul diritto d'autore.
    È vietata la riproduzione senza autorizzazione scritta.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">9. Privacy e trattamento dei dati</h2>
  <p>
    Il trattamento dei dati personali è regolato dalla
    <a href="/privacy-policy" class="text-red-600 hover:underline">Privacy Policy</a>
    e dalla
    <a href="/cookie-policy" class="text-red-600 hover:underline">Cookie Policy</a>,
    che costituiscono parte integrante dei presenti Termini.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">10. Legge applicabile e foro competente</h2>
  <p>
    I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
    il Foro di [città], salvo diversa previsione di legge per i consumatori.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">11. Modifiche ai termini</h2>
  <p>
    Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche
    sostanziali saranno comunicate via email agli utenti registrati con almeno 15 giorni di preavviso.
    L'utilizzo continuato della piattaforma dopo la comunicazione costituisce accettazione delle modifiche.
  </p>
</section>

<section>
  <h2 class="text-lg font-semibold text-gray-900 mb-3">12. Contatti</h2>
  <p>
    Per qualsiasi domanda relativa ai presenti Termini scrivi a
    <a href="mailto:[email info]" class="text-red-600 hover:underline">[email info]</a>.
  </p>
</section>`;
