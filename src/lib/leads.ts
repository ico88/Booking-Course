import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { TAG_DEFAULT, parseTags, serializeTags, etichettaTag } from "@/lib/leads-shared";

export { TAG_DEFAULT, parseTags, serializeTags, etichettaTag };

export async function getTagsDisponibili(): Promise<{ valore: string; etichetta: string }[]> {
  try {
    const row = await prisma.impostazione.findUnique({ where: { chiave: "marketing_tags" } });
    if (row?.valore) return JSON.parse(row.valore) as { valore: string; etichetta: string }[];
  } catch { /* fallback */ }
  return TAG_DEFAULT;
}

// ── Token ────────────────────────────────────────────────────────────────────

export function generaTokenVerifica(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generaTokenDisiscrizione(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback";
  return crypto.createHmac("sha256", secret).update(email).digest("hex");
}

export function verificaTokenDisiscrizione(email: string, token: string): boolean {
  const expected = generaTokenDisiscrizione(email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch { return false; }
}

export function urlDisiscrizione(email: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const token = generaTokenDisiscrizione(email);
  return `${base}/api/marketing/disiscrivi?email=${encodeURIComponent(email)}&token=${token}`;
}

// ── Age filter ───────────────────────────────────────────────────────────────

export async function getMesiMax(): Promise<number> {
  try {
    const row = await prisma.impostazione.findUnique({ where: { chiave: "marketing_mesi_max" } });
    const v = Number(row?.valore);
    if (v > 0) return v;
  } catch { /* ignore */ }
  return 36; // default 3 years
}

// ── Matching ─────────────────────────────────────────────────────────────────

export function tagsMatch(tagsCorso: string[], tagsLead: string[]): boolean {
  if (tagsCorso.length === 0) return true; // untagged course → notify all
  return tagsLead.some((t) => tagsCorso.includes(t));
}

// ── Auto-notification on publish ─────────────────────────────────────────────

export async function inviaNotificaLeads(corsoId: string): Promise<{ inviati: number; saltati: number }> {
  const { inviaEmailCorsoLead } = await import("@/lib/email");

  const [corso, mesiMax] = await Promise.all([
    prisma.corso.findUnique({ where: { id: corsoId } }),
    getMesiMax(),
  ]);

  if (!corso) return { inviati: 0, saltati: 0 };

  const tagsCorso = parseTags(corso.tags);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - mesiMax);

  const leads = await prisma.leadMarketing.findMany({
    where: { verificato: true, attivo: true, createdAt: { gte: cutoff } },
  });

  let inviati = 0;
  let saltati = 0;

  await Promise.allSettled(
    leads.map(async (lead) => {
      if (!tagsMatch(tagsCorso, parseTags(lead.tags))) { saltati++; return; }
      try {
        await inviaEmailCorsoLead(lead, corso, urlDisiscrizione(lead.email));
        inviati++;
      } catch { saltati++; }
    })
  );

  // Record timestamp
  await prisma.corso.update({
    where: { id: corsoId },
    data: { ultimaNotificaLeads: new Date() },
  });

  return { inviati, saltati };
}
