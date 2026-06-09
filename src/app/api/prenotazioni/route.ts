import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import {
  inviaEmailPrenotazione,
  inviaEmailNotificaSegreteria,
  inviaEmailConfermaPrenotazione,
} from "@/lib/email";

const schemaPartecipante = z.object({
  nome: z.string().min(1, "Nome richiesto"),
  cognome: z.string().min(1, "Cognome richiesto"),
  email: z.string().email("Email non valida"),
  telefono: z.string().min(1, "Telefono richiesto"),
  codiceFiscale: z.string().min(1, "Codice fiscale richiesto"),
});

const schemaPrenotazione = z.object({
  corsoId: z.string(),
  numeroPosti: z.number().int().min(1).max(10),
  partecipanti: z.array(schemaPartecipante),
  note: z.string().optional().nullable(),
});

// GET: prenotazioni dell'utente corrente
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const prenotazioni = await prisma.prenotazione.findMany({
    where: { utenteId: session.user.id },
    include: {
      corso: {
        select: {
          titolo: true,
          dataInizio: true,
          orario: true,
          luogo: true,
          attestatoAbilitato: true,
        },
      },
      partecipanti: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(prenotazioni);
}

// POST: nuova prenotazione
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schemaPrenotazione.parse(body);

    const corso = await prisma.corso.findUnique({
      where: { id: data.corsoId, pubblicato: true },
    });

    if (!corso) {
      return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
    }

    const postiDisponibili = corso.postiTotali - corso.postiOccupati;
    if (postiDisponibili < data.numeroPosti) {
      return NextResponse.json(
        {
          error: `Posti insufficienti. Disponibili: ${postiDisponibili}`,
        },
        { status: 400 }
      );
    }

    if (data.partecipanti.length !== data.numeroPosti) {
      return NextResponse.json(
        {
          error: `Inserisci i dati per tutti i ${data.numeroPosti} partecipanti`,
        },
        { status: 400 }
      );
    }

    const scadenza = new Date(
      Date.now() + corso.timeoutPagamentoOre * 60 * 60 * 1000
    );

    const prenotazione = await prisma.$transaction(async (tx) => {
      const p = await tx.prenotazione.create({
        data: {
          utenteId: session.user.id,
          corsoId: data.corsoId,
          numeroPosti: data.numeroPosti,
          scadenzaPagamento: scadenza,
          note: data.note,
          partecipanti: {
            create: data.partecipanti,
          },
        },
        include: {
          corso: true,
          partecipanti: true,
        },
      });

      await tx.corso.update({
        where: { id: data.corsoId },
        data: { postiOccupati: { increment: data.numeroPosti } },
      });

      return p;
    });

    // Aggiorna anagrafica utente con i dati del primo partecipante
    const primoPartecipante = data.partecipanti[0];
    await prisma.utente.update({
      where: { id: session.user.id },
      data: {
        telefono: primoPartecipante.telefono || undefined,
        codiceFiscale: primoPartecipante.codiceFiscale || undefined,
      },
    });

    const utente = await prisma.utente.findUnique({
      where: { id: session.user.id },
    });

    const costoTotale = Number(corso.costo) * data.numeroPosti;
    const gratuito = costoTotale === 0;

    if (gratuito) {
      // Corso gratuito: conferma immediata senza passare per il pagamento
      await prisma.prenotazione.update({
        where: { id: prenotazione.id },
        data: { stato: "CONFERMATA", metodoPagamento: "BONIFICO", importoPagato: 0 },
      });

      if (utente) {
        inviaEmailConfermaPrenotazione(
          utente.email,
          `${utente.nome} ${utente.cognome}`,
          corso.titolo,
          corso.dataInizio
        ).catch(console.error);
      }

      return NextResponse.json({ ...prenotazione, gratuito: true }, { status: 201 });
    }

    // Corso a pagamento: notifiche standard
    if (utente) {
      inviaEmailPrenotazione(
        utente.email,
        `${utente.nome} ${utente.cognome}`,
        corso.titolo,
        data.numeroPosti,
        scadenza,
        corso.coordinateBancarie,
        prenotazione.id
      ).catch(console.error);
    }

    // Notifica segreterie
    const segreterie = await prisma.utente.findMany({
      where: { ruolo: "SEGRETERIA" },
      select: { email: true },
    });

    segreterie.forEach(({ email }) => {
      inviaEmailNotificaSegreteria(email, "nuova_prenotazione", {
        nomeUtente: utente ? `${utente.nome} ${utente.cognome}` : "Utente",
        titoloCorso: corso.titolo,
        prenotazioneId: prenotazione.id,
      }).catch(console.error);
    });

    return NextResponse.json({ ...prenotazione, gratuito: false }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Errore creazione prenotazione:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
