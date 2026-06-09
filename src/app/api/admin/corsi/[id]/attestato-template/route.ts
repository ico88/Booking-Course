import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const TIPI_CONSENTITI = ["application/pdf", "image/jpeg", "image/png"];

// POST: carica template attestato per un corso
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const corso = await prisma.corso.findUnique({ where: { id } });

  if (!corso) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const abilita = formData.get("abilita") === "true";
  const htmlTemplate = formData.get("htmlTemplate") as string | null;

  if (!file && !htmlTemplate) {
    // Solo aggiornamento flag senza file
    await prisma.corso.update({
      where: { id },
      data: { attestatoAbilitato: abilita },
    });
    return NextResponse.json({ message: "Impostazione aggiornata" });
  }

  // Salvataggio template HTML (lo sfondo è già embedded come base64 data URL dal client)
  if (htmlTemplate !== null && !file) {
    const finalHtml = htmlTemplate || null;

    await prisma.corso.update({
      where: { id },
      data: {
        attestatoHtmlTemplate: finalHtml,
        attestatoAbilitato: abilita,
      },
    });
    return NextResponse.json({ message: "Template HTML salvato" });
  }

  if (!file) {
    return NextResponse.json({ error: "Nessun file fornito" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File troppo grande (max 20 MB)" },
      { status: 400 }
    );
  }

  if (!TIPI_CONSENTITI.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo file non supportato (solo PDF, JPG, PNG)" },
      { status: 400 }
    );
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "attestati-template"
  );
  await mkdir(uploadDir, { recursive: true });

  const estensione = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const nomeFile = `template_${id}_${Date.now()}.${estensione}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, nomeFile), buffer);

  const url = `/uploads/attestati-template/${nomeFile}`;

  await prisma.corso.update({
    where: { id },
    data: {
      attestatoTemplateUrl: url,
      attestatoNomeFile: file.name,
      attestatoAbilitato: abilita,
    },
  });

  return NextResponse.json({
    message: "Template attestato caricato con successo",
    url,
  });
}

// DELETE: rimuovi template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  await prisma.corso.update({
    where: { id },
    data: {
      attestatoTemplateUrl: null,
      attestatoNomeFile: null,
      attestatoHtmlTemplate: null,
      attestatoAbilitato: false,
    },
  });

  return NextResponse.json({ message: "Template rimosso" });
}
