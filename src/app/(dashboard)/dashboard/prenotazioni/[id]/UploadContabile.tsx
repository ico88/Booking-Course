"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Upload, FileText, X } from "lucide-react";

export default function UploadContabile({
  prenotazioneId,
}: {
  prenotazioneId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  function selezionaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        setErrore("File troppo grande (max 10 MB)");
        return;
      }
      setFile(f);
      setErrore(null);
    }
  }

  async function inviaFile() {
    if (!file) return;
    setCaricamento(true);
    setErrore(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/prenotazioni/${prenotazioneId}/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore durante il caricamento");
        return;
      }

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
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Clicca per caricare la ricevuta
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG o PDF · max 10 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={selezionaFile}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">{file.name}</p>
              <p className="text-xs text-blue-600">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-gray-400 hover:text-gray-700 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errore && <Alert variant="error">{errore}</Alert>}

      {file && (
        <Button
          onClick={inviaFile}
          loading={caricamento}
          className="w-full"
          size="lg"
        >
          <Upload className="h-4 w-4" />
          Carica ricevuta
        </Button>
      )}
    </div>
  );
}
