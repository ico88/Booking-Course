import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRIVACY_POLICY } from "@/lib/pagine-legali-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR.",
};

export default async function PaginaPrivacyPolicy() {
  const impostazione = await prisma.impostazione
    .findUnique({ where: { chiave: "pagina_privacy_policy" } })
    .catch(() => null);

  const html = impostazione?.valore || DEFAULT_PRIVACY_POLICY;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div
        className="space-y-8 text-gray-700 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
