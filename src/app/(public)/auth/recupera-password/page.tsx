"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function PaginaRecuperaPassword() {
  const [stato, setStato] = useState<"form" | "inviato">("form");
  const [caricamento, setCaricamento] = useState(false);

  const { register, handleSubmit } = useForm<{ email: string }>();

  async function onSubmit(data: { email: string }) {
    setCaricamento(true);
    await fetch("/api/auth/recupera-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setCaricamento(false);
    setStato("inviato");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
            <BookOpen className="h-7 w-7 text-red-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Password dimenticata?</h1>
          <p className="text-gray-500 mt-1">
            Inserisci la tua email per ricevere le istruzioni
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {stato === "inviato" ? (
            <Alert variant="success" title="Email inviata!">
              Se l'email è registrata, riceverai le istruzioni per reimpostare
              la password. Controlla anche la cartella spam.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                required
                {...register("email")}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={caricamento}
              >
                Invia istruzioni
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
