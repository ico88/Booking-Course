"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

export default function DuplicaCorsoButton({
  corsoId,
  variant = "list",
}: {
  corsoId: string;
  variant?: "list" | "page";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function duplica() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/corsi/${corsoId}/duplica`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        router.push(`/admin/corsi/${json.id}?duplicato=1`);
        router.refresh();
      } else {
        alert(json.error ?? "Errore durante la duplicazione");
        setLoading(false);
      }
    } catch {
      alert("Errore di rete. Riprova.");
      setLoading(false);
    }
  }

  if (variant === "page") {
    return (
      <button
        onClick={duplica}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
      >
        <Copy className="h-4 w-4" />
        {loading ? "Duplicando…" : "Duplica corso"}
      </button>
    );
  }

  return (
    <button
      onClick={duplica}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg disabled:opacity-50 transition-colors"
      title="Duplica questo corso (crea una bozza con gli stessi dati)"
    >
      <Copy className="h-3.5 w-3.5" />
      {loading ? "…" : "Duplica"}
    </button>
  );
}
