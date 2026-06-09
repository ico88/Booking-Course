import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificaTokenDisiscrizione } from "@/lib/unsubscribe";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const base = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";

  if (!uid || !token || !verificaTokenDisiscrizione(uid, token)) {
    return NextResponse.redirect(`${base}/disiscrivi?status=invalid`);
  }

  try {
    await prisma.utente.update({
      where: { id: uid },
      data: { consensoMarketing: false },
    });
  } catch {
    return NextResponse.redirect(`${base}/disiscrivi?status=error`);
  }

  return NextResponse.redirect(`${base}/disiscrivi?status=ok`);
}
