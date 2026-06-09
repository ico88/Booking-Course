import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { inviaEmailConfermaPrenotazione } from "@/lib/email";

const schemaIscrizione = z.object({
  utenteId: z.string(),
  corsoId: z.string(),
  numeroPosti: z.number().int().min(1).default(1),
  partecipanti: z
    .array(
      z.object({
        nome: z.string().min(1),
        cognome: z.string().min(1),
        email: z.string().email().optional().nullable(),
        telefono: z.string().optional().nullable(),
      })
    )
    .optional(),
  noteSegreteria: z.string().optional().nullable(),
});

// La segreteria iscrive direttamente un utente a un corso (senza pagamento)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = schemaIscrizione.parse(body);

    const [utente, corso] = await Promise.all([
      prisma.utente.findUnique({ where: { id: data.utenteId } }),
      prisma.corso.findUnique({ where: { id: data.corsoId } }),
    ]);

    if (!utente) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (!corso) {
      return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
    }

    const postiDisponibili = corso.postiTotali - corso.postiOccupati;
    if (postiDisponibili < data.numeroPosti) {
      return NextResponse.json(
        { error: `Posti insufficienti. Disponibili: ${postiDisponibili}` },
        { status: 400 }
      );
    }

    const partecipantiDefault = data.partecipanti ?? [
      { nome: utente.nome, cognome: utente.cognome, email: utente.email },
    ];

    const scadenza = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 giorni (non rilevante per iscrizione diretta)

    const prenotazione = await prisma.$transaction(async (tx) => {
      const p = await tx.prenotazione.create({
        data: {
          utenteId: data.utenteId,
          corsoId: data.corsoId,
          numeroPosti: data.numeroPosti,
          stato: "CONFERMATA", // Iscrizione diretta: già confermata
          scadenzaPagamento: scadenza,
          noteSegreteria: data.noteSegreteria,
          partecipanti: {
            create: partecipantiDefault,
          },
        },
      });

      await tx.corso.update({
        where: { id: data.corsoId },
        data: { postiOccupati: { increment: data.numeroPosti } },
      });

      return p;
    });

    inviaEmailConfermaPrenotazione(
      utente.email,
      `${utente.nome} ${utente.cognome}`,
      corso.titolo,
      corso.dataInizio,
      data.noteSegreteria
    ).catch(console.error);

    return NextResponse.json(prenotazione, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Errore iscrizione diretta:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
