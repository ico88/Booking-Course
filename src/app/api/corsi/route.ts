import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schemaCorso = z.object({
  titolo: z.string().min(3),
  descrizione: z.string().min(10),
  dataInizio: z.string(),
  dataFine: z.string().optional().nullable(),
  orario: z.string().min(1),
  durata: z.string().optional().nullable(),
  luogo: z.string().optional().nullable(),
  costo: z.number().min(0),
  postiTotali: z.number().int().min(1),
  timeoutPagamentoOre: z.number().int().min(1).default(48),
  coordinateBancarie: z.string().min(10),
  pubblicato: z.boolean().default(false),
  attestatoAbilitato: z.boolean().default(false),
});

// GET: lista corsi pubblici
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soloPublicati = searchParams.get("tutti") !== "true";

  const corsi = await prisma.corso.findMany({
    where: soloPublicati ? { pubblicato: true } : {},
    orderBy: { dataInizio: "asc" },
    select: {
      id: true,
      titolo: true,
      descrizione: true,
      dataInizio: true,
      dataFine: true,
      orario: true,
      durata: true,
      luogo: true,
      costo: true,
      postiTotali: true,
      postiOccupati: true,
      immagineUrl: true,
      pubblicato: true,
      attestatoAbilitato: true,
      createdAt: true,
    },
  });

  return NextResponse.json(corsi);
}

// POST: crea corso (solo segreteria)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = schemaCorso.parse(body);

    const corso = await prisma.corso.create({
      data: {
        ...data,
        costo: data.costo,
        dataInizio: new Date(data.dataInizio),
        dataFine: data.dataFine ? new Date(data.dataFine) : null,
      },
    });

    return NextResponse.json(corso, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Errore creazione corso:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
