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

  const [corso, utente, prenotazioneAttiva] = await Promise.all([
    prisma.corso.findUnique({ where: { id, pubblicato: true } }),
    prisma.utente.findUnique({
      where: { id: session.user.id },
      select: { nome: true, cognome: true, email: true, telefono: true, codiceFiscale: true },
    }),
    prisma.prenotazione.findFirst({
      where: {
        utenteId: session.user.id,
        corsoId: id,
        stato: { in: ["IN_ATTESA_PAGAMENTO", "PAGAMENTO_CARICATO", "CONFERMATA"] },
      },
      select: { id: true },
    }),
  ]);

  if (!corso) notFound();

  // Reindirizza alla prenotazione esistente se attiva
  if (prenotazioneAttiva) {
    redirect(`/dashboard/prenotazioni/${prenotazioneAttiva.id}`);
  }

  // Calcola posti disponibili in tempo reale (esclude prenotazioni scadute/annullate)
  const aggPosti = await prisma.prenotazione.aggregate({
    where: {
      corsoId: id,
      stato: { in: ["IN_ATTESA_PAGAMENTO", "PAGAMENTO_CARICATO", "CONFERMATA"] },
    },
    _sum: { numeroPosti: true },
  });
  const postiLiberi = corso.postiTotali - (aggPosti._sum.numeroPosti ?? 0);

  if (postiLiberi <= 0) {
    redirect(`/corsi/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-red-50 rounded-xl p-5 border border-red-100 mb-8">
        <h2 className="font-semibold text-red-900 text-lg">{corso.titolo}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-red-700">
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
          <span className="text-sm text-red-700">
            {postiLiberi} posti disponibili
          </span>
          <span className="font-bold text-red-900">
            {formatCurrency(corso.costo as unknown as number)}/persona
          </span>
        </div>
      </div>

      <FormPrenotazione
        corsoId={corso.id}
        postiLiberi={postiLiberi}
        costoPerPosto={Number(corso.costo)}
        timeoutOre={corso.timeoutPagamentoOre}
        utente={utente ?? undefined}
      />
    </div>
  );
}
