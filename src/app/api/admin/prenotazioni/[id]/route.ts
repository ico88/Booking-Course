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

  if (!session || session.user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      utente: {
        select: { nome: true, cognome: true, email: true, telefono: true },
      },
      corso: true,
      partecipanti: true,
    },
  });

  if (!prenotazione) {
    return NextResponse.json(
      { error: "Prenotazione non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json(prenotazione);
}
