"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { BookOpen } from "lucide-react";

const schema = z.object({
  password: z.string().min(8, "Almeno 8 caratteri"),
  conferma: z.string(),
}).refine((d) => d.password === d.conferma, {
  message: "Le password non corrispondono",
  path: ["conferma"],
});

type FormData = z.infer<typeof schema>;

function FormNuovaPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setErrore(null);
    setCaricamento(true);

    const res = await fetch("/api/auth/nuova-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });

    const json = await res.json();
    setCaricamento(false);

    if (!res.ok) {
      setErrore(json.error);
      return;
    }

    router.push("/auth/login?reset=1");
  }

  if (!token) {
    return (
      <Alert variant="error">Link non valido. Richiedi un nuovo reset della password.</Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nuova password"
        type="password"
        required
        {...register("password")}
        error={errors.password?.message}
        helperText="Almeno 8 caratteri"
      />
      <Input
        label="Conferma password"
        type="password"
        required
        {...register("conferma")}
        error={errors.conferma?.message}
      />
      {errore && <Alert variant="error">{errore}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={caricamento}>
        Salva nuova password
      </Button>
    </form>
  );
}

export default function PaginaNuovaPassword() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
            <BookOpen className="h-7 w-7 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nuova password</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <Suspense fallback={<div className="h-40 animate-pulse bg-gray-50 rounded-lg" />}>
            <FormNuovaPassword />
          </Suspense>
          <div className="mt-4 text-center">
            <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-700">
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
