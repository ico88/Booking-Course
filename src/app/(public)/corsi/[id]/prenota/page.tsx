import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDate, formatCurrency } from "@/lib/utils";
import FormPrenotazione from "./FormPrenotazione";

export default async function PaginaPrenota({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/auth/login?redirect=/corsi/${id}/prenota`);
  }

  const corso = await prisma.corso.findUnique({
    where: { id, pubblicato: true },
  });

  if (!corso) notFound();

  const postiLiberi = corso.postiTotali - corso.postiOccupati;

  if (postiLiberi <= 0) {
    redirect(`/corsi/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 mb-8">
        <h2 className="font-semibold text-blue-900 text-lg">{corso.titolo}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-blue-700">
          <span>{formatDate(corso.dataInizio)}</span>
          <span>•</span>
          <span>{corso.orario}</span>
          {corso.luogo && (
            <>
              <span>•</span>
              <span>{corso.luogo}</span>
            </>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {postiLiberi} posti disponibili
          </span>
          <span className="font-bold text-blue-900">
            {formatCurrency(corso.costo as unknown as number)}/persona
          </span>
        </div>
      </div>

      <FormPrenotazione
        corsoId={corso.id}
        postiLiberi={postiLiberi}
        costoPerPosto={Number(corso.costo)}
        timeoutOre={corso.timeoutPagamentoOre}
      />
    </div>
  );
}
