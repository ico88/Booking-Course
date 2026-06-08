import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PlusCircle, Edit, Users, GraduationCap } from "lucide-react";
import Badge from "@/components/ui/Badge";
import DuplicaCorsoButton from "./DuplicaCorsoButton";

export const revalidate = 0;

export default async function PaginaAdminCorsi() {
  const corsi = await prisma.corso.findMany({
    include: {
      _count: {
        select: {
          prenotazioni: {
            where: {
              stato: { in: ["IN_ATTESA_PAGAMENTO", "PAGAMENTO_CARICATO", "CONFERMATA"] },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Corsi</h1>
        <Link
          href="/admin/corsi/nuovo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nuovo corso
        </Link>
      </div>

      {corsi.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nessun corso creato.</p>
          <Link
            href="/admin/corsi/nuovo"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
          >
            <PlusCircle className="h-4 w-4" />
            Crea il primo corso
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Corso
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Data
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Posti
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Costo
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Stato
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {corsi.map((corso) => (
                <tr
                  key={corso.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {corso.titolo}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {corso._count.prenotazioni} prenotazioni
                          </span>
                          {corso.attestatoAbilitato && (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Attestato
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-700">
                      {formatDate(corso.dataInizio)}
                    </p>
                    <p className="text-xs text-gray-400">{corso.orario}</p>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div>
                      <p className="text-sm text-gray-700">
                        {corso.postiOccupati}/{corso.postiTotali}
                      </p>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                        <div
                          className="h-full rounded-full bg-blue-400"
                          style={{
                            width: `${Math.min(
                              (corso.postiOccupati / corso.postiTotali) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(corso.costo as unknown as number)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {corso.pubblicato ? (
                      <Badge variant="success">Pubblicato</Badge>
                    ) : (
                      <Badge variant="gray">Bozza</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DuplicaCorsoButton corsoId={corso.id} />
                      <Link
                        href={`/admin/corsi/${corso.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Modifica
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
