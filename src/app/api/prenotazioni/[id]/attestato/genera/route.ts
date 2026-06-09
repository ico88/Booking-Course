import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, sostituisciVariabiliAttestato } from "@/lib/utils";
import { generaPdfDaHtml } from "@/lib/pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const partecipanteId = request.nextUrl.searchParams.get("partecipante");
  const wantPdf = request.nextUrl.searchParams.get("pdf") === "1";

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      corso: true,
      utente: true,
      partecipanti: true,
    },
  });

  if (!prenotazione) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  // Only the booking owner (after emission) or admin/segreteria
  const isAdmin = ["ADMIN", "SEGRETERIA"].includes(session.user.ruolo);
  const isOwner = prenotazione.utenteId === session.user.id && prenotazione.attestatoEmesso;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const template = prenotazione.corso.attestatoHtmlTemplate;
  if (!template) {
    return NextResponse.json({ error: "Nessun template HTML configurato" }, { status: 400 });
  }

  const partecipante = partecipanteId
    ? prenotazione.partecipanti.find((p) => p.id === partecipanteId)
    : prenotazione.partecipanti[0];

  const nome = partecipante?.nome ?? prenotazione.utente.nome;
  const cognome = partecipante?.cognome ?? prenotazione.utente.cognome;
  const email = partecipante?.email ?? prenotazione.utente.email;
  const codiceFiscale = partecipante?.codiceFiscale ?? "";

  const oggi = new Date();
  const dataEmissione = oggi.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const anno = oggi.getFullYear().toString();
  const codiceAttestato = id.slice(-8).toUpperCase();

  const variabili: Record<string, string> = {
    nome,
    cognome,
    nomeCompleto: `${nome} ${cognome}`,
    codiceFiscale,
    email,
    titoloCorso: prenotazione.corso.titolo,
    dataCorso: formatDate(prenotazione.corso.dataInizio),
    dataFineCorso: prenotazione.corso.dataFine ? formatDate(prenotazione.corso.dataFine) : "",
    luogoCorso: prenotazione.corso.luogo ?? "",
    durataCorso: prenotazione.corso.durata ?? "",
    orarioCorso: prenotazione.corso.orario ?? "",
    dataEmissione,
    anno,
    codiceAttestato,
  };

  let html = sostituisciVariabiliAttestato(template, variabili);

  // Move base64 background-image from inline style to a <style> class
  // so Chrome's print renderer doesn't silently drop it.
  const bgMatch = html.match(/background-image:\s*url\(['"]?(data:[^'")\s]+)['"]?\)/);
  let bgClass = "";
  if (bgMatch) {
    bgClass = `.attestato-page{background-image:url('${bgMatch[1]}');background-size:cover;background-position:center;}`;
    html = html
      .replace(bgMatch[0], "")
      .replace(/<div /, '<div class="attestato-page" ');
  }

  if (!html.includes("<html")) {
    html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attestato — ${nome} ${cognome}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    ${bgClass}
    body { margin: 0; padding: 0; font-family: serif; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:999">
    <button onclick="window.print()" style="padding:10px 20px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:sans-serif">
      Stampa / Salva PDF
    </button>
  </div>
  ${html}
</body>
</html>`;
  }

  if (wantPdf) {
    const pdf = await generaPdfDaHtml(html);
    const filename = `attestato-${nome.toLowerCase().replace(/\s+/g, "-")}-${cognome.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
