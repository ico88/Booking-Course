import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, sostituisciVariabiliAttestato } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const partecipanteId = request.nextUrl.searchParams.get("partecipante");

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

  const template = prenotazione.corso.attestatoHtmlTemplate;
  if (!template) {
    return NextResponse.json({ error: "Nessun template HTML configurato per questo corso" }, { status: 400 });
  }

  // Scegli partecipante: specifico o primo disponibile
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

  // Wrap in a print-ready page if template doesn't include <html>
  if (!html.includes("<html")) {
    html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attestato — ${nome} ${cognome}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
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

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
