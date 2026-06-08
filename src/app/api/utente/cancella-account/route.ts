import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const utente = await prisma.utente.findUnique({
    where: { id: session.user.id },
    select: {
      ruolo: true,
      prenotazioni: {
        where: { stato: { in: ["IN_ATTESA_PAGAMENTO", "PAGAMENTO_CARICATO"] } },
        select: { id: true },
      },
    },
  });

  if (!utente) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (utente.ruolo === "ADMIN" || utente.ruolo === "SEGRETERIA") {
    return NextResponse.json(
      { error: "Gli account con ruolo SEGRETERIA o ADMIN non possono essere cancellati automaticamente. Contatta l'amministratore di sistema." },
      { status: 403 }
    );
  }

  if (utente.prenotazioni.length > 0) {
    return NextResponse.json(
      { error: "Hai prenotazioni attive con pagamento in sospeso. Attendi la scadenza o contatta la segreteria prima di cancellare l'account." },
      { status: 409 }
    );
  }

  // Anonimizzazione: sostituisce i dati personali con valori anonimi
  // conservando i record di prenotazione per obblighi contabili
  const timestamp = Date.now();
  await prisma.utente.update({
    where: { id: session.user.id },
    data: {
      nome: "Utente",
      cognome: "Cancellato",
      email: `cancellato-${timestamp}@rimosso.invalid`,
      telefono: null,
      password: null,
      tokenReset: null,
      scadenzaToken: null,
      consensoPrivacy: false,
      consensoMarketing: false,
    },
  });

  // Rimuove sessioni attive e account OAuth
  await prisma.session.deleteMany({ where: { utenteId: session.user.id } });
  await prisma.account.deleteMany({ where: { utenteId: session.user.id } });

  return NextResponse.json({ message: "Account cancellato con successo" });
}
