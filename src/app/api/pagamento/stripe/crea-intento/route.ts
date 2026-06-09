import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfigPagamento } from "@/lib/pagamento";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { prenotazioneId } = await request.json();

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    include: { corso: { select: { titolo: true, costo: true } } },
  });

  if (!prenotazione || prenotazione.utenteId !== session.user.id) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  if (prenotazione.stato !== "IN_ATTESA_PAGAMENTO") {
    return NextResponse.json({ error: "Prenotazione non in attesa di pagamento" }, { status: 400 });
  }

  const config = await getConfigPagamento();
  if (!config.stripe) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
  }

  const stripe = new Stripe(config.stripe.secretKey);
  const importoCentesimi = Math.round(
    Number(prenotazione.corso.costo) * prenotazione.numeroPosti * 100
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount: importoCentesimi,
    currency: "eur",
    metadata: { prenotazioneId: prenotazione.id },
    description: prenotazione.corso.titolo,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    publishableKey: config.stripe.publishableKey,
  });
}
