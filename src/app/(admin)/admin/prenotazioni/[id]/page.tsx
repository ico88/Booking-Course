import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  STATI_PRENOTAZIONE,
} from "@/lib/utils";
import { ArrowLeft, Download, Users, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import AzioniPrenotazione from "./AzioniPrenotazione";
import EmettiAttestato from "./EmettiAttestato";

export const revalidate = 0;

export default async function PaginaAdminPrenotazione({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id },
    include: {
      utente: {
        select: { nome: true, cognome: true, email: true, telefono: true },
      },
      corso: true,
      partecipanti: true,
    },
  });

  if (!prenotazione) notFound();

  const stato = STATI_PRENOTAZIONE[prenotazione.stato];
  const costoTotale =
    Number(prenotazione.corso.costo) * prenotazione.numeroPosti;

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/prenotazioni"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tutte le prenotazioni
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {prenotazione.corso.titolo}
          </h1>
          <p className="text-gray-500 mt-1">
            {formatDate(prenotazione.corso.dataInizio)} ·{" "}
            {prenotazione.corso.orario}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium shrink-0 ${stato?.bg || ""} ${stato?.color || ""}`}
        >
          {stato?.label || prenotazione.stato}
        </span>
      </div>

      <div className="grid gap-4">
        {/* Azioni */}
        {prenotazione.stato === "PAGAMENTO_CARICATO" && (
          <Card className="border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-900 mb-4">
              Verifica pagamento
            </h2>

            {prenotazione.urlContabile && (
              <div className="mb-4">
                <a
                  href={prenotazione.urlContabile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Visualizza ricevuta ({prenotazione.nomeFileContabile || "file"})
                </a>
              </div>
            )}

            <p className="text-sm text-red-700 mb-4">
              Importo atteso: <strong>{formatCurrency(costoTotale)}</strong>
            </p>

            <AzioniPrenotazione prenotazioneId={prenotazione.id} />
          </Card>
        )}

        {/* Emetti attestato */}
        {prenotazione.stato === "CONFERMATA" && prenotazione.corso.attestatoAbilitato && (
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Attestato
            </h2>

            {prenotazione.attestatoEmesso && prenotazione.attestatoUrl ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Attestato emesso il {formatDate(prenotazione.attestatoEmessoAt!)}
                  </p>
                </div>
                <a
                  href={prenotazione.attestatoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Scarica
                </a>
              </div>
            ) : (
              <EmettiAttestato
                prenotazioneId={prenotazione.id}
                hasTemplate={!!prenotazione.corso.attestatoTemplateUrl}
              />
            )}
          </Card>
        )}

        {/* Dati utente */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Utente</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Nome</p>
              <p className="font-medium">
                {prenotazione.utente.nome} {prenotazione.utente.cognome}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{prenotazione.utente.email}</p>
            </div>
            {prenotazione.utente.telefono && (
              <div>
                <p className="text-gray-500">Telefono</p>
                <p className="font-medium">{prenotazione.utente.telefono}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Dettagli prenotazione */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">
            Dettagli prenotazione
          </h2>
          <div className="space-y-2 text-sm">
            {[
              ["Numero posti", prenotazione.numeroPosti],
              ["Costo per persona", formatCurrency(prenotazione.corso.costo as unknown as number)],
              ["Totale", formatCurrency(costoTotale)],
              ["Prenotata il", formatDate(prenotazione.createdAt)],
              [
                "Scadenza pagamento",
                formatDateTime(prenotazione.scadenzaPagamento),
              ],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="flex justify-between py-2 border-b border-gray-100"
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
            {prenotazione.note && (
              <div className="py-2">
                <p className="text-gray-500">Note utente</p>
                <p className="font-medium mt-1">{prenotazione.note}</p>
              </div>
            )}
            {prenotazione.noteSegreteria && (
              <div className="py-2">
                <p className="text-gray-500">Note segreteria</p>
                <p className="font-medium mt-1">{prenotazione.noteSegreteria}</p>
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
          <div className="space-y-2">
            {prenotazione.partecipanti.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-sm"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">
                    {p.nome} {p.cognome}
                  </span>
                  {p.email && (
                    <span className="text-gray-500 ml-2">{p.email}</span>
                  )}
                  {p.telefono && (
                    <span className="text-gray-500 ml-2">{p.telefono}</span>
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
