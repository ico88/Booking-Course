"use client";

import { Printer, Download } from "lucide-react";

interface Props {
  corsoId: string;
  totalePartecipanti: number;
}

export default function ElencoPartecipantiButton({ corsoId, totalePartecipanti }: Props) {
  const base = `/api/admin/corsi/${corsoId}/partecipanti`;

  function apriStampa() {
    window.open(`${base}?format=html`, "_blank", "noopener");
  }

  function scaricaCsv() {
    const a = document.createElement("a");
    a.href = `${base}?format=csv`;
    a.click();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={apriStampa}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
      >
        <Printer className="h-4 w-4" />
        Stampa / PDF
      </button>

      <button
        onClick={scaricaCsv}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        Scarica CSV
      </button>

      {totalePartecipanti === 0 && (
        <p className="text-xs text-gray-400 italic">
          Nessun partecipante confermato al momento.
        </p>
      )}
    </div>
  );
}
