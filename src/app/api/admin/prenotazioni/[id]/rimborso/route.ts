import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfigPagamento, getPaypalAccessToken, paypalBaseUrl } from "@/lib/pagamento";
import Stripe from "stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      utente: { select: { email: true, nome: true, cognome: true } },
      corso: { select: { titolo: true } },
    },
  });

  if (!prenotazione) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  if (prenotazione.metodoPagamento === "BONIFICO") {
    return NextResponse.json(
      { error: "I rimborsi per bonifico bancario vanno gestiti manualmente." },
      { status: 400 }
    );
  }

  if (!prenotazione.idTransazione) {
    return NextResponse.json({ error: "Nessuna transazione registrata" }, { status: 400 });
  }

  const config = await getConfigPagamento();

  if (prenotazione.metodoPagamento === "STRIPE") {
    if (!config.stripe) {
      return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
    }
    const stripe = new Stripe(config.stripe.secretKey);
    await stripe.refunds.create({ payment_intent: prenotazione.idTransazione });
  }

  if (prenotazione.metodoPagamento === "PAYPAL") {
    if (!config.paypal) {
      return NextResponse.json({ error: "PayPal non configurato" }, { status: 503 });
    }
    const { clientId, clientSecret, mode } = config.paypal;
    const token = await getPaypalAccessToken(clientId, clientSecret, mode);
    const base = paypalBaseUrl(mode);

    const importo = prenotazione.importoPagato
      ? Number(prenotazione.importoPagato).toFixed(2)
      : undefined;

    const res = await fetch(
      `${base}/v2/payments/captures/${prenotazione.idTransazione}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: importo
          ? JSON.stringify({ amount: { currency_code: "EUR", value: importo } })
          : "{}",
      }
    );

    const refund = (await res.json()) as { status: string };
    if (!["COMPLETED", "PENDING"].includes(refund.status)) {
      return NextResponse.json(
        { error: `Rimborso PayPal fallito (stato: ${refund.status})` },
        { status: 400 }
      );
    }
  }

  await prisma.prenotazione.update({
    where: { id },
    data: { stato: "ANNULLATA" },
  });

  return NextResponse.json({ success: true });
}
