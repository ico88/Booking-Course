import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { inviaEmailBenvenuto } from "@/lib/email";

const schema = z.object({
  nome: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  cognome: z.string().min(2, "Il cognome deve avere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  telefono: z.string().optional(),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const esistente = await prisma.utente.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (esistente) {
      return NextResponse.json(
        { error: "Esiste già un account con questa email" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const utente = await prisma.utente.create({
      data: {
        nome: data.nome,
        cognome: data.cognome,
        email: data.email.toLowerCase(),
        telefono: data.telefono,
        password: passwordHash,
      },
    });

    // Email di benvenuto (non bloccante)
    inviaEmailBenvenuto(utente.email, utente.nome).catch(console.error);

    return NextResponse.json(
      { message: "Account creato con successo", id: utente.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Errore registrazione:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
