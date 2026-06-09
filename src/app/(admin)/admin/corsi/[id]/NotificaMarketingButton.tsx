"use client";

import { useState } from "react";
import { Send, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

interface Props {
  corsoId: string;
  contattiMarketing: number;
  ultimaNotifica: Date | null;
  pubblicato: boolean;
}

export default function NotificaMarketingButton({
  corsoId,
  contattiMarketing,
  ultimaNotifica,
  pubblicato,
}: Props) {
  const [stato, setStato] = useState<"idle" | "conferma" | "invio" | "fatto">("idle");
  const [risultato, setRisultato] = useState<{
    inviati: number;
    errori: number;
  } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function invia() {
    setStato("invio");
    setErrore(null);
    try {
      const res = await fetch(`/api/admin/corsi/${corsoId}/notifica-marketing`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setErrore(json.error ?? "Errore durante l'invio.");
        setStato("idle");
        return;
      }
      setRisultato({ inviati: json.inviati, errori: json.errori });
      setStato("fatto");
    } catch {
      setErrore("Errore di rete. Riprova.");
      setStato("idle");
    }
  }

  const ultimaNotificaStr = ultimaNotifica
    ? new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ultimaNotifica))
    : null;

  if (stato === "fatto" && risultato) {
    return (
      <Alert variant="success">
        <strong>Email inviate!</strong> {risultato.inviati} contatti raggiunti
        {risultato.errori > 0 && `, ${risultato.errori} errori`}.
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {errore && <Alert variant="error">{errore}</Alert>}

      <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100">
            <Users className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {contattiMarketing} contatti con consenso marketing
            </p>
            {ultimaNotificaStr && (
              <p className="text-xs text-gray-400">
                Ultima notifica: {ultimaNotificaStr}
              </p>
            )}
            {!ultimaNotificaStr && (
              <p className="text-xs text-gray-400">
                Nessuna notifica inviata per questo corso
              </p>
            )}
          </div>
        </div>

        {stato === "conferma" ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Confermi l'invio?</span>
            <button
              onClick={() => setStato("idle")}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Annulla
            </button>
            <Button onClick={invia} size="sm">
              Invia ora
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setStato("conferma")}
            disabled={!pubblicato || contattiMarketing === 0 || stato === "invio"}
            loading={stato === "invio"}
            size="sm"
            variant="secondary"
          >
            <Send className="h-4 w-4" />
            {stato === "invio" ? "Invio in corso…" : "Invia notifica"}
          </Button>
        )}
      </div>

      {!pubblicato && (
        <p className="text-xs text-amber-600">
          Pubblica il corso prima di inviare la notifica marketing.
        </p>
      )}
    </div>
  );
}
