import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Euro,
  GraduationCap,
  ArrowLeft,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import BottonePrenotazione from "./BottonePrenotazione";

export const revalidate = 30;

export default async function PaginaCorso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const corso = await prisma.corso.findUnique({
    where: { id, pubblicato: true },
  });

  if (!corso) notFound();

  const postiLiberi = corso.postiTotali - corso.postiOccupati;
  const isCompleto = postiLiberi <= 0;
  const isPassato = new Date(corso.dataInizio) <= new Date();
  const percentualeOccupazione = Math.round(
    (corso.postiOccupati / corso.postiTotali) * 100
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Tutti i corsi
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonna principale */}
        <div className="lg:col-span-2 space-y-6">
          {corso.immagineUrl && (
            <img
              src={corso.immagineUrl}
              alt={corso.titolo}
              className="w-full h-72 object-cover rounded-xl"
            />
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {isPassato ? (
                <Badge variant="gray">Corso terminato</Badge>
              ) : isCompleto ? (
                <Badge variant="danger">Posti esauriti</Badge>
              ) : postiLiberi <= 3 ? (
                <Badge variant="warning">Ultimi posti disponibili</Badge>
              ) : (
                <Badge variant="success">Iscrizioni aperte</Badge>
              )}
              {corso.attestatoAbilitato && (
                <Badge variant="info">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Attestato incluso
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {corso.titolo}
            </h1>

            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {corso.descrizione}
              </p>
            </div>
          </div>

          {/* Come funziona */}
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-red-600" />
              Come funziona la prenotazione
            </h3>
            <ol className="space-y-3">
              {[
                "Registrati o accedi al tuo account",
                "Clicca su \"Prenota\" e inserisci i dati dei partecipanti",
                "Ricevi le coordinate bancarie via email",
                "Effettua il bonifico e carica la ricevuta nella tua area personale",
                "La segreteria verifica il pagamento e conferma l'iscrizione",
                corso.attestatoAbilitato
                  ? "Dopo il corso, scarica il tuo attestato di partecipazione"
                  : null,
              ]
                .filter(Boolean)
                .map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-red-800">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
            </ol>
          </div>
        </div>

        {/* Sidebar prenotazione */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-24">
            <div className="text-3xl font-bold text-gray-900 mb-6">
              {formatCurrency(corso.costo as unknown as number)}
              <span className="text-base font-normal text-gray-500 ml-1">
                a persona
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <InfoRiga
                icon={<Calendar className="h-4 w-4" />}
                label="Data inizio"
                value={formatDate(corso.dataInizio)}
              />
              {corso.dataFine && (
                <InfoRiga
                  icon={<Calendar className="h-4 w-4" />}
                  label="Data fine"
                  value={formatDate(corso.dataFine)}
                />
              )}
              <InfoRiga
                icon={<Clock className="h-4 w-4" />}
                label="Orario"
                value={`${corso.orario}${corso.durata ? ` (${corso.durata})` : ""}`}
              />
              {corso.luogo && (
                <InfoRiga
                  icon={<MapPin className="h-4 w-4" />}
                  label="Luogo"
                  value={corso.luogo}
                />
              )}
              <InfoRiga
                icon={<Users className="h-4 w-4" />}
                label="Posti disponibili"
                value={
                  isCompleto
                    ? "Nessun posto disponibile"
                    : `${postiLiberi} di ${corso.postiTotali}`
                }
              />
              <InfoRiga
                icon={<Euro className="h-4 w-4" />}
                label="Pagamento"
                value="Bonifico bancario"
              />
              <InfoRiga
                icon={<CreditCard className="h-4 w-4" />}
                label="Scadenza pagamento"
                value={`${corso.timeoutPagamentoOre} ore dalla prenotazione`}
              />
            </div>

            {/* Barra occupazione */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{corso.postiOccupati} iscritti</span>
                <span>{corso.postiTotali} totali</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isCompleto
                      ? "bg-red-400"
                      : percentualeOccupazione >= 75
                      ? "bg-amber-400"
                      : "bg-green-400"
                  }`}
                  style={{
                    width: `${Math.min(percentualeOccupazione, 100)}%`,
                  }}
                />
              </div>
            </div>

            <BottonePrenotazione
              corsoId={corso.id}
              isCompleto={isCompleto}
              isPassato={isPassato}
              costo={Number(corso.costo)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRiga({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
