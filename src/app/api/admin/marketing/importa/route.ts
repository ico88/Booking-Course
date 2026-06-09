import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeTags, parseTags } from "@/lib/leads";

// POST: import contacts from CSV text body
// Accepts JSON body: { csv: string, tagDefault: string[] }
// CSV format: email[,nome][,cognome][,tags...]
// tags column: comma-separated tags in a single quoted cell, or extra columns
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json() as { csv: string; tagDefault?: string[] };
  const { csv, tagDefault = [] } = body;

  if (!csv?.trim()) {
    return NextResponse.json({ error: "CSV vuoto" }, { status: 400 });
  }

  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Detect and skip header row
  const header = lines[0]?.toLowerCase() ?? "";
  const startIdx = header.includes("email") ? 1 : 0;

  let importati = 0;
  let aggiornati = 0;
  let saltati = 0;
  const errori: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length === 0) continue;

    const email = row[0]?.trim().toLowerCase();
    if (!email || !email.includes("@")) { saltati++; continue; }

    const nome = row[1]?.trim() || undefined;
    const cognome = row[2]?.trim() || undefined;

    // Tags: column index 3 may be a comma-separated list inside the cell,
    // OR columns 3+ are individual tags
    let tags: string[] = [...tagDefault];
    if (row[3]) {
      // Try to parse as comma-separated inside cell
      const cellTags = row[3].split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      // remaining columns after index 3 may also be tags
      const extraTags = row.slice(4).map((t) => t.trim()).filter(Boolean);
      tags = [...new Set([...tagDefault, ...cellTags, ...extraTags])];
    }

    try {
      const existing = await prisma.leadMarketing.findUnique({ where: { email } });
      if (existing) {
        // Merge tags
        const mergedTags = [...new Set([...parseTags(existing.tags), ...tags])];
        await prisma.leadMarketing.update({
          where: { email },
          data: {
            nome: nome ?? existing.nome ?? undefined,
            cognome: cognome ?? existing.cognome ?? undefined,
            tags: serializeTags(mergedTags),
            attivo: true,
          },
        });
        aggiornati++;
      } else {
        await prisma.leadMarketing.create({
          data: {
            email,
            nome,
            cognome,
            tags: serializeTags(tags),
            verificato: true, // imported contacts are treated as verified
            attivo: true,
          },
        });
        importati++;
      }
    } catch (err) {
      errori.push(`Riga ${i + 1} (${email}): ${(err as Error).message}`);
      saltati++;
    }
  }

  return NextResponse.json({ importati, aggiornati, saltati, errori });
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
