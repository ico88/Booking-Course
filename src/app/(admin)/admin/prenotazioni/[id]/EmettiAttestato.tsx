"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Upload, FileText, GraduationCap } from "lucide-react";

interface Props {
  prenotazioneId: string;
  hasTemplate: boolean;
}

export default function EmettiAttestato({ prenotazioneId, hasTemplate }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [usaTemplate, setUsaTemplate] = useState(hasTemplate);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function emetti() {
    if (!usaTemplate && !file) {
      setErrore("Seleziona un file o usa il template del corso");
      return;
    }

    setCaricamento(true);
    setErrore(null);

    try {
      const formData = new FormData();
      if (file && !usaTemplate) formData.append("file", file);
      formData.append("usaTemplate", usaTemplate.toString());

      const res = await fetch(
        `/api/admin/prenotazioni/${prenotazioneId}/attestato`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore durante l'emissione");
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
      {hasTemplate && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="tipo"
              checked={usaTemplate}
              onChange={() => setUsaTemplate(true)}
              className="w-4 h-4 text-purple-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Usa il template del corso
              </span>
              <p className="text-xs text-gray-500">
                Verrà usato il template caricato per questo corso
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="tipo"
              checked={!usaTemplate}
              onChange={() => setUsaTemplate(false)}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Carica attestato personalizzato
            </span>
          </label>
        </div>
      )}

      {!usaTemplate && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
        >
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {file.name}
              </span>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Clicca per caricare l&apos;attestato
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      {errore && <Alert variant="error">{errore}</Alert>}

      <Button
        onClick={emetti}
        loading={caricamento}
        disabled={!usaTemplate && !file}
      >
        <GraduationCap className="h-4 w-4" />
        Emetti attestato e notifica utente
      </Button>
    </div>
  );
}
