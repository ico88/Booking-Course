import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function csvCell(s: string | null | undefined): string {
  const v = s ?? "";
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id: corsoId } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const tuttiStati = request.nextUrl.searchParams.get("stato") === "tutti";

  const stati = tuttiStati
    ? ["CONFERMATA", "PAGAMENTO_CARICATO", "IN_ATTESA_PAGAMENTO"]
    : ["CONFERMATA", "PAGAMENTO_CARICATO"];

  const corso = await prisma.corso.findUnique({
    where: { id: corsoId },
    select: {
      titolo: true,
      dataInizio: true,
      dataFine: true,
      orario: true,
      luogo: true,
      postiTotali: true,
    },
  });

  if (!corso) {
    return NextResponse.json({ error: "Corso non trovato" }, { status: 404 });
  }

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      corsoId,
      stato: { in: stati as ("CONFERMATA" | "PAGAMENTO_CARICATO" | "IN_ATTESA_PAGAMENTO")[] },
    },
    include: {
      partecipanti: { orderBy: [{ cognome: "asc" }, { nome: "asc" }] },
    },
    orderBy: { createdAt: "asc" },
  });

  // Flatten: each Partecipante row + metadata from its Prenotazione
  interface Row {
    n: number;
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    stato: string;
    attestato: boolean;
    prenotazioneId: string;
  }

  const rows: Row[] = [];
  let n = 0;
  for (const pren of prenotazioni) {
    for (const part of pren.partecipanti) {
      n++;
      rows.push({
        n,
        nome: part.nome,
        cognome: part.cognome,
        email: part.email ?? "",
        telefono: part.telefono ?? "",
        stato: pren.stato,
        attestato: pren.attestatoEmesso,
        prenotazioneId: pren.id,
      });
    }
  }

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (format === "json") {
    return NextResponse.json({ corso, rows, totale: rows.length });
  }

  const dataCorso = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" })
    .format(corso.dataInizio);
  const generato = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date());

  // ── CSV ──────────────────────────────────────────────────────────────────
  if (format === "csv") {
    const header = ["N", "Cognome", "Nome", "Email", "Telefono", "Stato", "Attestato"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.n,
          csvCell(r.cognome),
          csvCell(r.nome),
          csvCell(r.email),
          csvCell(r.telefono),
          r.stato,
          r.attestato ? "Sì" : "No",
        ].join(",")
      ),
    ];
    const csvContent = "﻿" + lines.join("\r\n"); // BOM for Excel
    const filename = `partecipanti_${corso.titolo.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // ── HTML (print) ──────────────────────────────────────────────────────────
  const statoLabel: Record<string, string> = {
    CONFERMATA: "Confermata",
    PAGAMENTO_CARICATO: "Verifica",
    IN_ATTESA_PAGAMENTO: "In attesa",
  };
  const statiColori: Record<string, string> = {
    CONFERMATA: "#16a34a",
    PAGAMENTO_CARICATO: "#d97706",
    IN_ATTESA_PAGAMENTO: "#6b7280",
  };

  const righeHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="text-align:center;color:#6b7280;">${r.n}</td>
      <td><strong>${esc(r.cognome)}</strong></td>
      <td>${esc(r.nome)}</td>
      <td>${esc(r.email)}</td>
      <td>${esc(r.telefono)}</td>
      <td style="text-align:center;">
        <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;
              background:${statiColori[r.stato] ?? "#6b7280"}22;color:${statiColori[r.stato] ?? "#6b7280"};">
          ${esc(statoLabel[r.stato] ?? r.stato)}
        </span>
      </td>
      <td style="text-align:center;">${r.attestato ? "✔" : "—"}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elenco Partecipanti — ${esc(corso.titolo)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:24px 32px;}
    .no-print{margin-bottom:16px;}
    .btn{display:inline-flex;align-items:center;gap:6px;background:#dc2626;color:#fff;border:none;
         padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;}
    .btn-secondary{background:#f3f4f6;color:#374151;margin-left:8px;}
    header{border-bottom:3px solid #dc2626;padding-bottom:12px;margin-bottom:20px;}
    .org{font-size:11px;color:#dc2626;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
    h1{font-size:20px;font-weight:700;color:#111;}
    .meta{display:flex;gap:24px;margin-top:8px;flex-wrap:wrap;}
    .meta span{font-size:11px;color:#6b7280;}
    .meta strong{color:#374151;}
    .summary{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;}
    .badge{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 14px;font-size:11px;}
    .badge strong{display:block;font-size:18px;color:#dc2626;}
    table{width:100%;border-collapse:collapse;}
    th{background:#dc2626;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;
       letter-spacing:0.5px;padding:8px 10px;text-align:left;}
    th:first-child,th:last-child,th:nth-child(6){text-align:center;}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
    tr:nth-child(even) td{background:#fafafa;}
    tr:hover td{background:#fef2f2;}
    tfoot td{background:#f3f4f6;font-weight:600;padding:8px 10px;border-top:2px solid #e5e7eb;}
    footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;
           display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;}
    @media print{
      .no-print{display:none!important;}
      body{padding:0;}
      header{page-break-inside:avoid;}
      tr{page-break-inside:avoid;}
    }
    @page{margin:1.5cm 1.2cm;size:A4;}
  </style>
</head>
<body>

<div class="no-print">
  <button class="btn" onclick="window.print()">🖨 Stampa / Salva PDF</button>
  <button class="btn btn-secondary" onclick="window.close()">✕ Chiudi</button>
</div>

<header>
  <div class="org">Elenco Partecipanti</div>
  <h1>${esc(corso.titolo)}</h1>
  <div class="meta">
    <span>📅 <strong>${esc(dataCorso)}${corso.dataFine ? " – " + new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(corso.dataFine) : ""}</strong></span>
    <span>🕐 <strong>${esc(corso.orario)}</strong></span>
    ${corso.luogo ? `<span>📍 <strong>${esc(corso.luogo)}</strong></span>` : ""}
  </div>
</header>

<div class="summary">
  <div class="badge"><strong>${rows.length}</strong>Partecipanti</div>
  <div class="badge"><strong>${prenotazioni.length}</strong>Prenotazioni</div>
  <div class="badge"><strong>${rows.filter((r) => r.attestato).length}</strong>Attestati emessi</div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:36px;">#</th>
      <th>Cognome</th>
      <th>Nome</th>
      <th>Email</th>
      <th>Telefono</th>
      <th style="width:90px;">Stato</th>
      <th style="width:70px;">Attestato</th>
    </tr>
  </thead>
  <tbody>
    ${righeHtml || '<tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af;font-style:italic;">Nessun partecipante trovato</td></tr>'}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="5">Totale</td>
      <td></td>
      <td style="text-align:center;">${rows.filter((r) => r.attestato).length} / ${rows.length}</td>
    </tr>
  </tfoot>
</table>

<footer>
  <span>Generato il ${esc(generato)}</span>
  <span>Gestione Corsi</span>
</footer>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
