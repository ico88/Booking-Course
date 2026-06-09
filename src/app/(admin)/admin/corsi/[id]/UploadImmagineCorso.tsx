"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

interface Props {
  corsoId: string;
  immagineAttuale: string | null;
}

export default function UploadImmagineCorso({ corsoId, immagineAttuale }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(immagineAttuale);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErrore(null);
    setCaricamento(true);
    setPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/corsi/${corsoId}/immagine`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore caricamento");
        setPreview(immagineAttuale);
        return;
      }

      setPreview(json.url);
      router.refresh();
    } catch {
      setErrore("Errore di rete.");
      setPreview(immagineAttuale);
    } finally {
      setCaricamento(false);
    }
  }

  async function rimuovi() {
    if (!confirm("Rimuovere l'immagine?")) return;
    await fetch(`/api/admin/corsi/${corsoId}/immagine`, { method: "DELETE" });
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {preview ? (
        <div className="relative group rounded-xl overflow-hidden border border-gray-200">
          <img src={preview} alt="Immagine corso" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              <ImagePlus className="h-4 w-4" /> Cambia
            </button>
            <button
              onClick={rimuovi}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" /> Rimuovi
            </button>
          </div>
          {caricamento && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-red-600" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors"
        >
          {caricamento ? (
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Carica immagine corso</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · max 5 MB</p>
              <p className="text-xs text-gray-400">Se non caricata verrà usata l&apos;immagine di default</p>
            </>
          )}
        </div>
      )}

      {errore && <p className="text-sm text-red-600">{errore}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
