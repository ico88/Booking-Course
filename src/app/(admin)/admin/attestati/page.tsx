import { prisma } from "@/lib/prisma";
import { GraduationCap } from "lucide-react";
import AttestatiClient from "./AttestatiClient";

export const revalidate = 0;

export default async function PaginaAdminAttestati() {
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      stato: "CONFERMATA",
      corso: { attestatoAbilitato: true },
    },
    include: {
      utente: { select: { nome: true, cognome: true, email: true } },
      corso: { select: { titolo: true, dataInizio: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const emessi = prenotazioni.filter((p) => p.attestatoEmesso);
  const daEmettere = prenotazioni.filter((p) => !p.attestatoEmesso);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-purple-600" />
        Attestati
      </h1>
      <AttestatiClient emessi={emessi} daEmettere={daEmettere} />
    </div>
  );
}
