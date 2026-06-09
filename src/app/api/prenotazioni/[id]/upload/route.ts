import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  inviaEmailContabileCaricata,
  inviaEmailNotificaSegreteria,
} from "@/lib/email";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const TIPI_CONSENTITI = ["image/jpeg", "image/png", "application/pdf"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: { corso: { select: { titolo: true } } },
  });

  if (!prenotazione) {
    return NextResponse.json(
      { error: "Prenotazione non trovata" },
      { status: 404 }
    );
  }

  if (
    !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo) &&
    prenotazione.utenteId !== session.user.id
  ) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  if (prenotazione.stato !== "IN_ATTESA_PAGAMENTO") {
    return NextResponse.json(
      { error: "Contabile già caricata o prenotazione non in attesa" },
      { status: 400 }
    );
  }

  if (new Date() > prenotazione.scadenzaPagamento) {
    return NextResponse.json(
      { error: "La prenotazione è scaduta" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File richiesto" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File troppo grande (max 10 MB)" },
      { status: 400 }
    );
  }

  if (!TIPI_CONSENTITI.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo file non supportato (solo JPG, PNG, PDF)" },
      { status: 400 }
    );
  }

  const estensione = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const nomeFile = `contabile_${id}_${Date.now()}.${estensione}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "contabili");

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, nomeFile), buffer);

  const urlContabile = `/uploads/contabili/${nomeFile}`;

  await prisma.prenotazione.update({
    where: { id },
    data: {
      urlContabile,
      nomeFileContabile: file.name,
      stato: "PAGAMENTO_CARICATO",
    },
  });

  const utente = await prisma.utente.findUnique({
    where: { id: session.user.id },
  });

  // Notifiche (non bloccanti)
  if (utente) {
    inviaEmailContabileCaricata(
      utente.email,
      `${utente.nome} ${utente.cognome}`,
      prenotazione.corso.titolo
    ).catch(console.error);
  }

  const segreterie = await prisma.utente.findMany({
    where: { ruolo: "SEGRETERIA" },
    select: { email: true },
  });

  segreterie.forEach(({ email }) => {
    inviaEmailNotificaSegreteria(email, "contabile_caricata", {
      nomeUtente: utente ? `${utente.nome} ${utente.cognome}` : "Utente",
      titoloCorso: prenotazione.corso.titolo,
      prenotazioneId: id,
    }).catch(console.error);
  });

  return NextResponse.json({ message: "Contabile caricata con successo", url: urlContabile });
}
