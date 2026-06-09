"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { RotateCcw } from "lucide-react";

interface Props {
  prenotazioneId: string;
  metodoPagamento: "STRIPE" | "PAYPAL";
  importoPagato: number | null;
}

export default function RimborsoButton({ prenotazioneId, metodoPagamento, importoPagato }: Props) {
  const [stato, setStato] = useState<"idle" | "conferma" | "invio" | "fatto">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function emetti() {
    setStato("invio");
    setErrore(null);
    const res = await fetch(`/api/admin/prenotazioni/${prenotazioneId}/rimborso`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setStato("fatto");
    } else {
      setErrore(json.error ?? "Errore durante il rimborso.");
      setStato("idle");
    }
  }

  const nomeMetodo = metodoPagamento === "STRIPE" ? "Stripe" : "PayPal";

  if (stato === "fatto") {
    return (
      <Alert variant="success">
        Rimborso avviato via {nomeMetodo}. La prenotazione è stata annullata.
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {errore && <Alert variant="error">{errore}</Alert>}

      {stato === "conferma" || stato === "invio" ? (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-gray-700">
            Rimborsare {importoPagato ? `€${importoPagato.toFixed(2)}` : "l'importo pagato"} via {nomeMetodo}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStato("idle")}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Annulla
            </button>
            <Button onClick={emetti} loading={stato === "invio"} size="sm" variant="secondary">
              Conferma rimborso
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setStato("conferma")}
          size="sm"
          variant="secondary"
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <RotateCcw className="h-4 w-4" />
          Emetti rimborso via {nomeMetodo}
        </Button>
      )}
    </div>
  );
}
