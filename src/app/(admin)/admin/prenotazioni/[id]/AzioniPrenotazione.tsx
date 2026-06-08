"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { CheckCircle, XCircle } from "lucide-react";

export default function AzioniPrenotazione({
  prenotazioneId,
}: {
  prenotazioneId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [caricamento, setCaricamento] = useState<"conferma" | "rifiuta" | null>(
    null
  );
  const [errore, setErrore] = useState<string | null>(null);

  async function eseguiAzione(azione: "conferma" | "rifiuta") {
    setCaricamento(azione);
    setErrore(null);

    try {
      const res = await fetch(
        `/api/admin/prenotazioni/${prenotazioneId}/conferma`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ azione, noteSegreteria: note }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore durante l'operazione");
        return;
      }

      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">
          Note per l&apos;utente (opzionale)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Eventuali informazioni aggiuntive..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errore && <Alert variant="error">{errore}</Alert>}

      <div className="flex gap-3">
        <Button
          onClick={() => eseguiAzione("conferma")}
          loading={caricamento === "conferma"}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4" />
          Conferma iscrizione
        </Button>
        <Button
          onClick={() => eseguiAzione("rifiuta")}
          loading={caricamento === "rifiuta"}
          variant="danger"
          className="flex-1"
        >
          <XCircle className="h-4 w-4" />
          Rifiuta
        </Button>
      </div>
    </div>
  );
}
