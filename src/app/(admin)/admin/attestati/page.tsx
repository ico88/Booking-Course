import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { GraduationCap, Download } from "lucide-react";
import Badge from "@/components/ui/Badge";

export const revalidate = 0;

export default async function PaginaAdminAttestati() {
  const prenotazioniConAttestato = await prisma.prenotazione.findMany({
    where: {
      stato: "CONFERMATA",
      corso: { attestatoAbilitato: true },
    },
    include: {
      utente: { select: { nome: true, cognome: true, email: true } },
      corso: { select: { titolo: true, dataInizio: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const emessi = prenotazioniConAttestato.filter((p) => p.attestatoEmesso);
  const daEmettere = prenotazioniConAttestato.filter((p) => !p.attestatoEmesso);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-purple-600" />
        Attestati
      </h1>

      {daEmettere.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Da emettere ({daEmettere.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Partecipante
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Corso
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daEmettere.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
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
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/prenotazioni/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        Emetti
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Emessi ({emessi.length})
        </h2>

        {emessi.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nessun attestato emesso ancora</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Partecipante
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Corso
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Emesso il
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emessi.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {p.utente.nome} {p.utente.cognome}
                      </p>
                      <p className="text-xs text-gray-500">{p.utente.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{p.corso.titolo}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-gray-700">
                        {p.attestatoEmessoAt
                          ? formatDate(p.attestatoEmessoAt)
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {p.attestatoUrl && (
                        <a
                          href={p.attestatoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Scarica
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
