import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | Gestione Corsi",
  description: "Informativa sull'uso dei cookie ai sensi del Regolamento UE 2016/679.",
};

export default function PaginaCookiePolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: 8 giugno 2026</p>

      <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file di testo che vengono memorizzati nel tuo browser quando visiti un sito web.
            Consentono al sito di ricordare le tue azioni e preferenze (come lingua, dimensioni dei caratteri e altre
            impostazioni di visualizzazione) per un determinato periodo di tempo, in modo da non doverle inserire
            ogni volta che torni sul sito.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Cookie utilizzati da questo sito</h2>

          <h3 className="font-semibold text-gray-800 mt-4 mb-2">2.1 Cookie strettamente necessari</h3>
          <p className="mb-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 inline-block">
            Sempre attivi — non richiedono consenso
          </p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-gray-200 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 border-b border-gray-200 font-medium">Fornitore</th>
                  <th className="text-left px-3 py-2 border-b border-gray-200 font-medium">Scopo</th>
                  <th className="text-left px-3 py-2 border-b border-gray-200 font-medium">Scadenza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 font-mono">next-auth.session-token</td>
                  <td className="px-3 py-2">Gestione Corsi</td>
                  <td className="px-3 py-2">Mantiene la sessione autenticata dell'utente</td>
                  <td className="px-3 py-2">Sessione / 30 giorni</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 font-mono">next-auth.csrf-token</td>
                  <td className="px-3 py-2">Gestione Corsi</td>
                  <td className="px-3 py-2">Protezione contro attacchi CSRF</td>
                  <td className="px-3 py-2">Sessione</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">cookie_consenso</td>
                  <td className="px-3 py-2">Gestione Corsi</td>
                  <td className="px-3 py-2">Memorizza le preferenze cookie dell'utente (localStorage)</td>
                  <td className="px-3 py-2">1 anno</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold text-gray-800 mt-6 mb-2">2.2 Cookie analitici</h3>
          <p className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
            Richiedono consenso
          </p>
          <p className="mt-2">
            Al momento non utilizziamo cookie analitici di terze parti. In caso di futura attivazione (es. Google
            Analytics in modalità anonimizzata) questa sezione verrà aggiornata prima dell'installazione.
          </p>

          <h3 className="font-semibold text-gray-800 mt-6 mb-2">2.3 Cookie di marketing e profilazione</h3>
          <p className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 inline-block">
            Richiedono consenso esplicito
          </p>
          <p className="mt-2">
            Al momento non utilizziamo cookie di marketing o profilazione di terze parti.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Come gestire i cookie</h2>

          <h3 className="font-semibold text-gray-800 mb-2">3.1 Tramite il banner del sito</h3>
          <p>
            Al primo accesso puoi scegliere quali categorie di cookie accettare. Puoi modificare le tue preferenze
            in qualsiasi momento cancellando il dato <code className="bg-gray-100 px-1 rounded text-xs">cookie_consenso</code>{" "}
            dal localStorage del tuo browser (DevTools → Application → Local Storage).
          </p>

          <h3 className="font-semibold text-gray-800 mt-4 mb-2">3.2 Tramite le impostazioni del browser</h3>
          <p>Puoi bloccare o eliminare i cookie dalle impostazioni del tuo browser:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti</li>
            <li><strong>Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e dati dei siti web</li>
            <li><strong>Safari:</strong> Preferenze → Privacy → Gestisci i dati dei siti web</li>
            <li><strong>Edge:</strong> Impostazioni → Cookie e autorizzazioni del sito</li>
          </ul>
          <p className="mt-2">
            Attenzione: disabilitare i cookie strettamente necessari potrebbe compromettere il funzionamento del sito.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Riferimenti normativi</h2>
          <p>
            La presente Cookie Policy è redatta in conformità al Regolamento UE 2016/679 (GDPR),
            al D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018,
            e alle Linee guida del Garante per la protezione dei dati personali in materia di cookie
            (10 giugno 2021, doc. web n. 9677876).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Contatti</h2>
          <p>
            Per qualsiasi domanda relativa ai cookie scrivi a{" "}
            <a href="mailto:privacy@gestione-corsi.it" className="text-blue-600 hover:underline">
              privacy@gestione-corsi.it
            </a>
            . Per maggiori informazioni sul trattamento dei dati personali consulta la{" "}
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
