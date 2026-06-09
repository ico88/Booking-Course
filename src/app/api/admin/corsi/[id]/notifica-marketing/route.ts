import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inviaEmailMarketing } from "@/lib/email";
import { urlDisiscrizione } from "@/lib/unsubscribe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;

  const corso = await prisma.corso.findUnique({ where: { id } });
  if (!corso) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }
  if (!corso.pubblicato) {
    return NextResponse.json(
      { error: "Pubblica il corso prima di inviare la notifica." },
      { status: 400 }
    );
  }

  // Blocca invii multipli entro 1 ora (protezione contro doppio click)
  if (corso.ultimaNotificaMarketing) {
    const diff = Date.now() - corso.ultimaNotificaMarketing.getTime();
    if (diff < 60 * 60 * 1000) {
      const minRimanenti = Math.ceil((60 * 60 * 1000 - diff) / 60000);
      return NextResponse.json(
        {
          error: `Notifica già inviata di recente. Riprova tra ${minRimanenti} minuti.`,
        },
        { status: 429 }
      );
    }
  }

  const utenti = await prisma.utente.findMany({
    where: { consensoMarketing: true, ruolo: "UTENTE" },
    select: { id: true, email: true, nome: true },
  });

  if (utenti.length === 0) {
    return NextResponse.json({
      message: "Nessun utente con consenso marketing.",
      inviati: 0,
      errori: 0,
    });
  }

  const corsoPayload = {
    id: corso.id,
    titolo: corso.titolo,
    descrizione: corso.descrizione,
    dataInizio: corso.dataInizio,
    dataFine: corso.dataFine,
    orario: corso.orario,
    luogo: corso.luogo,
    costo: Number(corso.costo).toFixed(2),
    postiDisponibili: corso.postiTotali - corso.postiOccupati,
    immagineUrl: corso.immagineUrl,
  };

  const risultati = await Promise.allSettled(
    utenti.map((u) =>
      inviaEmailMarketing(
        u.email,
        u.nome,
        corsoPayload,
        urlDisiscrizione(u.id)
      )
    )
  );

  const inviati = risultati.filter((r) => r.status === "fulfilled").length;
  const errori = risultati.filter((r) => r.status === "rejected").length;

  await prisma.corso.update({
    where: { id },
    data: { ultimaNotificaMarketing: new Date() },
  });

  return NextResponse.json({ inviati, errori, totale: utenti.length });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;

  const [corso, contattiCount] = await Promise.all([
    prisma.corso.findUnique({
      where: { id },
      select: { ultimaNotificaMarketing: true, pubblicato: true },
    }),
    prisma.utente.count({ where: { consensoMarketing: true, ruolo: "UTENTE" } }),
  ]);

  if (!corso) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  return NextResponse.json({
    contattiMarketing: contattiCount,
    ultimaNotifica: corso.ultimaNotificaMarketing,
    pubblicato: corso.pubblicato,
  });
}
