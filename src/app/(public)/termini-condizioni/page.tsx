import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termini e Condizioni | Gestione Corsi",
  description: "Termini e condizioni d'uso della piattaforma Gestione Corsi.",
};

export default function PaginaTerminiCondizioni() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Termini e Condizioni d'Uso</h1>
      <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: 8 giugno 2026</p>

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Accettazione dei termini</h2>
          <p>
            Utilizzando la piattaforma <strong>Gestione Corsi</strong> (di seguito «Piattaforma»), gestita da
            Gestione Corsi S.r.l., accetti integralmente i presenti Termini e Condizioni d'Uso. Se non accetti,
            ti invitiamo a non utilizzare la Piattaforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Descrizione del servizio</h2>
          <p>
            La Piattaforma consente agli utenti di:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Visualizzare il catalogo dei corsi formativi disponibili.</li>
            <li>Prenotare uno o più posti per sé o per terzi.</li>
            <li>Caricare la ricevuta del bonifico bancario a conferma del pagamento.</li>
            <li>Scaricare l'attestato di partecipazione dopo la conferma della segreteria.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Registrazione e account</h2>
          <p>
            Per effettuare una prenotazione è necessario registrarsi con un indirizzo email valido. L'utente è
            responsabile della riservatezza delle proprie credenziali di accesso e di tutte le attività svolte con
            il proprio account. Ci riserviamo il diritto di sospendere o disattivare account che violino i presenti
            termini.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Prenotazione e pagamento</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Al momento della prenotazione, il posto viene bloccato temporaneamente per il tempo indicato nel corso
              (timeout pagamento).
            </li>
            <li>
              L'utente deve effettuare il bonifico bancario alle coordinate indicate e caricare la ricevuta entro
              il termine stabilito.
            </li>
            <li>
              La prenotazione diventa definitiva solo dopo la verifica della ricevuta da parte della segreteria
              (<strong>stato: CONFERMATA</strong>).
            </li>
            <li>
              Se la ricevuta non viene caricata entro il timeout, il posto viene automaticamente liberato e la
              prenotazione passa allo stato <strong>SCADUTA</strong>.
            </li>
            <li>
              La segreteria può rifiutare una ricevuta non corrispondente al pagamento dovuto, comunicandone il
              motivo all'utente.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Disdette e rimborsi</h2>
          <p>
            Le condizioni di disdetta e rimborso sono specificate per ogni singolo corso. In assenza di indicazioni
            specifiche, si applicano le seguenti regole:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Disdetta oltre 7 giorni prima dell'inizio: rimborso integrale.</li>
            <li>Disdetta tra 3 e 7 giorni prima dell'inizio: rimborso del 50%.</li>
            <li>Disdetta meno di 3 giorni prima: nessun rimborso.</li>
          </ul>
          <p className="mt-2">
            Per richiedere una disdetta contatta la segreteria all'indirizzo email indicato nel corso o scrivi a{" "}
            <a href="mailto:segreteria@gestione-corsi.it" className="text-red-600 hover:underline">
              segreteria@gestione-corsi.it
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Attestati</h2>
          <p>
            Gli attestati di partecipazione vengono emessi dalla segreteria dopo la conferma del pagamento e
            al termine del corso. L'attestato è disponibile per il download nell'area personale dell'utente.
            L'attestato certifica la partecipazione al corso e non costituisce titolo professionale abilitante,
            salvo diversa indicazione nel corso stesso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Limitazione di responsabilità</h2>
          <p>
            Gestione Corsi S.r.l. non è responsabile per:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Interruzioni del servizio per cause di forza maggiore o manutenzione programmata.</li>
            <li>Errori nelle informazioni fornite dagli utenti in fase di prenotazione.</li>
            <li>Danni derivanti dall'uso improprio della Piattaforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Proprietà intellettuale</h2>
          <p>
            Tutti i contenuti della Piattaforma (testi, immagini, loghi, software) sono di proprietà di
            Gestione Corsi S.r.l. o dei rispettivi titolari e sono protetti dalla normativa sul diritto d'autore.
            È vietata la riproduzione senza autorizzazione scritta.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Privacy e trattamento dei dati</h2>
          <p>
            Il trattamento dei dati personali è regolato dalla{" "}
            <Link href="/privacy-policy" className="text-red-600 hover:underline">
              Privacy Policy
            </Link>
            {" "}e dalla{" "}
            <Link href="/cookie-policy" className="text-red-600 hover:underline">
              Cookie Policy
            </Link>
            , che costituiscono parte integrante dei presenti Termini.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Legge applicabile e foro competente</h2>
          <p>
            I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
            il Foro di Milano, salvo diversa previsione di legge per i consumatori.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Modifiche ai termini</h2>
          <p>
            Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche
            sostanziali saranno comunicate via email agli utenti registrati con almeno 15 giorni di preavviso.
            L'utilizzo continuato della Piattaforma dopo la comunicazione costituisce accettazione delle modifiche.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contatti</h2>
          <p>
            Per qualsiasi domanda relativa ai presenti Termini scrivi a{" "}
            <a href="mailto:info@gestione-corsi.it" className="text-red-600 hover:underline">
              info@gestione-corsi.it
            </a>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
