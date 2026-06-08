"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Trash2, AlertTriangle } from "lucide-react";

export default function DatiPersonaliClient() {
  const router = useRouter();
  const [mostraConferma, setMostraConferma] = useState(false);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function cancellaAccount() {
    setCaricamento(true);
    setErrore(null);

    try {
      const res = await fetch("/api/utente/cancella-account", { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error);
        setCaricamento(false);
        return;
      }

      await signOut({ redirect: false });
      router.push("/?cancellato=1");
    } catch {
      setErrore("Errore di rete. Riprova.");
      setCaricamento(false);
    }
  }

  if (mostraConferma) {
    return (
      <div className="shrink-0 border border-red-200 bg-red-50 rounded-xl p-4 max-w-xs">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-semibold">Conferma cancellazione</p>
        </div>
        <p className="text-xs text-red-600 mb-3">
          Questa azione è irreversibile. I tuoi dati personali verranno anonimizzati.
        </p>
        {errore && (
          <p className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2 mb-3">{errore}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={cancellaAccount}
            disabled={caricamento}
            className="flex-1 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {caricamento ? "Cancellazione…" : "Sì, cancella"}
          </button>
          <button
            onClick={() => { setMostraConferma(false); setErrore(null); }}
            disabled={caricamento}
            className="flex-1 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setMostraConferma(true)}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Cancella account
    </button>
  );
}
