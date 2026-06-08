import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const utente = await prisma.utente.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nome: true,
      cognome: true,
      email: true,
      telefono: true,
      ruolo: true,
      consensoPrivacy: true,
      consensoMarketing: true,
      dataConsenso: true,
      createdAt: true,
      prenotazioni: {
        select: {
          id: true,
          stato: true,
          numeroPosti: true,
          scadenzaPagamento: true,
          createdAt: true,
          corso: {
            select: {
              titolo: true,
              dataInizio: true,
              luogo: true,
              costo: true,
            },
          },
          partecipanti: {
            select: {
              nome: true,
              cognome: true,
              email: true,
              telefono: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!utente) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const esportazione = {
    _meta: {
      esportato_il: new Date().toISOString(),
      formato: "JSON - Esportazione dati personali (art. 20 GDPR)",
    },
    profilo: {
      id: utente.id,
      nome: utente.nome,
      cognome: utente.cognome,
      email: utente.email,
      telefono: utente.telefono,
      ruolo: utente.ruolo,
      registrato_il: utente.createdAt,
    },
    consensi: {
      privacy_policy: utente.consensoPrivacy,
      marketing: utente.consensoMarketing,
      data_consenso: utente.dataConsenso,
    },
    prenotazioni: utente.prenotazioni.map((p) => ({
      id: p.id,
      stato: p.stato,
      numero_posti: p.numeroPosti,
      scadenza_pagamento: p.scadenzaPagamento,
      data_prenotazione: p.createdAt,
      corso: {
        titolo: p.corso.titolo,
        data_inizio: p.corso.dataInizio,
        luogo: p.corso.luogo,
        costo: p.corso.costo,
      },
      partecipanti: p.partecipanti,
    })),
  };

  return new NextResponse(JSON.stringify(esportazione, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dati-personali-${utente.id}.json"`,
    },
  });
}
