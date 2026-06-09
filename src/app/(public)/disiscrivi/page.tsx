import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Disiscrizione | Gestione Corsi",
};

export default async function PaginaDisiscrivi({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const varianti = {
    ok: {
      icona: CheckCircle,
      colore: "text-green-600",
      sfondo: "bg-green-50 border-green-200",
      titolo: "Disiscrizione completata",
      messaggio:
        "Hai rimosso il consenso alle comunicazioni di marketing. Non riceverai più email sui nuovi corsi.",
    },
    invalid: {
      icona: XCircle,
      colore: "text-red-600",
      sfondo: "bg-red-50 border-red-200",
      titolo: "Link non valido",
      messaggio:
        "Il link di disiscrizione non è valido o è già stato utilizzato.",
    },
    error: {
      icona: AlertCircle,
      colore: "text-amber-600",
      sfondo: "bg-amber-50 border-amber-200",
      titolo: "Errore",
      messaggio:
        "Si è verificato un errore. Puoi gestire le tue preferenze di comunicazione dalla tua area personale.",
    },
  } as const;

  const variante = varianti[status as keyof typeof varianti] ?? varianti.invalid;
  const Icona = variante.icona;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 ${variante.sfondo} mb-6`}
        >
          <Icona className={`h-8 w-8 ${variante.colore}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {variante.titolo}
        </h1>
        <p className="text-gray-500 mb-8">{variante.messaggio}</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Torna alla home
          </Link>
          {status === "ok" && (
            <Link
              href="/dashboard/dati-personali"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Gestisci le tue preferenze
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
