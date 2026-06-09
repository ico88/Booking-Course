import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { inviaEmailBenvenuto } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  nome: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  cognome: z.string().min(2, "Il cognome deve avere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  telefono: z.string().optional(),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  consensoPrivacy: z.boolean().refine((v) => v === true, {
    message: "È necessario accettare la Privacy Policy per registrarsi",
  }),
  consensoMarketing: z.boolean().optional(),
  turnstileToken: z.string().optional(),
});

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // CAPTCHA not configured — skip verification

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    }
  );
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 5 registration attempts per IP per 15 minutes
  if (!checkRateLimit(`reg:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Verify Turnstile CAPTCHA if configured
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!data.turnstileToken) {
        return NextResponse.json(
          { error: "Verifica CAPTCHA mancante." },
          { status: 400 }
        );
      }
      const captchaOk = await verifyTurnstile(data.turnstileToken, ip);
      if (!captchaOk) {
        return NextResponse.json(
          { error: "Verifica CAPTCHA fallita. Riprova." },
          { status: 400 }
        );
      }
    }

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
        consensoPrivacy: data.consensoPrivacy,
        consensoMarketing: data.consensoMarketing ?? false,
        dataConsenso: new Date(),
      },
    });

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
