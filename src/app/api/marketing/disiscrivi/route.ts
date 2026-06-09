import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificaTokenDisiscrizione } from "@/lib/leads";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const base = process.env.APP_URL ?? "http://localhost:3000";

  if (!email || !token || !verificaTokenDisiscrizione(email, token)) {
    return NextResponse.redirect(`${base}/conferma-iscrizione?status=invalid`);
  }

  try {
    await prisma.leadMarketing.updateMany({
      where: { email },
      data: { attivo: false },
    });
    return NextResponse.redirect(`${base}/conferma-iscrizione?status=disiscritta`);
  } catch {
    return NextResponse.redirect(`${base}/conferma-iscrizione?status=error`);
  }
}
