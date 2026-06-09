import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import BackupClient from "./BackupClient";

export const dynamic = "force-dynamic";

export default async function PaginaBackup() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.ruolo !== "ADMIN") redirect("/admin");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Backup</h1>
      <p className="text-gray-500 mb-8">
        Esegui backup manuali del database e dei file, oppure configura il backup
        automatico tramite cron job sul server.
      </p>
      <BackupClient />
    </div>
  );
}
