"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { BookOpen } from "lucide-react";

const schema = z.object({
  nome: z.string().min(2, "Almeno 2 caratteri"),
  cognome: z.string().min(2, "Almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  telefono: z.string().optional(),
  password: z.string().min(8, "Almeno 8 caratteri"),
  confermaPassword: z.string(),
}).refine((d) => d.password === d.confermaPassword, {
  message: "Le password non corrispondono",
  path: ["confermaPassword"],
});

type FormData = z.infer<typeof schema>;

function FormRegistrazione() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErrore(null);
    setCaricamento(true);

    try {
      const res = await fetch("/api/auth/registrazione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          cognome: data.cognome,
          email: data.email,
          telefono: data.telefono,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrore(json.error);
        return;
      }

      // Login automatico dopo registrazione
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      router.push(redirect);
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nome"
          autoComplete="given-name"
          required
          {...register("nome")}
          error={errors.nome?.message}
        />
        <Input
          label="Cognome"
          autoComplete="family-name"
          required
          {...register("cognome")}
          error={errors.cognome?.message}
        />
      </div>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        {...register("email")}
        error={errors.email?.message}
      />
      <Input
        label="Telefono"
        type="tel"
        placeholder="opzionale"
        {...register("telefono")}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        {...register("password")}
        error={errors.password?.message}
        helperText="Almeno 8 caratteri"
      />
      <Input
        label="Conferma password"
        type="password"
        autoComplete="new-password"
        required
        {...register("confermaPassword")}
        error={errors.confermaPassword?.message}
      />

      {errore && <Alert variant="error">{errore}</Alert>}

      <Button type="submit" size="lg" className="w-full" loading={caricamento}>
        Crea account
      </Button>
    </form>
  );
}

export default function PaginaRegistrazione() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
            <BookOpen className="h-7 w-7 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crea un account</h1>
          <p className="text-gray-500 mt-1">
            Registrati per prenotare i corsi
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 rounded-lg" />}>
            <FormRegistrazione />
          </Suspense>

          <p className="text-center text-sm text-gray-500 mt-6">
            Hai già un account?{" "}
            <Link
              href="/auth/login"
              className="text-blue-600 hover:underline font-medium"
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
