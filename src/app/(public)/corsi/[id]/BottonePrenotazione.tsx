"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BookOpen, Lock } from "lucide-react";

interface Props {
  corsoId: string;
  isCompleto: boolean;
  isPassato: boolean;
  costo: number;
}

export default function BottonePrenotazione({
  corsoId,
  isCompleto,
  isPassato,
}: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (isPassato) {
    return (
      <p className="text-center text-sm text-gray-500">
        Le iscrizioni per questo corso sono chiuse.
      </p>
    );
  }

  if (isCompleto) {
    return (
      <Button disabled className="w-full" variant="secondary">
        Posti esauriti
      </Button>
    );
  }

  if (status === "loading") {
    return <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />;
  }

  if (!session) {
    return (
      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={() =>
            router.push(
              `/auth/login?redirect=/corsi/${corsoId}`
            )
          }
        >
          <Lock className="h-4 w-4" />
          Accedi per prenotare
        </Button>
        <p className="text-center text-xs text-gray-500">
          Non hai un account?{" "}
          <a
            href={`/auth/registrazione?redirect=/corsi/${corsoId}`}
            className="text-red-600 hover:underline font-medium"
          >
            Registrati gratis
          </a>
        </p>
      </div>
    );
  }

  return (
    <Button
      className="w-full"
      size="lg"
      onClick={() => router.push(`/corsi/${corsoId}/prenota`)}
    >
      <BookOpen className="h-4 w-4" />
      Prenota ora
    </Button>
  );
}
