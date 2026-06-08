import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Solo ADMIN può leggere/scrivere le impostazioni sensibili
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const impostazioni = await prisma.impostazione.findMany({
    orderBy: [{ gruppo: "asc" }, { chiave: "asc" }],
  });

  // Maschera i valori sensibili nella risposta
  const CHIAVI_SENSIBILI = ["smtp_password", "whatsapp_token", "telegram_token", "nextauth_secret"];
  const dati = impostazioni.map((i) => ({
    ...i,
    valore: CHIAVI_SENSIBILI.includes(i.chiave) && i.valore
      ? "••••••••"
      : i.valore,
    sensibile: CHIAVI_SENSIBILI.includes(i.chiave),
  }));

  return NextResponse.json(dati);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json();
  const { impostazioni } = body as {
    impostazioni: { chiave: string; valore: string; gruppo: string }[];
  };

  if (!Array.isArray(impostazioni)) {
    return NextResponse.json({ error: "Formato non valido" }, { status: 400 });
  }

  // Upsert di tutte le impostazioni
  await Promise.all(
    impostazioni
      .filter((i) => i.valore !== "••••••••") // Non sovrascrivere i valori mascherati
      .map((i) =>
        prisma.impostazione.upsert({
          where: { chiave: i.chiave },
          update: { valore: i.valore, gruppo: i.gruppo },
          create: { chiave: i.chiave, valore: i.valore, gruppo: i.gruppo },
        })
      )
  );

  return NextResponse.json({ message: "Impostazioni salvate" });
}
