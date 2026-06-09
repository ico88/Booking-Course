import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import FormCorso from "@/components/corsi/FormCorso";
import UploadTemplateAttestato from "./UploadTemplateAttestato";
import DuplicaCorsoButton from "../DuplicaCorsoButton";
import NotificaMarketingButton from "./NotificaMarketingButton";

export default async function PaginaModificaCorso({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicato?: string }>;
}) {
  const { id } = await params;
  const { duplicato } = await searchParams;

  const [corso, contattiMarketing] = await Promise.all([
    prisma.corso.findUnique({ where: { id } }),
    prisma.utente.count({ where: { consensoMarketing: true, ruolo: "UTENTE" } }),
  ]);

  if (!corso) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/corsi"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tutti i corsi
        </Link>
        <DuplicaCorsoButton corsoId={corso.id} variant="page" />
      </div>

      {duplicato === "1" && (
        <Alert variant="warning" className="mb-6">
          <strong>Corso duplicato come bozza.</strong> Aggiorna le date, l'orario
          e il titolo se necessario, poi pubblica il corso.
        </Alert>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {corso.pubblicato ? corso.titolo : (
          <span className="flex items-center gap-2">
            {corso.titolo}
            <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">bozza</span>
          </span>
        )}
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
          <div className="flex items-center gap-3 mb-1">
            <Send className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notifica marketing
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Invia un annuncio email a tutti gli utenti che hanno acconsentito
            a ricevere comunicazioni sui nuovi corsi.
          </p>
          <NotificaMarketingButton
            corsoId={corso.id}
            contattiMarketing={contattiMarketing}
            ultimaNotifica={corso.ultimaNotificaMarketing}
            pubblicato={corso.pubblicato}
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
