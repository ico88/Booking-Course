import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfigPagamento, getPaypalAccessToken, paypalBaseUrl } from "@/lib/pagamento";
import { inviaEmailConfermaPrenotazione } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { orderID, prenotazioneId } = await request.json();

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
  if (!config.paypal) {
    return NextResponse.json({ error: "PayPal non configurato" }, { status: 503 });
  }

  const { clientId, clientSecret, mode } = config.paypal;
  const token = await getPaypalAccessToken(clientId, clientSecret, mode);
  const base = paypalBaseUrl(mode);

  const res = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const capture = (await res.json()) as {
    status: string;
    purchase_units?: { payments?: { captures?: { id: string; amount?: { value: string } }[] } }[];
  };

  if (capture.status !== "COMPLETED") {
    return NextResponse.json(
      { error: `Pagamento non completato (stato: ${capture.status})` },
      { status: 400 }
    );
  }

  const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? orderID;
  const importoPagato = parseFloat(
    capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? "0"
  );

  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: {
      stato: "CONFERMATA",
      metodoPagamento: "PAYPAL",
      idTransazione: captureId,
      importoPagato,
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
