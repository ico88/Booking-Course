// Client-safe utilities — no Node.js / server-only imports

export const TAG_DEFAULT: { valore: string; etichetta: string }[] = [
  { valore: "fulld-sanitario", etichetta: "FULLD Sanitario" },
  { valore: "fulld-laico", etichetta: "FULLD Laico" },
  { valore: "msp", etichetta: "MSP" },
  { valore: "corsi-avanzati", etichetta: "Corsi Avanzati" },
  { valore: "bls-d", etichetta: "BLS-D" },
  { valore: "primo-soccorso", etichetta: "Primo Soccorso" },
  { valore: "disostruzione-pediatrica", etichetta: "Disostruzione Pediatrica" },
  { valore: "manovre-salva-vita", etichetta: "Manovre Salva Vita" },
];

export function parseTags(json: string): string[] {
  try { return JSON.parse(json) as string[]; } catch { return []; }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify([...new Set(tags.filter(Boolean))]);
}

export function etichettaTag(valore: string, disponibili: { valore: string; etichetta: string }[]): string {
  return disponibili.find((t) => t.valore === valore)?.etichetta ?? valore;
}
