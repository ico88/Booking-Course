"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
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
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

type FormData = z.infer<typeof schema>;

function FormLogin() {
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

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setCaricamento(false);

    if (result?.error) {
      setErrore("Email o password non corretti");
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        {...register("email")}
        error={errors.email?.message}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        {...register("password")}
        error={errors.password?.message}
      />

      <div className="text-right">
        <Link
          href="/auth/recupera-password"
          className="text-sm text-red-600 hover:underline"
        >
          Password dimenticata?
        </Link>
      </div>

      {errore && <Alert variant="error">{errore}</Alert>}

      <Button type="submit" size="lg" className="w-full" loading={caricamento}>
        Accedi
      </Button>
    </form>
  );
}

export default function PaginaLogin() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
            <BookOpen className="h-7 w-7 text-red-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Accedi</h1>
          <p className="text-gray-500 mt-1">
            Inserisci le tue credenziali per accedere
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 rounded-lg" />}>
            <FormLogin />
          </Suspense>

          <p className="text-center text-sm text-gray-500 mt-6">
            Non hai un account?{" "}
            <Link
              href="/auth/registrazione"
              className="text-red-600 hover:underline font-medium"
            >
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
