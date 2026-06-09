"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { BookOpen, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  utenti: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  }[];
  corsi: {
    id: string;
    titolo: string;
    dataInizio: Date;
  }[];
}

export default function IscrizioneUtenteDialog({ utenti, corsi }: Props) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [utenteId, setUtenteId] = useState("");
  const [corsoId, setCorsoId] = useState("");
  const [note, setNote] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function iscrivi() {
    if (!utenteId || !corsoId) {
      setErrore("Seleziona utente e corso");
      return;
    }

    setCaricamento(true);
    setErrore(null);

    const res = await fetch("/api/admin/iscrivi-utente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utenteId,
        corsoId,
        noteSegreteria: note || null,
      }),
    });

    const json = await res.json();
    setCaricamento(false);

    if (!res.ok) {
      setErrore(json.error);
      return;
    }

    setAperto(false);
    setUtenteId("");
    setCorsoId("");
    setNote("");
    router.refresh();
    router.push(`/admin/prenotazioni/${json.id}`);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAperto(true)}>
        <BookOpen className="h-4 w-4" />
        Iscrivi utente
      </Button>

      {aperto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Iscrivi utente a corso</h2>
              <button
                onClick={() => setAperto(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Utente <span className="text-red-500">*</span>
                </label>
                <select
                  value={utenteId}
                  onChange={(e) => setUtenteId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleziona utente...</option>
                  {utenti.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} {u.cognome} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Corso <span className="text-red-500">*</span>
                </label>
                <select
                  value={corsoId}
                  onChange={(e) => setCorsoId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleziona corso...</option>
                  {corsi.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titolo} ({formatDate(c.dataInizio)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Note (opzionale)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Iscrizione diretta dalla segreteria..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {errore && <Alert variant="error">{errore}</Alert>}

              <p className="text-xs text-gray-500 bg-red-50 border border-red-200 rounded-lg p-3">
                L&apos;iscrizione diretta verrà confermata automaticamente senza
                richiedere il pagamento. L&apos;utente riceverà una notifica email.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAperto(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  onClick={iscrivi}
                  loading={caricamento}
                  className="flex-1"
                >
                  Iscrivi ora
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
