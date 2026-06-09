"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import DropZone from "@/components/ui/DropZone";
import { FileText, GraduationCap, X } from "lucide-react";

interface Props {
  prenotazioneId: string;
  hasTemplate: boolean;
}

export default function EmettiAttestato({ prenotazioneId, hasTemplate }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [usaTemplate, setUsaTemplate] = useState(hasTemplate);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function emetti() {
    if (!usaTemplate && !file) { setErrore("Seleziona un file o usa il template del corso"); return; }
    setCaricamento(true);
    setErrore(null);
    try {
      const formData = new FormData();
      if (file && !usaTemplate) formData.append("file", file);
      formData.append("usaTemplate", usaTemplate.toString());
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
      {hasTemplate && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="tipo" checked={usaTemplate} onChange={() => setUsaTemplate(true)} className="w-4 h-4 text-purple-600" />
            <div>
              <span className="text-sm font-medium text-gray-700">Usa il template del corso</span>
              <p className="text-xs text-gray-500">Verrà usato il template caricato per questo corso</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="tipo" checked={!usaTemplate} onChange={() => setUsaTemplate(false)} className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Carica attestato personalizzato</span>
          </label>
        </div>
      )}

      {!usaTemplate && (
        file ? (
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
        )
      )}

      {errore && <Alert variant="error">{errore}</Alert>}

      <Button onClick={emetti} loading={caricamento} disabled={!usaTemplate && !file}>
        <GraduationCap className="h-4 w-4" />
        Emetti attestato e notifica utente
      </Button>
    </div>
  );
}
