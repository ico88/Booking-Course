import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfigPagamento, getPaypalAccessToken, paypalBaseUrl } from "@/lib/pagamento";

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
  if (!config.paypal) {
    return NextResponse.json({ error: "PayPal non configurato" }, { status: 503 });
  }

  const { clientId, clientSecret, mode } = config.paypal;
  const token = await getPaypalAccessToken(clientId, clientSecret, mode);
  const base = paypalBaseUrl(mode);

  const importo = (Number(prenotazione.corso.costo) * prenotazione.numeroPosti).toFixed(2);

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: prenotazioneId,
          description: prenotazione.corso.titolo,
          amount: { currency_code: "EUR", value: importo },
        },
      ],
    }),
  });

  const order = (await res.json()) as { id: string };

  return NextResponse.json({ orderID: order.id });
}
