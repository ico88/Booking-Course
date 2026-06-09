import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generaPdfDaHtml } from "@/lib/pdf";

// POST: genera un PDF da HTML inviato dal client (usato dall'editor visivo per l'anteprima)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  let html: string;
  try {
    const body = await request.json() as { html?: string };
    if (!body.html || typeof body.html !== "string") {
      return NextResponse.json({ error: "Campo html mancante" }, { status: 400 });
    }
    html = body.html;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  try {
    const pdf = await generaPdfDaHtml(html);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="anteprima-attestato.pdf"',
      },
    });
  } catch (err) {
    console.error("Errore generazione PDF anteprima:", err);
    return NextResponse.json({ error: "Errore generazione PDF" }, { status: 500 });
  }
}
