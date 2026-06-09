"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { GraduationCap, Download, Search, X } from "lucide-react";

interface Prenotazione {
  id: string;
  attestatoEmesso: boolean;
  attestatoEmessoAt: Date | null;
  attestatoUrl: string | null;
  utente: { nome: string; cognome: string; email: string };
  corso: { titolo: string; dataInizio: Date };
}

interface Props {
  emessi: Prenotazione[];
  daEmettere: Prenotazione[];
}

function filtra(lista: Prenotazione[], q: string) {
  const s = q.toLowerCase().trim();
  if (!s) return lista;
  return lista.filter((p) =>
    `${p.utente.nome} ${p.utente.cognome} ${p.utente.email} ${p.corso.titolo}`
      .toLowerCase()
      .includes(s)
  );
}

export default function AttestatiClient({ emessi, daEmettere }: Props) {
  const [query, setQuery] = useState("");

  const emessiFiltrati = useMemo(() => filtra(emessi, query), [emessi, query]);
  const daEmettereFiltrati = useMemo(() => filtra(daEmettere, query), [daEmettere, query]);

  const cercando = query.trim().length > 0;

  return (
    <div>
      {/* Barra di ricerca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, email o corso…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Da emettere */}
      {(!cercando ? daEmettere.length > 0 : daEmettereFiltrati.length > 0) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Da emettere ({daEmettereFiltrati.length}{cercando && daEmettere.length !== daEmettereFiltrati.length ? ` di ${daEmettere.length}` : ""})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Partecipante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Corso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daEmettereFiltrati.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{p.utente.nome} {p.utente.cognome}</p>
                      <p className="text-xs text-gray-500">{p.utente.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{p.corso.titolo}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.corso.dataInizio)}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/prenotazioni/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        Emetti
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emessi */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Emessi ({emessiFiltrati.length}{cercando && emessi.length !== emessiFiltrati.length ? ` di ${emessi.length}` : ""})
        </h2>

        {emessiFiltrati.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {cercando ? "Nessun risultato per questa ricerca" : "Nessun attestato emesso ancora"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Partecipante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Corso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Emesso il</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emessiFiltrati.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{p.utente.nome} {p.utente.cognome}</p>
                      <p className="text-xs text-gray-500">{p.utente.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{p.corso.titolo}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-gray-700">
                        {p.attestatoEmessoAt ? formatDate(p.attestatoEmessoAt) : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.attestatoUrl && (
                          <a
                            href={p.attestatoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Scarica
                          </a>
                        )}
                        <Link
                          href={`/admin/prenotazioni/${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                          Dettaglio
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
