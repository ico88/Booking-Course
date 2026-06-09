import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["SEGRETERIA", "ADMIN"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;

  const originale = await prisma.corso.findUnique({ where: { id } });
  if (!originale) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  // Crea il nuovo corso senza template (lo aggiungiamo dopo, usando il nuovo id)
  const nuovoCorso = await prisma.corso.create({
    data: {
      titolo: originale.titolo,
      descrizione: originale.descrizione,
      dataInizio: originale.dataInizio,
      dataFine: originale.dataFine,

      durata: originale.durata,
      luogo: originale.luogo,
      costo: originale.costo,
      postiTotali: originale.postiTotali,
      postiOccupati: 0,
      timeoutPagamentoOre: originale.timeoutPagamentoOre,
      coordinateBancarie: originale.coordinateBancarie,
      pubblicato: false,
      attestatoAbilitato: originale.attestatoAbilitato,
      attestatoTemplateUrl: null,
      attestatoNomeFile: null,
    },
  });

  // Copia il file template se esiste
  if (originale.attestatoTemplateUrl) {
    const srcAbs = path.join(
      process.cwd(),
      "public",
      originale.attestatoTemplateUrl.replace(/^\//, "")
    );
    if (existsSync(srcAbs)) {
      const ext = path.extname(srcAbs);
      const nomeFileCopia = `${nuovoCorso.id}${ext}`;
      const dirTemplate = path.join(process.cwd(), "public", "uploads", "attestati-template");
      await mkdir(dirTemplate, { recursive: true });
      const dstAbs = path.join(dirTemplate, nomeFileCopia);
      await copyFile(srcAbs, dstAbs);

      await prisma.corso.update({
        where: { id: nuovoCorso.id },
        data: {
          attestatoTemplateUrl: `/uploads/attestati-template/${nomeFileCopia}`,
          attestatoNomeFile: originale.attestatoNomeFile,
        },
      });
    }
  }

  return NextResponse.json({ id: nuovoCorso.id });
}
