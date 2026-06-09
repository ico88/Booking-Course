"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import DropZone from "@/components/ui/DropZone";
import { FileText, GraduationCap, X, RefreshCw } from "lucide-react";

interface Props {
  prenotazioneId: string;
  giaEmesso: boolean;
}

export default function EmettiAttestato({ prenotazioneId, giaEmesso }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function emetti() {
    if (!file) { setErrore("Seleziona un file attestato"); return; }
    setCaricamento(true);
    setErrore(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/prenotazioni/${prenotazioneId}/attestato`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) { setErrore(json.error || "Errore durante l'emissione"); return; }
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div className="space-y-4">
      {giaEmesso && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <RefreshCw className="h-4 w-4 shrink-0" />
          Attestato già emesso — puoi riemetterlo per correggere un errore. L&apos;utente riceverà una nuova notifica.
        </div>
      )}

      {file ? (
        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-purple-600 shrink-0" />
            <p className="text-sm font-medium text-purple-900">{file.name}</p>
          </div>
          <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <DropZone
          onFile={setFile}
          accept="application/pdf,image/jpeg,image/png"
          maxMB={20}
          label="Trascina l'attestato qui o clicca per selezionare"
          sublabel="PDF, JPG o PNG · max 20 MB"
        />
      )}

      {errore && <Alert variant="error">{errore}</Alert>}

      <Button onClick={emetti} loading={caricamento} disabled={!file}>
        {giaEmesso ? <RefreshCw className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
        {giaEmesso ? "Riemetti attestato e notifica utente" : "Emetti attestato e notifica utente"}
      </Button>
    </div>
  );
}
