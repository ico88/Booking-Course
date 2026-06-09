import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PagineLegaliClient from "./PagineLegaliClient";

export const dynamic = "force-dynamic";

const CHIAVI = [
  "pagina_privacy_policy",
  "pagina_cookie_policy",
  "pagina_termini_condizioni",
] as const;

type ChiavePagina = (typeof CHIAVI)[number];

export default async function PaginaPagineLegali() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.ruolo !== "ADMIN") redirect("/admin");

  const impostazioni = await prisma.impostazione.findMany({
    where: { chiave: { in: [...CHIAVI] } },
  });

  const defaults: Record<ChiavePagina, string> = {
    pagina_privacy_policy: "",
    pagina_cookie_policy: "",
    pagina_termini_condizioni: "",
  };

  for (const i of impostazioni) {
    if (CHIAVI.includes(i.chiave as ChiavePagina)) {
      defaults[i.chiave as ChiavePagina] = i.valore;
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagine Legali</h1>
      <p className="text-gray-500 mb-8">
        Personalizza il contenuto di Privacy Policy, Cookie Policy e Termini e
        Condizioni. Se lasci vuoto, viene mostrato il testo predefinito del
        sistema.
      </p>
      <PagineLegaliClient defaults={defaults} />
    </div>
  );
}
