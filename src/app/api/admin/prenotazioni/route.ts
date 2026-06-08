import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const stato = searchParams.get("stato");
  const corsoId = searchParams.get("corsoId");

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      ...(stato ? { stato: stato as never } : {}),
      ...(corsoId ? { corsoId } : {}),
    },
    include: {
      utente: {
        select: { nome: true, cognome: true, email: true, telefono: true },
      },
      corso: {
        select: { titolo: true, dataInizio: true, costo: true },
      },
      partecipanti: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(prenotazioni);
}
