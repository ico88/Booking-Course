import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inviaEmailConfermaPrenotazione } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { noteSegreteria, azione } = await request.json();

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      utente: true,
      corso: { select: { titolo: true, dataInizio: true } },
    },
  });

  if (!prenotazione) {
    return NextResponse.json(
      { error: "Prenotazione non trovata" },
      { status: 404 }
    );
  }

  if (prenotazione.stato !== "PAGAMENTO_CARICATO") {
    return NextResponse.json(
      { error: "La prenotazione non è in attesa di conferma" },
      { status: 400 }
    );
  }

  if (azione === "conferma") {
    await prisma.prenotazione.update({
      where: { id },
      data: { stato: "CONFERMATA", noteSegreteria },
    });

    inviaEmailConfermaPrenotazione(
      prenotazione.utente.email,
      `${prenotazione.utente.nome} ${prenotazione.utente.cognome}`,
      prenotazione.corso.titolo,
      prenotazione.corso.dataInizio,
      noteSegreteria
    ).catch(console.error);

    return NextResponse.json({ message: "Prenotazione confermata" });
  } else if (azione === "rifiuta") {
    await prisma.$transaction(async (tx) => {
      await tx.prenotazione.update({
        where: { id },
        data: { stato: "ANNULLATA", noteSegreteria },
      });

      await tx.corso.update({
        where: { id: prenotazione.corsoId },
        data: { postiOccupati: { decrement: prenotazione.numeroPosti } },
      });
    });

    return NextResponse.json({ message: "Prenotazione rifiutata" });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}
