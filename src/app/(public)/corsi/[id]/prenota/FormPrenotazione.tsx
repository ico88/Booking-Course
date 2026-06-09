"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, Users } from "lucide-react";

const schemaPartecipante = z.object({
  nome: z.string().min(1, "Nome richiesto"),
  cognome: z.string().min(1, "Cognome richiesto"),
  email: z.string().email("Email non valida"),
  telefono: z.string().min(1, "Telefono richiesto"),
  codiceFiscale: z.string().min(16, "Codice fiscale richiesto").max(16, "Codice fiscale non valido"),
});

const schema = z.object({
  partecipanti: z.array(schemaPartecipante).min(1),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  corsoId: string;
  postiLiberi: number;
  costoPerPosto: number;
  timeoutOre: number;
  utente?: { nome: string; cognome: string; email: string; telefono?: string | null; codiceFiscale?: string | null };
}

export default function FormPrenotazione({
  corsoId,
  postiLiberi,
  costoPerPosto,
  timeoutOre,
  utente,
}: Props) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      partecipanti: [{
        nome: utente?.nome ?? "",
        cognome: utente?.cognome ?? "",
        email: utente?.email ?? "",
        telefono: utente?.telefono ?? "",
        codiceFiscale: utente?.codiceFiscale ?? "",
      }],
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "partecipanti",
  });

  const numeroPosti = fields.length;
  const costoTotale = numeroPosti * costoPerPosto;

  async function onSubmit(data: FormData) {
    setErrore(null);
    setCaricamento(true);

    try {
      const res = await fetch("/api/prenotazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corsoId,
          numeroPosti,
          partecipanti: data.partecipanti,
          note: data.note,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error || "Errore durante la prenotazione");
        return;
      }

      // Gratuito → già confermato, vai alla prenotazione
      if (json.gratuito) {
        router.push(`/dashboard/prenotazioni/${json.id}?confermata=1`);
      } else {
        router.push(`/dashboard/pagamento/${json.id}`);
      }
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            Partecipanti
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => remove(fields.length - 1)}
              disabled={fields.length <= 1}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-bold text-gray-900">
              {numeroPosti}
            </span>
            <button
              type="button"
              onClick={() =>
                append({ nome: "", cognome: "", email: "", telefono: "", codiceFiscale: "" })
              }
              disabled={numeroPosti >= postiLiberi || numeroPosti >= 10}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="bg-gray-50 rounded-xl p-5 border border-gray-200"
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Partecipante {index + 1}
                {index === 0 && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (il tuo primo posto)
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nome"
                  required
                  {...register(`partecipanti.${index}.nome`)}
                  error={errors.partecipanti?.[index]?.nome?.message}
                />
                <Input
                  label="Cognome"
                  required
                  {...register(`partecipanti.${index}.cognome`)}
                  error={errors.partecipanti?.[index]?.cognome?.message}
                />
                <Input
                  label="Codice Fiscale"
                  required
                  placeholder="RSSMRA80A01H501U"
                  {...register(`partecipanti.${index}.codiceFiscale`, {
                    setValueAs: (v: string) => v?.toUpperCase(),
                  })}
                  error={errors.partecipanti?.[index]?.codiceFiscale?.message}
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  {...register(`partecipanti.${index}.email`)}
                  error={errors.partecipanti?.[index]?.email?.message}
                />
                <Input
                  label="Telefono"
                  type="tel"
                  required
                  {...register(`partecipanti.${index}.telefono`)}
                  error={errors.partecipanti?.[index]?.telefono?.message}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Input
        label="Note aggiuntive"
        placeholder="Esigenze particolari, richieste speciali..."
        {...register("note")}
      />

      {errore && <Alert variant="error">{errore}</Alert>}

      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            {numeroPosti} posto{numeroPosti !== 1 ? "i" : ""} ×{" "}
            {formatCurrency(costoPerPosto)}
          </span>
          <span>{formatCurrency(costoTotale)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-lg border-t pt-2 mt-2">
          <span>Totale</span>
          <span>{formatCurrency(costoTotale)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Dopo la prenotazione avrai {timeoutOre} ore per effettuare il
          bonifico e caricare la ricevuta.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={caricamento}>
        Conferma prenotazione
      </Button>
    </form>
  );
}
