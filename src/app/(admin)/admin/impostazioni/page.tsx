import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImpostazioniClient from "./ImpostazioniClient";

export const revalidate = 0;

export default async function PaginaImpostazioni() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.ruolo !== "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Impostazioni di sistema
      </h1>
      <p className="text-gray-500 mb-8">
        Configurazione email, notifiche e integrazioni. Solo gli amministratori
        possono accedere a questa sezione.
      </p>

      <ImpostazioniClient />
    </div>
  );
}
