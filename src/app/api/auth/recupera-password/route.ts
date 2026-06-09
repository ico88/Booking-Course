import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inviaEmailResetPassword } from "@/lib/email";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 3 password reset requests per IP per hour
  if (!checkRateLimit(`reset:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email richiesta" }, { status: 400 });
    }

    const utente = await prisma.utente.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Generic response — does not reveal whether the email exists
    if (!utente) {
      return NextResponse.json({
        message: "Se l'email è registrata, riceverai le istruzioni per il reset",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const scadenza = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

    await prisma.utente.update({
      where: { id: utente.id },
      data: { tokenReset: token, scadenzaToken: scadenza },
    });

    inviaEmailResetPassword(utente.email, utente.nome, token).catch(
      console.error
    );

    return NextResponse.json({
      message: "Se l'email è registrata, riceverai le istruzioni per il reset",
    });
  } catch (error) {
    console.error("Errore recupero password:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
