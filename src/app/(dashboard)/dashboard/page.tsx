import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatCurrency, STATI_PRENOTAZIONE } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Calendar, BookOpen, GraduationCap, Clock, CheckCircle } from "lucide-react";

export default async function PaginaDashboard() {
  const session = await getServerSession(authOptions);

  if (session?.user.ruolo === "SEGRETERIA") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }

  const prenotazioni = await prisma.prenotazione.findMany({
    where: { utenteId: session!.user.id },
    include: {
      corso: {
        select: {
          titolo: true,
          dataInizio: true,
          orario: true,
          luogo: true,
          costo: true,
          attestatoAbilitato: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const attive = prenotazioni.filter((p) =>
    ["IN_ATTESA_PAGAMENTO", "PAGAMENTO_CARICATO", "CONFERMATA"].includes(p.stato)
  );
  const scadute = prenotazioni.filter((p) =>
    ["ANNULLATA", "SCADUTA"].includes(p.stato)
  );
  const attestatiDisponibili = prenotazioni.filter((p) => p.attestatoEmesso);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Ciao, {session?.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          Gestisci le tue prenotazioni e scarica i tuoi attestati.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-red-600" />}
          label="Prenotazioni attive"
          value={attive.length}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="In attesa"
          value={prenotazioni.filter((p) => p.stato === "IN_ATTESA_PAGAMENTO").length}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          label="Confermate"
          value={prenotazioni.filter((p) => p.stato === "CONFERMATA").length}
          color="green"
        />
        <StatCard
          icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
          label="Attestati"
          value={attestatiDisponibili.length}
          color="purple"
        />
      </div>

      {attestatiDisponibili.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            Attestati disponibili
          </h2>
          <div className="grid gap-3">
            {attestatiDisponibili.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/prenotazioni/${p.id}`}
                className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-4 hover:bg-purple-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-purple-900">
                    {p.corso.titolo}
                  </p>
                  <p className="text-sm text-purple-700">
                    {formatDate(p.corso.dataInizio)}
                  </p>
                </div>
                <span className="text-sm font-medium text-purple-700 flex items-center gap-1">
                  Scarica →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {attive.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            Prenotazioni attive
          </h2>
          <div className="space-y-3">
            {attive.map((p) => (
              <CardPrenotazione key={p.id} prenotazione={p} />
            ))}
          </div>
        </div>
      )}

      {prenotazioni.length === 0 && (
        <Card>
          <div className="text-center py-10">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-500">
              Nessuna prenotazione ancora
            </h3>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Scopri i corsi disponibili e prenota il tuo posto.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors"
            >
              Vedi i corsi
            </Link>
          </div>
        </Card>
      )}

      {scadute.length > 0 && (
        <details className="mt-8">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Mostra prenotazioni passate ({scadute.length})
          </summary>
          <div className="space-y-3 mt-3">
            {scadute.map((p) => (
              <CardPrenotazione key={p.id} prenotazione={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-red-50 border-red-200",
    amber: "bg-amber-50 border-amber-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

function CardPrenotazione({
  prenotazione,
}: {
  prenotazione: {
    id: string;
    stato: string;
    numeroPosti: number;
    scadenzaPagamento: Date;
    attestatoEmesso: boolean;
    corso: {
      titolo: string;
      dataInizio: Date;
      orario: string;
      luogo: string | null;
      costo: unknown;
    };
  };
}) {
  const stato = STATI_PRENOTAZIONE[prenotazione.stato];
  const scaduta =
    prenotazione.stato === "IN_ATTESA_PAGAMENTO" &&
    new Date() > prenotazione.scadenzaPagamento;

  return (
    <Link
      href={`/dashboard/prenotazioni/${prenotazione.id}`}
      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-sm transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate">
            {prenotazione.corso.titolo}
          </p>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${stato?.bg || ""} ${stato?.color || ""}`}
          >
            {scaduta ? "Scaduta" : stato?.label || prenotazione.stato}
          </span>
          {prenotazione.attestatoEmesso && (
            <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
              <GraduationCap className="h-3 w-3" />
              Attestato
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatDate(prenotazione.corso.dataInizio)} · {prenotazione.corso.orario}
          {prenotazione.corso.luogo && ` · ${prenotazione.corso.luogo}`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {prenotazione.numeroPosti} posto{prenotazione.numeroPosti !== 1 ? "i" : ""} ·{" "}
          {formatCurrency(
            Number(prenotazione.corso.costo) * prenotazione.numeroPosti
          )}
        </p>
      </div>
      <span className="text-gray-400 ml-3 shrink-0">→</span>
    </Link>
  );
}
