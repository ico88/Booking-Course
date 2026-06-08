import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schemaUtente = z.object({
  nome: z.string().min(2),
  cognome: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().optional().nullable(),
  password: z.string().min(8).optional(),
  ruolo: z.enum(["UTENTE", "SEGRETERIA"]).default("UTENTE"),
});

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const utenti = await prisma.utente.findMany({
    select: {
      id: true,
      nome: true,
      cognome: true,
      email: true,
      telefono: true,
      ruolo: true,
      createdAt: true,
      _count: { select: { prenotazioni: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(utenti);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = schemaUtente.parse(body);

    const esistente = await prisma.utente.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (esistente) {
      return NextResponse.json(
        { error: "Esiste già un account con questa email" },
        { status: 400 }
      );
    }

    const passwordDefault = data.password || Math.random().toString(36).slice(-8) + "A1!";
    const passwordHash = await bcrypt.hash(passwordDefault, 12);

    const utente = await prisma.utente.create({
      data: {
        nome: data.nome,
        cognome: data.cognome,
        email: data.email.toLowerCase(),
        telefono: data.telefono,
        password: passwordHash,
        ruolo: data.ruolo,
      },
    });

    return NextResponse.json(
      {
        id: utente.id,
        email: utente.email,
        passwordGenerata: !data.password ? passwordDefault : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
