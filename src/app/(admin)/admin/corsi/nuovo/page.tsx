import FormCorso from "@/components/corsi/FormCorso";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function PaginaNuovoCorso() {
  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/admin/corsi"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tutti i corsi
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuovo corso</h1>

      <Card>
        <FormCorso modalita="crea" />
      </Card>
    </div>
  );
}
