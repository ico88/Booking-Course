"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Upload, FileText, Trash2, Download } from "lucide-react";

interface Props {
  corsoId: string;
  templateAttuale: string | null;
  nomeFile: string | null;
  abilitato: boolean;
}

export default function UploadTemplateAttestato({
  corsoId,
  templateAttuale,
  nomeFile,
  abilitato,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [abilitaAttestato, setAbilitaAttestato] = useState(abilitato);

  async function caricaTemplate() {
    setCaricamento(true);
    setErrore(null);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("abilita", abilitaAttestato.toString());

      const res = await fetch(
        `/api/admin/corsi/${corsoId}/attestato-template`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore durante il caricamento");
        return;
      }

      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  async function rimuoviTemplate() {
    if (!confirm("Rimuovere il template?")) return;

    await fetch(`/api/admin/corsi/${corsoId}/attestato-template`, {
      method: "DELETE",
    });

    router.refresh();
  }

  return (
    <div className="space-y-4">
      {templateAttuale && (
        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-purple-900">
                {nomeFile || "Template attestato"}
              </p>
              <p className="text-xs text-purple-700">
                Template attuale
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={templateAttuale}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={rimuoviTemplate}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
      >
        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">
          {templateAttuale ? "Carica nuovo template" : "Carica template attestato"}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG · max 20 MB</p>
        {file && (
          <p className="text-sm text-purple-600 font-medium mt-2">
            File selezionato: {file.name}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
      </div>

      {errore && <Alert variant="error">{errore}</Alert>}

      <Button
        onClick={caricaTemplate}
        loading={caricamento}
        disabled={!file && abilitaAttestato === abilitato}
        variant="outline"
      >
        {file ? "Carica template" : "Salva impostazioni"}
      </Button>
    </div>
  );
}
