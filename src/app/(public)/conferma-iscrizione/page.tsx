import Link from "next/link";
import { CheckCircle, XCircle, Clock, UserMinus } from "lucide-react";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const STATI: Record<string, { icona: React.ReactNode; titolo: string; messaggio: string; colore: string }> = {
  ok: {
    icona: <CheckCircle className="h-16 w-16 text-green-500" />,
    titolo: "Email confermata!",
    messaggio: "Grazie! La tua iscrizione alla lista notifiche è stata confermata. Riceverai una email ogni volta che viene pubblicato un corso di tuo interesse.",
    colore: "green",
  },
  disiscritta: {
    icona: <UserMinus className="h-16 w-16 text-blue-500" />,
    titolo: "Disiscrizione effettuata",
    messaggio: "Sei stato rimosso dalla lista notifiche. Non riceverai più email da noi. Puoi iscriverti nuovamente in qualsiasi momento.",
    colore: "blue",
  },
  scaduto: {
    icona: <Clock className="h-16 w-16 text-yellow-500" />,
    titolo: "Link scaduto",
    messaggio: "Il link di conferma è scaduto (validità 7 giorni). Per ricevere un nuovo link, registrati nuovamente.",
    colore: "yellow",
  },
  invalid: {
    icona: <XCircle className="h-16 w-16 text-red-500" />,
    titolo: "Link non valido",
    messaggio: "Il link non è valido o è già stato utilizzato. Se hai già confermato la tua iscrizione non devi fare nulla.",
    colore: "red",
  },
  error: {
    icona: <XCircle className="h-16 w-16 text-red-500" />,
    titolo: "Errore",
    messaggio: "Si è verificato un errore. Riprova più tardi o contattaci direttamente.",
    colore: "red",
  },
};

export default async function ConfermaIscrizionePage({ searchParams }: Props) {
  const { status = "invalid" } = await searchParams;
  const stato = STATI[status] ?? STATI.invalid;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">{stato.icona}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{stato.titolo}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{stato.messaggio}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Vai al sito
          </Link>
          {status === "scaduto" && (
            <Link
              href="/notifiche-corsi"
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Iscriviti di nuovo
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
