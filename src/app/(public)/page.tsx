import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Euro,
  GraduationCap,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

export const revalidate = 60;

export default async function Homepage() {
  const corsi = await prisma.corso.findMany({
    where: { pubblicato: true },
    orderBy: { dataInizio: "asc" },
  });

  const corsiApertiAIscrizioni = corsi.filter(
    (c) => c.postiOccupati < c.postiTotali && new Date(c.dataInizio) > new Date()
  );
  const corsiCompleti = corsi.filter(
    (c) => c.postiOccupati >= c.postiTotali
  );
  const corsiPassati = corsi.filter(
    (c) => new Date(c.dataInizio) <= new Date()
  );

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-700 to-red-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-16 w-16 text-red-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Corsi di Formazione
          </h1>
          <p className="text-xl text-red-100 max-w-2xl mx-auto">
            Scopri i corsi disponibili e prenota il tuo posto in pochi clic.
            Investi nella tua formazione professionale.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {corsi.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-500">
              Nessun corso disponibile al momento
            </h2>
            <p className="text-gray-400 mt-2">
              Torna presto, nuovi corsi saranno pubblicati a breve.
            </p>
          </div>
        ) : (
          <>
            {corsiApertiAIscrizioni.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-8 bg-green-500 rounded-full inline-block" />
                  Iscrizioni aperte
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({corsiApertiAIscrizioni.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {corsiApertiAIscrizioni.map((corso) => (
                    <CardCorso key={corso.id} corso={corso} />
                  ))}
                </div>
              </section>
            )}

            {corsiCompleti.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-8 bg-red-400 rounded-full inline-block" />
                  Corsi al completo
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({corsiCompleti.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {corsiCompleti.map((corso) => (
                    <CardCorso key={corso.id} corso={corso} completo />
                  ))}
                </div>
              </section>
            )}

            {corsiPassati.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-8 bg-gray-300 rounded-full inline-block" />
                  Corsi passati
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({corsiPassati.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                  {corsiPassati.map((corso) => (
                    <CardCorso key={corso.id} corso={corso} passato />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CardCorso({
  corso,
  completo,
  passato,
}: {
  corso: {
    id: string;
    titolo: string;
    descrizione: string;
    dataInizio: Date;
    dataFine: Date | null;
    orario: string;
    durata: string | null;
    luogo: string | null;
    costo: unknown;
    postiTotali: number;
    postiOccupati: number;
    immagineUrl: string | null;
    attestatoAbilitato: boolean;
  };
  completo?: boolean;
  passato?: boolean;
}) {
  const postiLiberi = corso.postiTotali - corso.postiOccupati;
  const percentualeOccupazione = Math.round(
    (corso.postiOccupati / corso.postiTotali) * 100
  );

  return (
    <Link
      href={`/corsi/${corso.id}`}
      className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all overflow-hidden flex flex-col"
    >
      {corso.immagineUrl ? (
        <div className="h-48 overflow-hidden">
          <img
            src={corso.immagineUrl}
            alt={corso.titolo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
          <GraduationCap className="h-12 w-12 text-white/60" />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-red-700 transition-colors">
            {corso.titolo}
          </h3>
          {passato ? (
            <Badge variant="gray">Terminato</Badge>
          ) : completo ? (
            <Badge variant="danger">Completo</Badge>
          ) : postiLiberi <= 3 ? (
            <Badge variant="warning">Ultimi posti</Badge>
          ) : (
            <Badge variant="success">Disponibile</Badge>
          )}
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
          {corso.descrizione}
        </p>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{formatDate(corso.dataInizio)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
            <span>{corso.orario}{corso.durata ? ` • ${corso.durata}` : ""}</span>
          </div>
          {corso.luogo && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{corso.luogo}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400 shrink-0" />
            <span>
              {completo
                ? "Tutti i posti occupati"
                : `${postiLiberi} posto${postiLiberi !== 1 ? "i" : ""} disponibili`}
            </span>
          </div>
        </div>

        {/* Barra occupazione */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Iscritti: {corso.postiOccupati}/{corso.postiTotali}</span>
            <span>{percentualeOccupazione}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentualeOccupazione >= 100
                  ? "bg-red-400"
                  : percentualeOccupazione >= 75
                  ? "bg-amber-400"
                  : "bg-green-400"
              }`}
              style={{ width: `${Math.min(percentualeOccupazione, 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Euro className="h-4 w-4 text-gray-500" />
            <span className="font-bold text-gray-900 text-lg">
              {formatCurrency(corso.costo as number)}
            </span>
          </div>
          {corso.attestatoAbilitato && (
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-200">
              <GraduationCap className="h-3 w-3" />
              Attestato
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
