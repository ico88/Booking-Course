import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inviaNotificaLeads } from "@/lib/leads";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { corsoId } = (await request.json()) as { corsoId?: string };
  if (!corsoId) {
    return NextResponse.json({ error: "corsoId mancante" }, { status: 400 });
  }

  try {
    const result = await inviaNotificaLeads(corsoId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
