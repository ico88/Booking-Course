import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getConfigPagamento } from "@/lib/pagamento";
import { formatCurrency } from "@/lib/utils";
import SceltaPagamento from "./SceltaPagamento";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaginaPagamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      corso: {
        select: {
          titolo: true,
          dataInizio: true,
          costo: true,
        },
      },
    },
  });

  if (!prenotazione || prenotazione.utenteId !== session.user.id) notFound();

  // Già pagato → vai alla prenotazione
  if (prenotazione.stato === "CONFERMATA") {
    redirect(`/dashboard/prenotazioni/${id}?confermata=1`);
  }

  // Non in attesa di pagamento → vai alla prenotazione
  if (prenotazione.stato !== "IN_ATTESA_PAGAMENTO") {
    redirect(`/dashboard/prenotazioni/${id}`);
  }

  const config = await getConfigPagamento();
  const costoTotale = Number(prenotazione.corso.costo) * prenotazione.numeroPosti;

  // Corso gratuito — auto-conferma e redirect (non dovrebbe arrivare qui, ma sicurezza)
  if (costoTotale === 0) {
    redirect(`/dashboard/prenotazioni/${id}?confermata=1`);
  }

  // Filtra metodi: Stripe solo se chiavi configurate, PayPal idem
  const metodiDisponibili = config.metodiAbilitati.filter((m) => {
    if (m === "STRIPE") return config.stripe !== null;
    if (m === "PAYPAL") return config.paypal !== null;
    return true;
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Intestazione */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Completa il pagamento</h1>
        <p className="text-gray-500 mt-1">{prenotazione.corso.titolo}</p>
      </div>

      {/* Riepilogo importo */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
          <span>{prenotazione.numeroPosti} posto/i</span>
          <span>{formatCurrency(Number(prenotazione.corso.costo))} cad.</span>
        </div>
        <div className="flex justify-between items-center font-bold text-lg text-gray-900 border-t border-gray-200 pt-3 mt-3">
          <span>Totale</span>
          <span className="text-red-600">{formatCurrency(costoTotale)}</span>
        </div>
      </div>

      {/* Selezione metodo */}
      <SceltaPagamento
        prenotazioneId={id}
        costoTotale={costoTotale}
        metodiDisponibili={metodiDisponibili}
        paypalClientId={config.paypal?.clientId ?? null}
        paypalMode={config.paypal?.mode ?? "sandbox"}
        coordinateBancarie={prenotazione.corso.titolo}
      />

      {/* Footer sicurezza */}
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Pagamento sicuro e crittografato
      </div>
    </div>
  );
}
