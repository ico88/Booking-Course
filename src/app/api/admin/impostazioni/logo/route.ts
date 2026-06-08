import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const DIR_LOGO = path.join(process.cwd(), "public", "uploads", "logo");
const MIME_CONSENTITI = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

async function soloAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user.ruolo === "ADMIN" ? session : null;
}

export async function POST(request: NextRequest) {
  if (!(await soloAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
  }

  if (!MIME_CONSENTITI.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato non supportato. Usa PNG, JPG, WebP o SVG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File troppo grande (max 2 MB)" }, { status: 400 });
  }

  if (!existsSync(DIR_LOGO)) {
    await mkdir(DIR_LOGO, { recursive: true });
  }

  const ext = file.type === "image/svg+xml" ? "svg"
    : file.type === "image/webp" ? "webp"
    : file.type === "image/png" ? "png"
    : "jpg";

  // Rimuove il vecchio logo prima di salvarne uno nuovo
  const setting = await prisma.impostazione.findUnique({ where: { chiave: "logo_url" } });
  if (setting?.valore) {
    const vecchio = path.join(process.cwd(), "public", setting.valore.replace(/^\//, ""));
    if (existsSync(vecchio)) await unlink(vecchio).catch(() => null);
  }

  const nomeFile = `logo.${ext}`;
  const percorso = path.join(DIR_LOGO, nomeFile);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(percorso, buffer);

  const url = `/uploads/logo/${nomeFile}`;

  await prisma.impostazione.upsert({
    where: { chiave: "logo_url" },
    update: { valore: url },
    create: { chiave: "logo_url", valore: url, gruppo: "generale" },
  });

  return NextResponse.json({ url });
}

export async function DELETE() {
  if (!(await soloAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const setting = await prisma.impostazione.findUnique({ where: { chiave: "logo_url" } });
  if (setting?.valore) {
    const percorso = path.join(process.cwd(), "public", setting.valore.replace(/^\//, ""));
    if (existsSync(percorso)) await unlink(percorso).catch(() => null);
    await prisma.impostazione.delete({ where: { chiave: "logo_url" } });
  }

  return NextResponse.json({ message: "Logo rimosso" });
}
