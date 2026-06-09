"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Upload, RefreshCw, Tag, Search, Send, Loader2, X, Check } from "lucide-react";

interface Lead {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  tags: string;
  verificato: boolean;
  attivo: boolean;
  createdAt: string;
  ultimoContatto: string | null;
}

interface Tag {
  valore: string;
  etichetta: string;
}

interface Props {
  tagsDisponibili: Tag[];
}

function parseTags(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

export default function LeadsClient({ tagsDisponibili }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());
  const [filtroTag, setFiltroTag] = useState<string>("");
  const [filtroTesto, setFiltroTesto] = useState<string>("");
  const [filtroStato, setFiltroStato] = useState<"tutti" | "attivi" | "inattivi" | "nonVerificati">("attivi");

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [tagsDefault, setTagsDefault] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [risultatoImport, setRisultatoImport] = useState<{ importati: number; aggiornati: number; saltati: number; errori: string[] } | null>(null);

  // Notify modal
  const [corsoIdNotifica, setCorsoIdNotifica] = useState("");
  const [notificando, setNotificando] = useState(false);
  const [risultatoNotifica, setRisultatoNotifica] = useState<{ inviati: number; saltati: number } | null>(null);

  const caricaLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/leads");
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { caricaLeads(); }, [caricaLeads]);

  const leadsFiltrati = leads.filter((l) => {
    const tags = parseTags(l.tags);
    if (filtroTag && !tags.includes(filtroTag)) return false;
    if (filtroStato === "attivi" && !l.attivo) return false;
    if (filtroStato === "inattivi" && l.attivo) return false;
    if (filtroStato === "nonVerificati" && l.verificato) return false;
    if (filtroTesto) {
      const testo = filtroTesto.toLowerCase();
      const nome = `${l.nome ?? ""} ${l.cognome ?? ""} ${l.email}`.toLowerCase();
      if (!nome.includes(testo)) return false;
    }
    return true;
  });

  function toggleSeleziona(id: string) {
    setSelezionati((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleTutti() {
    if (selezionati.size === leadsFiltrati.length) {
      setSelezionati(new Set());
    } else {
      setSelezionati(new Set(leadsFiltrati.map((l) => l.id)));
    }
  }

  async function eliminaSelezionati() {
    if (!selezionati.size) return;
    if (!confirm(`Eliminare ${selezionati.size} lead?`)) return;
    await fetch("/api/admin/marketing/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selezionati] }),
    });
    setSelezionati(new Set());
    caricaLeads();
  }

  async function eseguiImport() {
    if (!csvText.trim()) return;
    setImportando(true);
    setRisultatoImport(null);
    try {
      const res = await fetch("/api/admin/marketing/importa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, tagDefault: tagsDefault }),
      });
      const data = await res.json();
      setRisultatoImport(data);
      caricaLeads();
    } finally {
      setImportando(false);
    }
  }

  async function inviaNotifica() {
    if (!corsoIdNotifica.trim()) return;
    setNotificando(true);
    setRisultatoNotifica(null);
    try {
      const res = await fetch("/api/admin/marketing/notifica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corsoId: corsoIdNotifica.trim() }),
      });
      const data = await res.json();
      setRisultatoNotifica(data);
    } finally {
      setNotificando(false);
    }
  }

  const stats = {
    totale: leads.length,
    attivi: leads.filter((l) => l.attivo).length,
    verificati: leads.filter((l) => l.verificato && l.attivo).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Totale lead", value: stats.totale },
          { label: "Attivi", value: stats.attivi },
          { label: "Verificati", value: stats.verificati },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Upload className="h-4 w-4" /> Importa CSV
          </button>
          <button
            onClick={caricaLeads}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" /> Aggiorna
          </button>
          {selezionati.size > 0 && (
            <button
              onClick={eliminaSelezionati}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" /> Elimina ({selezionati.size})
            </button>
          )}
        </div>

        {/* Manual notify */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="ID corso per notifica manuale"
            value={corsoIdNotifica}
            onChange={(e) => setCorsoIdNotifica(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-52"
          />
          <button
            onClick={inviaNotifica}
            disabled={notificando || !corsoIdNotifica.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60"
          >
            {notificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Notifica
          </button>
          {risultatoNotifica && (
            <span className="text-sm text-gray-600">
              Inviati: {risultatoNotifica.inviati}, saltati: {risultatoNotifica.saltati}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Cerca per nome o email…"
            value={filtroTesto}
            onChange={(e) => setFiltroTesto(e.target.value)}
            className="w-full border-none outline-none text-sm"
          />
        </div>
        <select
          value={filtroTag}
          onChange={(e) => setFiltroTag(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">Tutti i tag</option>
          {tagsDisponibili.map((t) => (
            <option key={t.valore} value={t.valore}>{t.etichetta}</option>
          ))}
        </select>
        <select
          value={filtroStato}
          onChange={(e) => setFiltroStato(e.target.value as typeof filtroStato)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="tutti">Tutti gli stati</option>
          <option value="attivi">Attivi</option>
          <option value="inattivi">Disiscritti</option>
          <option value="nonVerificati">Non verificati</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={leadsFiltrati.length > 0 && selezionati.size === leadsFiltrati.length}
                  onChange={toggleTutti}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Tag</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Stato</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Iscritto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Caricamento…
                </td>
              </tr>
            ) : leadsFiltrati.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Nessun lead trovato</td>
              </tr>
            ) : (
              leadsFiltrati.map((lead) => {
                const tags = parseTags(lead.tags);
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selezionati.has(lead.id)}
                        onChange={() => toggleSeleziona(lead.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[lead.nome, lead.cognome].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <span className="text-gray-400 text-xs">nessun tag</span>
                        ) : (
                          tags.map((t) => (
                            <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{t}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {lead.verificato ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            <Check className="h-3 w-3" /> verificato
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">in attesa</span>
                        )}
                        {!lead.attivo && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">disiscritto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && (
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            {leadsFiltrati.length} di {leads.length} lead
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Importa contatti da CSV</h2>
              <button onClick={() => { setShowImport(false); setRisultatoImport(null); setCsvText(""); setTagsDefault([]); }}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-sm text-gray-600">
                Formato CSV: <code className="bg-gray-100 px-1 rounded">email,nome,cognome,tag1;tag2</code><br />
                La prima riga viene ignorata se contiene &quot;email&quot;. I contatti importati sono considerati già verificati.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag predefiniti (applicati a tutti)</label>
                <div className="flex flex-wrap gap-2">
                  {tagsDisponibili.map((t) => (
                    <button
                      key={t.valore}
                      type="button"
                      onClick={() => setTagsDefault((prev) =>
                        prev.includes(t.valore) ? prev.filter((x) => x !== t.valore) : [...prev, t.valore]
                      )}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        tagsDefault.includes(t.valore)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                      }`}
                    >
                      {t.etichetta}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto CSV</label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={12}
                  placeholder={"email,nome,cognome,tags\nmario.rossi@esempio.it,Mario,Rossi,fulld-sanitario;msp"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {risultatoImport && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                  <p><span className="font-medium text-green-700">Importati:</span> {risultatoImport.importati}</p>
                  <p><span className="font-medium text-blue-700">Aggiornati:</span> {risultatoImport.aggiornati}</p>
                  <p><span className="font-medium text-gray-600">Saltati:</span> {risultatoImport.saltati}</p>
                  {risultatoImport.errori.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-700">Errori:</p>
                      <ul className="list-disc list-inside text-red-600 space-y-0.5">
                        {risultatoImport.errori.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowImport(false); setRisultatoImport(null); setCsvText(""); setTagsDefault([]); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Chiudi
              </button>
              <button
                onClick={eseguiImport}
                disabled={importando || !csvText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
