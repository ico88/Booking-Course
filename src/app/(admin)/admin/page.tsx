import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  BookOpen,
  Users,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export const revalidate = 0;

export default async function PaginaAdminDashboard() {
  const [
    totaleCorsi,
    corsiPubblicati,
    totaleUtenti,
    totalePrenotazioni,
    inAttesaPagamento,
    pagamentoCaricato,
    confermate,
  ] = await Promise.all([
    prisma.corso.count(),
    prisma.corso.count({ where: { pubblicato: true } }),
    prisma.utente.count({ where: { ruolo: "UTENTE" } }),
    prisma.prenotazione.count(),
    prisma.prenotazione.count({ where: { stato: "IN_ATTESA_PAGAMENTO" } }),
    prisma.prenotazione.count({ where: { stato: "PAGAMENTO_CARICATO" } }),
    prisma.prenotazione.count({ where: { stato: "CONFERMATA" } }),
  ]);

  const prenotazioniRecenti = await prisma.prenotazione.findMany({
    take: 5,
    include: {
      utente: { select: { nome: true, cognome: true } },
      corso: { select: { titolo: true, dataInizio: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Alert contabili da verificare */}
      {pagamentoCaricato > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                {pagamentoCaricato} contabile
                {pagamentoCaricato !== 1 ? "i" : ""} da verificare
              </p>
              <p className="text-sm text-amber-700">
                Ci sono prenotazioni in attesa di conferma.
              </p>
            </div>
          </div>
          <Link
            href="/admin/prenotazioni?stato=PAGAMENTO_CARICATO"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Verifica ora
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="h-6 w-6 text-red-600" />}
          label="Corsi pubblicati"
          value={corsiPubblicati}
          sub={`${totaleCorsi} totali`}
          href="/admin/corsi"
          color="blue"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-indigo-600" />}
          label="Utenti registrati"
          value={totaleUtenti}
          href="/admin/utenti"
          color="indigo"
        />
        <StatCard
          icon={<ClipboardList className="h-6 w-6 text-green-600" />}
          label="Prenotazioni totali"
          value={totalePrenotazioni}
          href="/admin/prenotazioni"
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          label="Confermate"
          value={confermate}
          sub={`${inAttesaPagamento} in attesa`}
          href="/admin/prenotazioni?stato=CONFERMATA"
          color="purple"
        />
      </div>

      {/* Stato prenotazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Stato prenotazioni
          </h2>
          <div className="space-y-3">
            <BarStato
              label="In attesa di pagamento"
              valore={inAttesaPagamento}
              totale={totalePrenotazioni}
              color="bg-amber-400"
            />
            <BarStato
              label="Contabile caricata"
              valore={pagamentoCaricato}
              totale={totalePrenotazioni}
              color="bg-red-400"
            />
            <BarStato
              label="Confermate"
              valore={confermate}
              totale={totalePrenotazioni}
              color="bg-green-400"
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-gray-500" />
            Prenotazioni recenti
          </h2>
          <div className="space-y-2">
            {prenotazioniRecenti.length === 0 ? (
              <p className="text-sm text-gray-400">Nessuna prenotazione</p>
            ) : (
              prenotazioniRecenti.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/prenotazioni/${p.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.utente.nome} {p.utente.cognome}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {p.corso.titolo}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <StatoBadge stato={p.stato} />
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(p.corso.dataInizio)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  href: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-red-50 border-red-200 hover:bg-red-100",
    indigo: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
    green: "bg-green-50 border-green-200 hover:bg-green-100",
    purple: "bg-purple-50 border-purple-200 hover:bg-purple-100",
  };

  return (
    <Link
      href={href}
      className={`rounded-xl border p-5 transition-colors ${colors[color]}`}
    >
      <div className="flex items-center justify-between mb-3">
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </Link>
  );
}

function BarStato({
  label,
  valore,
  totale,
  color,
}: {
  label: string;
  valore: number;
  totale: number;
  color: string;
}) {
  const percentuale = totale > 0 ? Math.round((valore / totale) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{valore}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentuale}%` }}
        />
      </div>
    </div>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  const colori: Record<string, string> = {
    IN_ATTESA_PAGAMENTO: "text-amber-700 bg-amber-50",
    PAGAMENTO_CARICATO: "text-red-700 bg-red-50",
    CONFERMATA: "text-green-700 bg-green-50",
    ANNULLATA: "text-red-700 bg-red-50",
    SCADUTA: "text-gray-600 bg-gray-50",
  };

  const etichette: Record<string, string> = {
    IN_ATTESA_PAGAMENTO: "Attesa",
    PAGAMENTO_CARICATO: "Da verificare",
    CONFERMATA: "Confermata",
    ANNULLATA: "Annullata",
    SCADUTA: "Scaduta",
  };

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${colori[stato] || "text-gray-600 bg-gray-50"}`}
    >
      {etichette[stato] || stato}
    </span>
  );
}
