"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { parseTags, serializeTags, TAG_DEFAULT } from "@/lib/leads-shared";

type FormData = {
  titolo: string;
  descrizione: string;
  dataInizio: string;
  dataFine: string;
  orario: string;
  durata: string;
  luogo: string;
  costo: string;
  postiTotali: string;
  timeoutPagamentoOre: string;
  coordinateBancarie: string;
  pubblicato: boolean;
  attestatoAbilitato: boolean;
};

interface ValoriIniziali {
  titolo?: string;
  descrizione?: string;
  dataInizio?: string | Date;
  dataFine?: string | Date | null;
  orario?: string;
  durata?: string;
  luogo?: string;
  costo?: number;
  postiTotali?: number;
  timeoutPagamentoOre?: number;
  coordinateBancarie?: string;
  pubblicato?: boolean;
  attestatoAbilitato?: boolean;
  tags?: string;
}

interface Props {
  corsoId?: string;
  valoriIniziali?: ValoriIniziali;
  modalita: "crea" | "modifica";
}

export default function FormCorso({ corsoId, valoriIniziali, modalita }: Props) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [tagsSelezionati, setTagsSelezionati] = useState<string[]>(
    () => parseTags(valoriIniziali?.tags ?? "[]")
  );
  const [tagsDisponibili, setTagsDisponibili] = useState(TAG_DEFAULT);

  useEffect(() => {
    fetch("/api/admin/marketing/tags")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTagsDisponibili(d); })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      titolo: valoriIniziali?.titolo ?? "",
      descrizione: valoriIniziali?.descrizione ?? "",
      dataInizio: valoriIniziali?.dataInizio
        ? new Date(valoriIniziali.dataInizio).toISOString().slice(0, 16)
        : "",
      dataFine: valoriIniziali?.dataFine
        ? new Date(valoriIniziali.dataFine).toISOString().slice(0, 16)
        : "",
      orario: valoriIniziali?.orario ?? "",
      durata: valoriIniziali?.durata ?? "",
      luogo: valoriIniziali?.luogo ?? "",
      costo: valoriIniziali?.costo != null ? String(valoriIniziali.costo) : "",
      postiTotali: valoriIniziali?.postiTotali != null ? String(valoriIniziali.postiTotali) : "20",
      timeoutPagamentoOre: valoriIniziali?.timeoutPagamentoOre != null ? String(valoriIniziali.timeoutPagamentoOre) : "48",
      coordinateBancarie: valoriIniziali?.coordinateBancarie ?? "",
      pubblicato: valoriIniziali?.pubblicato ?? false,
      attestatoAbilitato: valoriIniziali?.attestatoAbilitato ?? false,
    },
  });

  async function onSubmit(data: FormData) {
    setErrore(null);
    setCaricamento(true);

    try {
      const url =
        modalita === "crea" ? "/api/corsi" : `/api/corsi/${corsoId}`;
      const method = modalita === "crea" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          costo: Number(data.costo),
          postiTotali: Number(data.postiTotali),
          timeoutPagamentoOre: Number(data.timeoutPagamentoOre),
          dataFine: data.dataFine || null,
          tags: serializeTags(tagsSelezionati),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore durante il salvataggio");
        return;
      }

      router.push(`/admin/corsi/${json.id || corsoId}`);
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Input
          label="Titolo del corso"
          required
          {...register("titolo")}
          error={errors.titolo?.message}
        />

        <Textarea
          label="Descrizione"
          required
          rows={5}
          {...register("descrizione")}
          error={errors.descrizione?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data e ora inizio"
            type="datetime-local"
            required
            {...register("dataInizio")}
            error={errors.dataInizio?.message}
          />
          <Input
            label="Data e ora fine (opzionale)"
            type="datetime-local"
            {...register("dataFine")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Orario (opzionale per corsi multi-giorno)"
            placeholder="es. 09:00 - 18:00"
            {...register("orario")}
            error={errors.orario?.message}
          />
          <Input
            label="Durata"
            placeholder="es. 8 ore"
            {...register("durata")}
          />
          <Input
            label="Luogo"
            placeholder="Indirizzo o online"
            {...register("luogo")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Costo per persona (€)"
            type="number"
            min="0"
            step="0.01"
            required
            {...register("costo")}
            error={errors.costo?.message}
          />
          <Input
            label="Posti disponibili"
            type="number"
            min="1"
            required
            {...register("postiTotali")}
            error={errors.postiTotali?.message}
          />
          <Input
            label="Timeout pagamento (ore)"
            type="number"
            min="1"
            required
            {...register("timeoutPagamentoOre")}
            error={errors.timeoutPagamentoOre?.message}
            helperText="Ore entro cui l'utente deve caricare il bonifico"
          />
        </div>

        <Textarea
          label="Coordinate bancarie"
          required
          rows={4}
          placeholder={"Banca: XYZ\nIBAN: IT60 X054 2811 1010 0000 0123 456\nIntestato a: Nome Cognome\nCausale: specificare nome corso e partecipante"}
          {...register("coordinateBancarie")}
          error={errors.coordinateBancarie?.message}
        />

        {/* Tags per notifiche marketing leads */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categorie corso
            <span className="ml-2 text-xs font-normal text-gray-400">(usate per notificare automaticamente gli iscritti interessati)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {tagsDisponibili.map((tag) => {
              const checked = tagsSelezionati.includes(tag.valore);
              return (
                <button
                  key={tag.valore}
                  type="button"
                  onClick={() =>
                    setTagsSelezionati((prev) =>
                      checked ? prev.filter((t) => t !== tag.valore) : [...prev, tag.valore]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    checked
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-red-400"
                  }`}
                >
                  {tag.etichetta}
                </button>
              );
            })}
          </div>
          {tagsSelezionati.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Nessuna categoria selezionata — il corso verrà notificato a <strong>tutti</strong> gli iscritti.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("pubblicato")}
              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Pubblicato
              </span>
              <p className="text-xs text-gray-500">
                Il corso sarà visibile sul sito pubblico
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("attestatoAbilitato")}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Emissione attestato abilitata
              </span>
              <p className="text-xs text-gray-500">
                Dopo il corso, la segreteria potrà emettere l&apos;attestato per ogni
                partecipante. Potrai caricare il template nella pagina di
                modifica del corso.
              </p>
            </div>
          </label>
        </div>
      </div>

      {errore && <Alert variant="error">{errore}</Alert>}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Annulla
        </Button>
        <Button type="submit" loading={caricamento}>
          {modalita === "crea" ? "Crea corso" : "Salva modifiche"}
        </Button>
      </div>
    </form>
  );
}
