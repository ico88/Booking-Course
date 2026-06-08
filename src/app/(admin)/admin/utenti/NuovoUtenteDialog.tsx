"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import { UserPlus, X } from "lucide-react";

const schema = z.object({
  nome: z.string().min(2),
  cognome: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().optional(),
  ruolo: z.enum(["UTENTE", "SEGRETERIA"]),
});

type FormData = z.infer<typeof schema>;

export default function NuovoUtenteDialog() {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [successo, setSuccesso] = useState<{ passwordGenerata?: string } | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ruolo: "UTENTE" },
  });

  async function onSubmit(data: FormData) {
    setCaricamento(true);
    setErrore(null);

    const res = await fetch("/api/admin/utenti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setCaricamento(false);

    if (!res.ok) {
      setErrore(json.error);
      return;
    }

    setSuccesso(json);
    reset();
    router.refresh();
  }

  function chiudi() {
    setAperto(false);
    setSuccesso(null);
    setErrore(null);
    reset();
  }

  return (
    <>
      <Button onClick={() => setAperto(true)}>
        <UserPlus className="h-4 w-4" />
        Nuovo utente
      </Button>

      {aperto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Crea nuovo utente</h2>
              <button onClick={chiudi} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {successo ? (
                <div>
                  <Alert variant="success" title="Utente creato!">
                    L&apos;utente è stato creato con successo.
                    {successo.passwordGenerata && (
                      <div className="mt-2">
                        <p className="font-medium">Password generata automaticamente:</p>
                        <code className="block bg-green-100 px-3 py-2 rounded mt-1 text-green-800 font-mono">
                          {successo.passwordGenerata}
                        </code>
                        <p className="text-xs mt-1">
                          Comunica questa password all&apos;utente.
                        </p>
                      </div>
                    )}
                  </Alert>
                  <Button onClick={chiudi} className="w-full mt-4" variant="outline">
                    Chiudi
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nome" required {...register("nome")} error={errors.nome?.message} />
                    <Input label="Cognome" required {...register("cognome")} error={errors.cognome?.message} />
                  </div>
                  <Input label="Email" type="email" required {...register("email")} error={errors.email?.message} />
                  <Input label="Telefono" placeholder="opzionale" {...register("telefono")} />
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ruolo</label>
                    <select
                      {...register("ruolo")}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTENTE">Utente</option>
                      <option value="SEGRETERIA">Segreteria</option>
                    </select>
                  </div>
                  {errore && <Alert variant="error">{errore}</Alert>}
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={chiudi} className="flex-1">
                      Annulla
                    </Button>
                    <Button type="submit" loading={caricamento} className="flex-1">
                      Crea utente
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
