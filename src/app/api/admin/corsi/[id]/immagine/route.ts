import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const TIPI_CONSENTITI = ["image/jpeg", "image/png", "image/webp"];

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
  if (!corso) return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File troppo grande (max 5 MB)" }, { status: 400 });
  if (!TIPI_CONSENTITI.includes(file.type)) {
    return NextResponse.json({ error: "Formato non supportato (JPG, PNG, WebP)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "corsi");
  await mkdir(uploadDir, { recursive: true });

  const estensione = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const nomeFile = `corso_${id}_${Date.now()}.${estensione}`;
  await writeFile(path.join(uploadDir, nomeFile), Buffer.from(await file.arrayBuffer()));

  // Rimuovi vecchia immagine se era un upload locale
  if (corso.immagineUrl?.startsWith("/uploads/corsi/")) {
    const vecchio = path.join(process.cwd(), "public", corso.immagineUrl);
    unlink(vecchio).catch(() => {});
  }

  const url = `/uploads/corsi/${nomeFile}`;
  await prisma.corso.update({ where: { id }, data: { immagineUrl: url } });

  return NextResponse.json({ url });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const corso = await prisma.corso.findUnique({ where: { id } });
  if (corso?.immagineUrl?.startsWith("/uploads/corsi/")) {
    const vecchio = path.join(process.cwd(), "public", corso.immagineUrl);
    unlink(vecchio).catch(() => {});
  }

  await prisma.corso.update({ where: { id }, data: { immagineUrl: null } });
  return NextResponse.json({ ok: true });
}
