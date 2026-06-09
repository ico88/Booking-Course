import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

export async function GET(req: NextRequest, ctx: unknown) {
  return nextAuthHandler(req as unknown as Request, ctx as never);
}

export async function POST(req: NextRequest, ctx: unknown) {
  const ip = getClientIp(req);

  // 10 login attempts per IP per 15 minutes
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429 }
    );
  }

  return nextAuthHandler(req as unknown as Request, ctx as never);
}
