import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = process.env.APP_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${base}/conferma-iscrizione?status=invalid`);
  }

  const lead = await prisma.leadMarketing.findUnique({ where: { tokenVerifica: token } });

  if (!lead) {
    return NextResponse.redirect(`${base}/conferma-iscrizione?status=invalid`);
  }

  if (lead.tokenScadenza && lead.tokenScadenza < new Date()) {
    return NextResponse.redirect(`${base}/conferma-iscrizione?status=scaduto`);
  }

  await prisma.leadMarketing.update({
    where: { id: lead.id },
    data: { verificato: true, tokenVerifica: null, tokenScadenza: null },
  });

  return NextResponse.redirect(`${base}/conferma-iscrizione?status=ok`);
}
