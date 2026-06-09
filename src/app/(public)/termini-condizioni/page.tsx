import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TERMINI_CONDIZIONI } from "@/lib/pagine-legali-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termini e Condizioni",
  description: "Termini e condizioni d'uso della piattaforma.",
};

export default async function PaginaTerminiCondizioni() {
  const impostazione = await prisma.impostazione
    .findUnique({ where: { chiave: "pagina_termini_condizioni" } })
    .catch(() => null);

  const html = impostazione?.valore || DEFAULT_TERMINI_CONDIZIONI;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Termini e Condizioni d&apos;Uso</h1>
      <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div
        className="space-y-8 text-gray-700 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
