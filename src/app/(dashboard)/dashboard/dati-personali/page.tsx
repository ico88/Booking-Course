import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import DatiPersonaliClient from "./DatiPersonaliClient";
import { Shield, Download, User, Calendar, Mail, Phone } from "lucide-react";

export default async function PaginaDatiPersonali() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const utente = await prisma.utente.findUnique({
    where: { id: session.user.id },
    select: {
      nome: true,
      cognome: true,
      email: true,
      telefono: true,
      consensoPrivacy: true,
      consensoMarketing: true,
      dataConsenso: true,
      createdAt: true,
      _count: { select: { prenotazioni: true } },
    },
  });

  if (!utente) redirect("/auth/login");

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Dati personali e privacy</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Gestisci i tuoi dati personali e i diritti previsti dal GDPR.
        </p>
      </div>

      {/* Dati profilo */}
      <Card className="mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-gray-500" />
          Il tuo profilo
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <dt className="text-gray-500 w-28 shrink-0">Nome</dt>
            <dd className="font-medium text-gray-900">{utente.nome} {utente.cognome}</dd>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <dt className="text-gray-500 w-28 shrink-0">Email</dt>
            <dd className="font-medium text-gray-900">{utente.email}</dd>
          </div>
          {utente.telefono && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <dt className="text-gray-500 w-28 shrink-0">Telefono</dt>
              <dd className="font-medium text-gray-900">{utente.telefono}</dd>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <dt className="text-gray-500 w-28 shrink-0">Registrato il</dt>
            <dd className="font-medium text-gray-900">{formatDate(utente.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      {/* Consensi */}
      <Card className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Consensi</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-800">Privacy Policy e Termini d'uso</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Trattamento dati per gestione account e prenotazioni (obbligatorio).
              </p>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full border ${
              utente.consensoPrivacy
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-700 bg-red-50 border-red-200"
            }`}>
              {utente.consensoPrivacy ? "Accettato" : "Non accettato"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-800">Comunicazioni commerciali</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Aggiornamenti e offerte sui corsi via email (facoltativo).
              </p>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full border ${
              utente.consensoMarketing
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-gray-600 bg-gray-50 border-gray-200"
            }`}>
              {utente.consensoMarketing ? "Accettato" : "Non accettato"}
            </span>
          </div>
          {utente.dataConsenso && (
            <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
              Consenso registrato il {formatDate(utente.dataConsenso)}
            </p>
          )}
        </div>
      </Card>

      {/* Diritti GDPR */}
      <Card className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">I tuoi diritti (GDPR)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Ai sensi degli artt. 15-22 del Regolamento UE 2016/679 hai i seguenti diritti:
        </p>

        <div className="space-y-3">
          {/* Portabilità dati */}
          <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-800 text-sm">Portabilità dei dati (art. 20)</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Scarica una copia di tutti i tuoi dati in formato JSON strutturato.
              </p>
            </div>
            <a
              href="/api/utente/dati"
              download
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Scarica
            </a>
          </div>

          {/* Cancellazione */}
          <div className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="font-medium text-gray-800 text-sm">Cancellazione account (art. 17)</p>
              <p className="text-xs text-gray-500 mt-0.5">
                I tuoi dati personali verranno anonimizzati. I record di prenotazione sono conservati
                per 10 anni per obblighi fiscali di legge.
              </p>
            </div>
            <DatiPersonaliClient />
          </div>
        </div>
      </Card>

      {/* Link documenti */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Per esercitare altri diritti (rettifica, limitazione, opposizione) scrivi a{" "}
          <a href="mailto:privacy@gestione-corsi.it" className="text-red-600 hover:underline">
            privacy@gestione-corsi.it
          </a>.
        </p>
        <p>
          Leggi la{" "}
          <Link href="/privacy-policy" className="text-red-600 hover:underline">Privacy Policy</Link>
          {" "}e la{" "}
          <Link href="/cookie-policy" className="text-red-600 hover:underline">Cookie Policy</Link>.
        </p>
      </div>
    </div>
  );
}
