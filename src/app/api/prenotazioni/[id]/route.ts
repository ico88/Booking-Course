import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      corso: true,
      partecipanti: true,
      utente: {
        select: { nome: true, cognome: true, email: true, telefono: true },
      },
    },
  });

  if (!prenotazione) {
    return NextResponse.json(
      { error: "Prenotazione non trovata" },
      { status: 404 }
    );
  }

  // Utente normale può vedere solo le proprie prenotazioni
  if (
    session.user.ruolo !== "SEGRETERIA" &&
    prenotazione.utenteId !== session.user.id
  ) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  return NextResponse.json(prenotazione);
}

// Annulla prenotazione (utente o segreteria)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
  });

  if (!prenotazione) {
    return NextResponse.json(
      { error: "Prenotazione non trovata" },
      { status: 404 }
    );
  }

  if (
    session.user.ruolo !== "SEGRETERIA" &&
    prenotazione.utenteId !== session.user.id
  ) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  if (prenotazione.stato === "CONFERMATA") {
    return NextResponse.json(
      { error: "Impossibile annullare una prenotazione già confermata" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.prenotazione.update({
      where: { id },
      data: { stato: "ANNULLATA" },
    });

    if (
      prenotazione.stato === "IN_ATTESA_PAGAMENTO" ||
      prenotazione.stato === "PAGAMENTO_CARICATO"
    ) {
      await tx.corso.update({
        where: { id: prenotazione.corsoId },
        data: { postiOccupati: { decrement: prenotazione.numeroPosti } },
      });
    }
  });

  return NextResponse.json({ message: "Prenotazione annullata" });
}
