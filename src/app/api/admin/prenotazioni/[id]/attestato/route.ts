import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { inviaEmailAttestato } from "@/lib/email";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const TIPI_CONSENTITI = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      utente: true,
      corso: { select: { titolo: true, attestatoAbilitato: true } },
    },
  });

  if (!prenotazione) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  if (prenotazione.stato !== "CONFERMATA") {
    return NextResponse.json(
      { error: "L'attestato può essere emesso solo per prenotazioni confermate" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const fileUpload = formData.get("file") as File | null;

  if (!fileUpload) {
    return NextResponse.json({ error: "Carica un file attestato (PDF, JPG o PNG)" }, { status: 400 });
  }

  if (fileUpload.size > MAX_SIZE) {
    return NextResponse.json({ error: "File troppo grande (max 20 MB)" }, { status: 400 });
  }

  if (!TIPI_CONSENTITI.includes(fileUpload.type)) {
    return NextResponse.json({ error: "Tipo file non supportato (solo PDF, JPG, PNG)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "attestati");
  await mkdir(uploadDir, { recursive: true });

  const estensione = fileUpload.name.split(".").pop()?.toLowerCase() || "pdf";
  const nomeFile = `attestato_${id}_${Date.now()}.${estensione}`;
  const buffer = Buffer.from(await fileUpload.arrayBuffer());
  await writeFile(path.join(uploadDir, nomeFile), buffer);
  const urlAttestato = `/uploads/attestati/${nomeFile}`;

  await prisma.prenotazione.update({
    where: { id },
    data: {
      attestatoUrl: urlAttestato,
      attestatoEmesso: true,
      attestatoEmessoAt: new Date(),
    },
  });

  inviaEmailAttestato(
    prenotazione.utente.email,
    `${prenotazione.utente.nome} ${prenotazione.utente.cognome}`,
    prenotazione.corso.titolo,
    id
  ).catch(console.error);

  return NextResponse.json({ message: "Attestato emesso con successo", url: urlAttestato });
}
