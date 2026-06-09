import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generaTokenVerifica, serializeTags } from "@/lib/leads";
import { inviaEmailVerificaLead } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Email non valida"),
  nome: z.string().max(100).optional(),
  cognome: z.string().max(100).optional(),
  tags: z.array(z.string()).min(1, "Seleziona almeno una categoria"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`lead-reg:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche minuto." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const token = generaTokenVerifica();
    const scadenza = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Upsert: if already exists, update tags and reset token
    const lead = await prisma.leadMarketing.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        nome: data.nome,
        cognome: data.cognome,
        tags: serializeTags(data.tags),
        tokenVerifica: token,
        tokenScadenza: scadenza,
        verificato: false,
        attivo: true,
      },
      update: {
        nome: data.nome ?? undefined,
        cognome: data.cognome ?? undefined,
        tags: serializeTags(data.tags),
        tokenVerifica: token,
        tokenScadenza: scadenza,
        attivo: true,
      },
    });

    const base = process.env.APP_URL ?? "http://localhost:3000";
    const linkConferma = `${base}/api/marketing/conferma?token=${token}`;

    await inviaEmailVerificaLead(lead.email, lead.nome, linkConferma);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Lead registration error:", err);
    return NextResponse.json({ error: "Errore interno. Riprova." }, { status: 500 });
  }
}
