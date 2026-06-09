import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { inviaNotificaLeads } from "@/lib/leads";

const schemaAggiornamento = z.object({
  titolo: z.string().min(3).optional(),
  descrizione: z.string().min(10).optional(),
  dataInizio: z.string().optional(),
  dataFine: z.string().optional().nullable(),
  durata: z.string().optional().nullable(),
  luogo: z.string().optional().nullable(),
  costo: z.number().min(0).optional(),
  postiTotali: z.number().int().min(1).optional(),
  timeoutPagamentoOre: z.number().int().min(1).optional(),
  coordinateBancarie: z.string().optional(),
  pubblicato: z.boolean().optional(),
  attestatoAbilitato: z.boolean().optional(),
  tags: z.string().optional(), // JSON array
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const corso = await prisma.corso.findUnique({
    where: { id },
    include: {
      _count: { select: { prenotazioni: true } },
    },
  });

  if (!corso) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  return NextResponse.json(corso);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = schemaAggiornamento.parse(body);

    // Read current published state before update (to detect publish event)
    const corsoAttuale = data.pubblicato !== undefined
      ? await prisma.corso.findUnique({ where: { id }, select: { pubblicato: true } })
      : null;

    const aggiornamenti: Record<string, unknown> = { ...data };
    if (data.dataInizio) aggiornamenti.dataInizio = new Date(data.dataInizio);
    if (data.dataFine) aggiornamenti.dataFine = new Date(data.dataFine);
    else if (data.dataFine === null) aggiornamenti.dataFine = null;

    const corso = await prisma.corso.update({
      where: { id },
      data: aggiornamenti,
    });

    // Auto-notify leads when course is first published
    if (data.pubblicato === true && corsoAttuale && !corsoAttuale.pubblicato) {
      inviaNotificaLeads(id).catch(console.error); // fire-and-forget
    }

    return NextResponse.json(corso);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Errore aggiornamento corso:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const corso = await prisma.corso.findUnique({
    where: { id },
    include: { _count: { select: { prenotazioni: true } } },
  });

  if (!corso) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  if (corso._count.prenotazioni > 0) {
    return NextResponse.json(
      {
        error:
          "Impossibile eliminare un corso con prenotazioni. Annullalo invece.",
      },
      { status: 400 }
    );
  }

  await prisma.corso.delete({ where: { id } });
  return NextResponse.json({ message: "Corso eliminato" });
}
