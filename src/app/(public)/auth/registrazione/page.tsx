import { Suspense } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import FormRegistrazione from "./FormRegistrazione";

export default async function PaginaRegistrazione() {
  // Read Turnstile site key from DB, fallback to env var
  const row = await prisma.impostazione.findUnique({ where: { chiave: "turnstile_site_key" } });
  const siteKey = row?.valore || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
            <BookOpen className="h-7 w-7 text-red-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crea un account</h1>
          <p className="text-gray-500 mt-1">
            Registrati per prenotare i corsi
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 rounded-lg" />}>
            <FormRegistrazione siteKey={siteKey} />
          </Suspense>

          <p className="text-center text-sm text-gray-500 mt-6">
            Hai già un account?{" "}
            <Link
              href="/auth/login"
              className="text-red-600 hover:underline font-medium"
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
