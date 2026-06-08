import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import NuovoUtenteDialog from "./NuovoUtenteDialog";
import IscrizioneUtenteDialog from "./IscrizioneUtenteDialog";

export const revalidate = 0;

export default async function PaginaAdminUtenti() {
  const [utenti, corsi] = await Promise.all([
    prisma.utente.findMany({
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        telefono: true,
        ruolo: true,
        createdAt: true,
        _count: { select: { prenotazioni: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.corso.findMany({
      where: { pubblicato: true },
      select: { id: true, titolo: true, dataInizio: true },
      orderBy: { dataInizio: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utenti</h1>
        <div className="flex items-center gap-2">
          <IscrizioneUtenteDialog utenti={utenti} corsi={corsi} />
          <NuovoUtenteDialog />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Utente
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                Telefono
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ruolo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                Prenotazioni
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                Registrato il
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {utenti.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">
                    {u.nome} {u.cognome}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-4 hidden md:table-cell">
                  <span className="text-sm text-gray-700">
                    {u.telefono || "—"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {u.ruolo === "SEGRETERIA" ? (
                    <Badge variant="info">Segreteria</Badge>
                  ) : (
                    <Badge variant="gray">Utente</Badge>
                  )}
                </td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  <span className="text-sm text-gray-700">
                    {u._count.prenotazioni}
                  </span>
                </td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  <span className="text-sm text-gray-500">
                    {formatDate(u.createdAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
