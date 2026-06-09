import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfigPagamento } from "@/lib/pagamento";
import { inviaEmailConfermaPrenotazione } from "@/lib/email";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { paymentIntentId, prenotazioneId } = await request.json();

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: {
      corso: { select: { titolo: true, dataInizio: true } },
      utente: { select: { email: true, nome: true, cognome: true } },
    },
  });

  if (!prenotazione || prenotazione.utenteId !== session.user.id) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  if (prenotazione.stato === "CONFERMATA") {
    return NextResponse.json({ success: true }); // idempotente
  }

  const config = await getConfigPagamento();
  if (!config.stripe) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
  }

  const stripe = new Stripe(config.stripe.secretKey);
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (pi.status !== "succeeded") {
    return NextResponse.json(
      { error: `Pagamento non completato (stato: ${pi.status})` },
      { status: 400 }
    );
  }

  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: {
      stato: "CONFERMATA",
      metodoPagamento: "STRIPE",
      idTransazione: paymentIntentId,
      importoPagato: pi.amount / 100,
    },
  });

  inviaEmailConfermaPrenotazione(
    prenotazione.utente.email,
    `${prenotazione.utente.nome} ${prenotazione.utente.cognome}`,
    prenotazione.corso.titolo,
    prenotazione.corso.dataInizio
  ).catch(console.error);

  return NextResponse.json({ success: true });
}
