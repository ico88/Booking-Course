import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  STATI_PRENOTAZIONE,
} from "@/lib/utils";
import { ArrowLeft, GraduationCap, Download, Users } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import UploadContabile from "./UploadContabile";

export default async function PaginaPrenotazione({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuova?: string }>;
}) {
  const { id } = await params;
  const { nuova } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/login");

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      corso: true,
      partecipanti: true,
    },
  });

  if (!prenotazione) notFound();

  if (prenotazione.utenteId !== session.user.id) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600 font-medium">
          Non sei autorizzato a vedere questa prenotazione.
        </p>
      </div>
    );
  }

  const stato = STATI_PRENOTAZIONE[prenotazione.stato];
  const isScaduta =
    prenotazione.stato === "IN_ATTESA_PAGAMENTO" &&
    new Date() > prenotazione.scadenzaPagamento;
  const costoTotale =
    Number(prenotazione.corso.costo) * prenotazione.numeroPosti;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Le mie prenotazioni
      </Link>

      {nuova === "1" && (
        <Alert variant="success" title="Prenotazione effettuata!" className="mb-6">
          La tua prenotazione è stata registrata. Effettua il bonifico entro la
          scadenza e carica la ricevuta qui sotto per confermare il tuo posto.
        </Alert>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {prenotazione.corso.titolo}
          </h1>
          <p className="text-gray-500 mt-1">
            {formatDate(prenotazione.corso.dataInizio)} ·{" "}
            {prenotazione.corso.orario}
            {prenotazione.corso.luogo && ` · ${prenotazione.corso.luogo}`}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium shrink-0 ${stato?.bg || ""} ${stato?.color || ""}`}
        >
          {isScaduta ? "Scaduta" : stato?.label || prenotazione.stato}
        </span>
      </div>

      <div className="grid gap-4">
        {/* Attestato */}
        {prenotazione.attestatoEmesso && (prenotazione.attestatoUrl || prenotazione.corso.attestatoHtmlTemplate) && (
          <Card className="border-purple-200 bg-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-900">Attestato disponibile!</p>
                  <p className="text-sm text-purple-700">
                    Emesso il {formatDate(prenotazione.attestatoEmessoAt!)}
                  </p>
                </div>
              </div>
              {prenotazione.corso.attestatoHtmlTemplate ? (
                <div className="flex flex-col gap-2 items-end">
                  {prenotazione.partecipanti.map((p) => (
                    <a
                      key={p.id}
                      href={`/api/prenotazioni/${prenotazione.id}/attestato/genera?partecipante=${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      {prenotazione.partecipanti.length > 1 ? `${p.nome} ${p.cognome}` : "Scarica"}
                    </a>
                  ))}
                </div>
              ) : (
                <a
                  href={prenotazione.attestatoUrl!}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Scarica
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Upload contabile */}
        {prenotazione.stato === "IN_ATTESA_PAGAMENTO" && !isScaduta && (
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">
              Carica ricevuta di pagamento
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-1">
                ⏰ Scadenza: {formatDateTime(prenotazione.scadenzaPagamento)}
              </p>
              <p className="text-sm text-amber-700">
                Effettua il bonifico e carica la ricevuta entro questa data,
                altrimenti la prenotazione verrà annullata automaticamente.
              </p>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Coordinate bancarie
            </h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono mb-4">
              {prenotazione.corso.coordinateBancarie}
            </pre>

            <p className="text-sm font-medium text-gray-700 mb-1">
              Importo da versare:{" "}
              <span className="text-gray-900 font-bold">
                {formatCurrency(costoTotale)}
              </span>
            </p>

            <UploadContabile prenotazioneId={prenotazione.id} />
          </Card>
        )}

        {prenotazione.stato === "PAGAMENTO_CARICATO" && (
          <Alert variant="info" title="Ricevuta caricata">
            La tua ricevuta è in fase di verifica da parte della segreteria.
            Riceverai una email quando la prenotazione sarà confermata.
            {prenotazione.urlContabile && (
              <div className="mt-2">
                <a
                  href={prenotazione.urlContabile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-red-700 hover:underline text-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  {prenotazione.nomeFileContabile || "Visualizza ricevuta"}
                </a>
              </div>
            )}
          </Alert>
        )}

        {prenotazione.stato === "CONFERMATA" && (
          <Alert variant="success" title="Prenotazione confermata!">
            La tua iscrizione al corso è stata confermata dalla segreteria.
            {prenotazione.noteSegreteria && (
              <p className="mt-2 text-green-700">
                Note: {prenotazione.noteSegreteria}
              </p>
            )}
            {prenotazione.corso.attestatoAbilitato &&
              !prenotazione.attestatoEmesso && (
                <p className="mt-2 text-green-700">
                  Dopo il completamento del corso, potrai scaricare il tuo
                  attestato da questa pagina.
                </p>
              )}
          </Alert>
        )}

        {/* Dettagli prenotazione */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">
            Dettagli prenotazione
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Numero posti</span>
              <span className="font-medium">{prenotazione.numeroPosti}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Costo a persona</span>
              <span className="font-medium">
                {formatCurrency(prenotazione.corso.costo as unknown as number)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Totale</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(costoTotale)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Prenotato il</span>
              <span className="font-medium">
                {formatDate(prenotazione.createdAt)}
              </span>
            </div>
            {prenotazione.note && (
              <div className="py-2">
                <span className="text-gray-500">Note: </span>
                <span className="font-medium">{prenotazione.note}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Partecipanti */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            Partecipanti
          </h2>
          <div className="space-y-3">
            {prenotazione.partecipanti.map((p, i) => (
              <div
                key={p.id}
                className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {p.nome} {p.cognome}
                  </p>
                  {p.email && (
                    <p className="text-sm text-gray-500">{p.email}</p>
                  )}
                  {p.telefono && (
                    <p className="text-sm text-gray-500">{p.telefono}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
