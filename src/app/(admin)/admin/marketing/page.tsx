import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTagsDisponibili } from "@/lib/leads";
import LeadsClient from "./LeadsClient";
import { Mail } from "lucide-react";

export const metadata = { title: "Marketing — Back Office" };

export default async function MarketingPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SEGRETERIA"].includes(session.user.ruolo)) {
    redirect("/admin");
  }

  const tagsDisponibili = await getTagsDisponibili();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing — Lead</h1>
          <p className="text-sm text-gray-500">
            Gestisci i contatti interessati ai corsi. Le notifiche vengono inviate automaticamente quando un corso viene pubblicato.
          </p>
        </div>
      </div>

      <LeadsClient tagsDisponibili={tagsDisponibili} />
    </div>
  );
}
