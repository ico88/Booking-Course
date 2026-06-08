import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import FormCorso from "@/components/corsi/FormCorso";
import UploadTemplateAttestato from "./UploadTemplateAttestato";

export default async function PaginaModificaCorso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const corso = await prisma.corso.findUnique({ where: { id } });

  if (!corso) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/corsi"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tutti i corsi
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Modifica: {corso.titolo}
      </h1>

      <div className="space-y-6">
        <Card>
          <FormCorso
            corsoId={corso.id}
            modalita="modifica"
            valoriIniziali={{
              titolo: corso.titolo,
              descrizione: corso.descrizione,
              dataInizio: corso.dataInizio,
              dataFine: corso.dataFine,
              orario: corso.orario,
              durata: corso.durata ?? "",
              luogo: corso.luogo ?? "",
              costo: Number(corso.costo),
              postiTotali: corso.postiTotali,
              timeoutPagamentoOre: corso.timeoutPagamentoOre,
              coordinateBancarie: corso.coordinateBancarie,
              pubblicato: corso.pubblicato,
              attestatoAbilitato: corso.attestatoAbilitato,
            }}
          />
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Template attestato
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Carica un template (PDF, immagine) che verrà usato come base per
            gli attestati dei partecipanti. Puoi anche caricare attestati
            personalizzati per ogni prenotazione dalla sezione Prenotazioni.
          </p>
          <UploadTemplateAttestato
            corsoId={corso.id}
            templateAttuale={corso.attestatoTemplateUrl}
            nomeFile={corso.attestatoNomeFile}
            abilitato={corso.attestatoAbilitato}
          />
        </Card>
      </div>
    </div>
  );
}
