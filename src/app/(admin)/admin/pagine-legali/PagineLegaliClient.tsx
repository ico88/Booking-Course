"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Save, Eye, Code, RotateCcw } from "lucide-react";
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_COOKIE_POLICY,
  DEFAULT_TERMINI_CONDIZIONI,
} from "@/lib/pagine-legali-defaults";

const PAGINE = [
  { chiave: "pagina_privacy_policy", label: "Privacy Policy", href: "/privacy-policy" },
  { chiave: "pagina_cookie_policy", label: "Cookie Policy", href: "/cookie-policy" },
  { chiave: "pagina_termini_condizioni", label: "Termini e Condizioni", href: "/termini-condizioni" },
] as const;

type ChiavePagina = (typeof PAGINE)[number]["chiave"];

const DEFAULTS: Record<ChiavePagina, string> = {
  pagina_privacy_policy: DEFAULT_PRIVACY_POLICY,
  pagina_cookie_policy: DEFAULT_COOKIE_POLICY,
  pagina_termini_condizioni: DEFAULT_TERMINI_CONDIZIONI,
};

export default function PagineLegaliClient({
  defaults,
}: {
  defaults: Record<ChiavePagina, string>;
}) {
  const [tab, setTab] = useState<ChiavePagina>("pagina_privacy_policy");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  // Pre-fill with saved value or system default
  const [contenuti, setContenuti] = useState<Record<ChiavePagina, string>>({
    pagina_privacy_policy: defaults.pagina_privacy_policy || DEFAULTS.pagina_privacy_policy,
    pagina_cookie_policy: defaults.pagina_cookie_policy || DEFAULTS.pagina_cookie_policy,
    pagina_termini_condizioni: defaults.pagina_termini_condizioni || DEFAULTS.pagina_termini_condizioni,
  });
  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState<{
    tipo: "success" | "error";
    testo: string;
  } | null>(null);

  async function salva() {
    setSalvando(true);
    setMessaggio(null);

    const res = await fetch("/api/admin/impostazioni", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        impostazioni: PAGINE.map((p) => ({
          chiave: p.chiave,
          valore: contenuti[p.chiave],
          gruppo: "pagine_legali",
        })),
      }),
    });

    setSalvando(false);
    if (res.ok) {
      setMessaggio({
        tipo: "success",
        testo: "Contenuto salvato! Le modifiche sono visibili subito sul sito.",
      });
    } else {
      setMessaggio({ tipo: "error", testo: "Errore durante il salvataggio." });
    }
  }

  function ripristina() {
    setContenuti((prev) => ({ ...prev, [tab]: DEFAULTS[tab] }));
    setMessaggio(null);
  }

  const paginaCorrente = PAGINE.find((p) => p.chiave === tab)!;

  return (
    <div className="space-y-5">
      {messaggio && (
        <Alert variant={messaggio.tipo}>{messaggio.testo}</Alert>
      )}

      {/* Selezione pagina */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {PAGINE.map((p) => (
          <button
            key={p.chiave}
            onClick={() => { setTab(p.chiave); setMessaggio(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === p.chiave
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "edit"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            HTML
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "preview"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Anteprima
          </button>
        </div>

        <a
          href={paginaCorrente.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-red-600 hover:underline"
        >
          Vedi pagina pubblica →
        </a>
      </div>

      {/* Editor / Preview */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {mode === "edit" ? (
          <textarea
            value={contenuti[tab]}
            onChange={(e) =>
              setContenuti((prev) => ({ ...prev, [tab]: e.target.value }))
            }
            className="w-full h-[520px] p-4 font-mono text-sm text-gray-800 bg-gray-50 focus:outline-none focus:bg-white resize-none"
            spellCheck={false}
          />
        ) : (
          <div
            className="w-full min-h-[520px] p-6 text-sm text-gray-700 leading-relaxed space-y-8 overflow-auto"
            dangerouslySetInnerHTML={{ __html: contenuti[tab] }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={ripristina}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Ripristina predefinito
          </button>
          <p className="text-xs text-gray-400">
            Usa HTML: <code className="bg-gray-100 px-1 rounded">&lt;h2&gt;</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">&lt;p&gt;</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">&lt;ul&gt;&lt;li&gt;</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">&lt;strong&gt;</code>
          </p>
        </div>
        <Button onClick={salva} loading={salvando} className="shrink-0">
          <Save className="h-4 w-4" />
          Salva {paginaCorrente.label}
        </Button>
      </div>
    </div>
  );
}
