import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Chiamare periodicamente (es. ogni ora via cron Vercel o cron esterno)
// Protetto da CRON_SECRET header
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");

  if (
    process.env.CRON_SECRET &&
    cronSecret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const scadute = await prisma.prenotazione.findMany({
    where: {
      stato: "IN_ATTESA_PAGAMENTO",
      scadenzaPagamento: { lt: new Date() },
    },
    select: { id: true, corsoId: true, numeroPosti: true },
  });

  if (scadute.length === 0) {
    return NextResponse.json({ liberati: 0 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.prenotazione.updateMany({
      where: {
        id: { in: scadute.map((p) => p.id) },
      },
      data: { stato: "SCADUTA" },
    });

    // Raggruppa per corso per aggiornare postiOccupati una volta sola
    const perCorso: Record<string, number> = {};
    for (const p of scadute) {
      perCorso[p.corsoId] = (perCorso[p.corsoId] || 0) + p.numeroPosti;
    }

    await Promise.all(
      Object.entries(perCorso).map(([corsoId, posti]) =>
        tx.corso.update({
          where: { id: corsoId },
          data: { postiOccupati: { decrement: posti } },
        })
      )
    );
  });

  return NextResponse.json({ liberati: scadute.length });
}

// GET: per Vercel Cron (richiede autenticazione via Bearer)
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  return POST(request);
}
