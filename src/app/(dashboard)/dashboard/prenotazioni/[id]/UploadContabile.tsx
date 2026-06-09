"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import DropZone from "@/components/ui/DropZone";
import { Upload, FileText, X } from "lucide-react";

export default function UploadContabile({ prenotazioneId }: { prenotazioneId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function inviaFile() {
    if (!file) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/prenotazioni/${prenotazioneId}/upload`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) { setErrore(json.error || "Errore durante il caricamento"); return; }
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <DropZone
          onFile={setFile}
          accept="image/jpeg,image/png,application/pdf"
          maxMB={10}
          label="Trascina la ricevuta qui o clicca per selezionare"
          sublabel="JPG, PNG o PDF · max 10 MB"
        />
      ) : (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">{file.name}</p>
              <p className="text-xs text-red-600">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errore && <Alert variant="error">{errore}</Alert>}

      {file && (
        <Button onClick={inviaFile} loading={caricamento} className="w-full" size="lg">
          <Upload className="h-4 w-4" />
          Carica ricevuta
        </Button>
      )}
    </div>
  );
}
