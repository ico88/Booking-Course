"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DropZone from "@/components/ui/DropZone";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

interface Props {
  corsoId: string;
  immagineAttuale: string | null;
}

export default function UploadImmagineCorso({ corsoId, immagineAttuale }: Props) {
  const router = useRouter();
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
      const res = await fetch(`/api/admin/corsi/${corsoId}/immagine`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) { setErrore(json.error || "Errore caricamento"); setPreview(immagineAttuale); return; }
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
      {preview ? (
        <DropZone
          onFile={handleFile}
          accept="image/jpeg,image/png,image/webp"
          maxMB={5}
          disabled={caricamento}
        >
          <div className="relative group h-48">
            <img src={preview} alt="Immagine corso" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-800 rounded-lg text-sm font-medium">
                <ImagePlus className="h-4 w-4" /> Cambia o trascina
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); rimuovi(); }}
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
        </DropZone>
      ) : (
        <DropZone
          onFile={handleFile}
          accept="image/jpeg,image/png,image/webp"
          maxMB={5}
          label="Trascina l'immagine qui o clicca per selezionare"
          sublabel="JPG, PNG, WebP · max 5 MB · Se non caricata verrà usata l'immagine di default"
          disabled={caricamento}
        />
      )}
      {errore && <p className="text-sm text-red-600">{errore}</p>}
    </div>
  );
}
