import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatCurrency, STATI_PRENOTAZIONE } from "@/lib/utils";
import { Search } from "lucide-react";

export const revalidate = 0;

const STATI_FILTRO = [
  { value: "", label: "Tutti" },
  { value: "IN_ATTESA_PAGAMENTO", label: "Attesa pagamento" },
  { value: "PAGAMENTO_CARICATO", label: "Da verificare" },
  { value: "CONFERMATA", label: "Confermate" },
  { value: "ANNULLATA", label: "Annullate" },
  { value: "SCADUTA", label: "Scadute" },
];

export default async function PaginaAdminPrenotazioni({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; corsoId?: string }>;
}) {
  const { stato, corsoId } = await searchParams;

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      ...(stato ? { stato: stato as never } : {}),
      ...(corsoId ? { corsoId } : {}),
    },
    include: {
      utente: { select: { nome: true, cognome: true, email: true } },
      corso: { select: { titolo: true, dataInizio: true, costo: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const corsi = await prisma.corso.findMany({
    select: { id: true, titolo: true },
    orderBy: { dataInizio: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Prenotazioni</h1>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATI_FILTRO.map((f) => (
          <Link
            key={f.value}
            href={`/admin/prenotazioni${f.value ? `?stato=${f.value}` : ""}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              stato === f.value || (!stato && !f.value)
                ? "bg-red-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {prenotazioni.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nessuna prenotazione trovata</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Utente
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Corso
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Posti
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Stato
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Importo
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prenotazioni.map((p) => {
                const statoInfo = STATI_PRENOTAZIONE[p.stato];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {p.utente.nome} {p.utente.cognome}
                      </p>
                      <p className="text-xs text-gray-500">{p.utente.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{p.corso.titolo}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(p.corso.dataInizio)}
                      </p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-700">{p.numeroPosti}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statoInfo?.bg || "bg-gray-50 border-gray-200"} ${statoInfo?.color || "text-gray-600"}`}
                      >
                        {statoInfo?.label || p.stato}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(Number(p.corso.costo) * p.numeroPosti)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/prenotazioni/${p.id}`}
                        className="text-sm text-red-700 hover:underline"
                      >
                        Dettagli →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
