import { prisma } from "@/lib/prisma";

export type MetodoPagamento = "BONIFICO" | "STRIPE" | "PAYPAL";

export interface ConfigPagamento {
  metodiAbilitati: MetodoPagamento[];
  stripe: { publishableKey: string; secretKey: string } | null;
  paypal: { clientId: string; clientSecret: string; mode: "sandbox" | "live" } | null;
}

export async function getConfigPagamento(): Promise<ConfigPagamento> {
  const records = await prisma.impostazione.findMany({
    where: {
      chiave: {
        in: [
          "metodi_pagamento",
          "stripe_publishable_key",
          "stripe_secret_key",
          "paypal_client_id",
          "paypal_client_secret",
          "paypal_mode",
        ],
      },
    },
  });

  const m: Record<string, string> = {};
  records.forEach((r) => { m[r.chiave] = r.valore; });

  let metodiAbilitati: MetodoPagamento[] = ["BONIFICO"];
  try {
    if (m["metodi_pagamento"]) {
      const parsed = JSON.parse(m["metodi_pagamento"]) as MetodoPagamento[];
      // BONIFICO is always included
      metodiAbilitati = ["BONIFICO", ...parsed.filter((x) => x !== "BONIFICO")];
    }
  } catch { /* use default */ }

  const stripe =
    m["stripe_publishable_key"] && m["stripe_secret_key"]
      ? { publishableKey: m["stripe_publishable_key"], secretKey: m["stripe_secret_key"] }
      : null;

  const paypal =
    m["paypal_client_id"] && m["paypal_client_secret"]
      ? {
          clientId: m["paypal_client_id"],
          clientSecret: m["paypal_client_secret"],
          mode: (m["paypal_mode"] as "sandbox" | "live") || "sandbox",
        }
      : null;

  return { metodiAbilitati, stripe, paypal };
}

// PayPal access token helper
export async function getPaypalAccessToken(
  clientId: string,
  clientSecret: string,
  mode: "sandbox" | "live"
): Promise<string> {
  const base =
    mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function paypalBaseUrl(mode: "sandbox" | "live"): string {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}
