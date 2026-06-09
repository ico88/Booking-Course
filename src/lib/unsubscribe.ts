import crypto from "crypto";

function secret(): string {
  return process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production";
}

export function generaTokenDisiscrizione(userId: string): string {
  return crypto.createHmac("sha256", secret()).update(userId).digest("hex");
}

export function verificaTokenDisiscrizione(userId: string, token: string): boolean {
  try {
    const expected = generaTokenDisiscrizione(userId);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(token, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function urlDisiscrizione(userId: string): string {
  const base = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const token = generaTokenDisiscrizione(userId);
  return `${base}/api/disiscrivi?uid=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
}
