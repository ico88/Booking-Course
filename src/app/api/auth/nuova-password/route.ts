import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token e password richiesti" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve avere almeno 8 caratteri" },
        { status: 400 }
      );
    }

    const utente = await prisma.utente.findFirst({
      where: {
        tokenReset: token,
        scadenzaToken: { gt: new Date() },
      },
    });

    if (!utente) {
      return NextResponse.json(
        { error: "Link non valido o scaduto" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.utente.update({
      where: { id: utente.id },
      data: {
        password: passwordHash,
        tokenReset: null,
        scadenzaToken: null,
      },
    });

    return NextResponse.json({ message: "Password aggiornata con successo" });
  } catch (error) {
    console.error("Errore nuova password:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
