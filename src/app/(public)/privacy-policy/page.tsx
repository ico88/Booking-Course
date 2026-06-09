import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | Gestione Corsi",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR.",
};

export default async function PaginaPrivacyPolicy() {
  const ultimoAggiornamento = "8 giugno 2026";

  const impostazione = await prisma.impostazione
    .findUnique({ where: { chiave: "pagina_privacy_policy" } })
    .catch(() => null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: {ultimoAggiornamento}</p>

      {impostazione?.valore ? (
        <div
          className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: impostazione.valore }}
        />
      ) : (
        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è <strong>Gestione Corsi S.r.l.</strong>, con sede legale in
              Via Roma 10, 20121 Milano (MI), C.F./P.IVA: [inserire], email:{" "}
              <a href="mailto:privacy@gestione-corsi.it" className="text-red-600 hover:underline">
                privacy@gestione-corsi.it
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Tipologie di dati trattati</h2>
            <p>Trattiamo le seguenti categorie di dati personali:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Dati di registrazione:</strong> nome, cognome, indirizzo email, numero di telefono, password (in forma hash irreversibile).</li>
              <li><strong>Dati di prenotazione:</strong> dati dei partecipanti ai corsi (nome, cognome, email, telefono).</li>
              <li><strong>Dati di pagamento:</strong> ricevuta del bonifico bancario caricata dall'utente (file immagine/PDF).</li>
              <li><strong>Dati di navigazione:</strong> indirizzo IP, tipo di browser, pagine visitate, durata della sessione (se consenso ai cookie analitici).</li>
              <li><strong>Dati di consenso:</strong> data e tipo di consenso espresso in sede di registrazione e/o gestione cookie.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Finalità e basi giuridiche del trattamento</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-gray-200 font-medium text-gray-700">Finalità</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200 font-medium text-gray-700">Base giuridica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-3 py-2">Gestione del profilo utente e autenticazione</td>
                    <td className="px-3 py-2">Esecuzione del contratto (art. 6, c. 1, lett. b GDPR)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2">Gestione prenotazioni e pagamenti</td>
                    <td className="px-3 py-2">Esecuzione del contratto (art. 6, c. 1, lett. b GDPR)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Invio email transazionali (conferme, attestati, reset password)</td>
                    <td className="px-3 py-2">Esecuzione del contratto (art. 6, c. 1, lett. b GDPR)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2">Adempimenti fiscali e contabili</td>
                    <td className="px-3 py-2">Obbligo legale (art. 6, c. 1, lett. c GDPR)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Analisi statistica anonima del sito</td>
                    <td className="px-3 py-2">Consenso (art. 6, c. 1, lett. a GDPR)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2">Comunicazioni commerciali e marketing</td>
                    <td className="px-3 py-2">Consenso (art. 6, c. 1, lett. a GDPR)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Modalità del trattamento e conservazione</h2>
            <p>
              I dati sono trattati con strumenti elettronici su server ubicati nell&apos;Unione Europea. Adottiamo misure
              tecniche e organizzative adeguate (cifratura, controllo accessi, backup) per garantire la sicurezza dei dati.
            </p>
            <p className="mt-2">I dati sono conservati per i seguenti periodi:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Dati del profilo: per tutta la durata del rapporto contrattuale e fino a 2 anni dalla cancellazione dell&apos;account.</li>
              <li>Dati di prenotazione e pagamento: 10 anni per obblighi fiscali.</li>
              <li>Log di sistema: 12 mesi.</li>
              <li>Dati di marketing: fino a revoca del consenso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Destinatari dei dati</h2>
            <p>I dati possono essere comunicati a:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Fornitori di servizi cloud e hosting (responsabili del trattamento ex art. 28 GDPR).</li>
              <li>Fornitori di servizi email transazionali.</li>
              <li>Autorità pubbliche, su richiesta e nei limiti di legge.</li>
            </ul>
            <p className="mt-2">I dati non vengono ceduti a terzi per scopi propri né trasferiti fuori dallo Spazio Economico Europeo.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Diritti degli interessati</h2>
            <p>Ai sensi degli artt. 15-22 del GDPR, hai il diritto di:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Accesso</strong> (art. 15): ottenere conferma e copia dei tuoi dati.</li>
              <li><strong>Rettifica</strong> (art. 16): correggere dati inesatti o incompleti.</li>
              <li><strong>Cancellazione</strong> (art. 17): richiedere l&apos;eliminazione dei dati («diritto all&apos;oblio»).</li>
              <li><strong>Limitazione</strong> (art. 18): limitare il trattamento in determinati casi.</li>
              <li><strong>Portabilità</strong> (art. 20): ricevere i tuoi dati in formato strutturato.</li>
              <li><strong>Opposizione</strong> (art. 21): opporti al trattamento per marketing o per legittimo interesse.</li>
              <li><strong>Revoca del consenso</strong>: in qualsiasi momento, senza pregiudizio per la liceità del trattamento anteriore.</li>
            </ul>
            <p className="mt-2">
              Puoi esercitare i tuoi diritti dalla tua area personale (
              <Link href="/dashboard/dati-personali" className="text-red-600 hover:underline">
                Dashboard → Dati personali
              </Link>
              ) oppure scrivendo a{" "}
              <a href="mailto:privacy@gestione-corsi.it" className="text-red-600 hover:underline">
                privacy@gestione-corsi.it
              </a>
              . Risponderemo entro 30 giorni.
            </p>
            <p className="mt-2">
              Hai inoltre il diritto di proporre reclamo all&apos;autorità di controllo italiana:{" "}
              <strong>Garante per la Protezione dei Dati Personali</strong>, Piazza Venezia 11, Roma —{" "}
              <a href="https://www.garanteprivacy.it" className="text-red-600 hover:underline" target="_blank" rel="noopener noreferrer">
                www.garanteprivacy.it
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Cookie</h2>
            <p>
              Per informazioni dettagliate sui cookie utilizzati consulta la{" "}
              <Link href="/cookie-policy" className="text-red-600 hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Modifiche alla Privacy Policy</h2>
            <p>
              Ci riserviamo il diritto di aggiornare la presente informativa. In caso di modifiche sostanziali ti
              notificheremo via email. La versione più recente è sempre disponibile a questo indirizzo.
            </p>
          </section>

        </div>
      )}
    </div>
  );
}
