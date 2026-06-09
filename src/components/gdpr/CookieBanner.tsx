"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Cookie, ChevronDown, ChevronUp } from "lucide-react";

type ConsensoStorage = {
  necessari: true;
  analitici: boolean;
  marketing: boolean;
  timestamp: number;
};

const CHIAVE = "cookie_consenso";

function leggiConsenso(): ConsensoStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHIAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function salvaConsenso(analitici: boolean, marketing: boolean) {
  const payload: ConsensoStorage = {
    necessari: true,
    analitici,
    marketing,
    timestamp: Date.now(),
  };
  localStorage.setItem(CHIAVE, JSON.stringify(payload));
}

export default function CookieBanner() {
  const [visibile, setVisibile] = useState(false);
  const [espanso, setEspanso] = useState(false);
  const [analitici, setAnalitici] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consenso = leggiConsenso();
    if (!consenso) setVisibile(true);
  }, []);

  function accettaTutti() {
    salvaConsenso(true, true);
    setVisibile(false);
  }

  function rifiutaFacoltativi() {
    salvaConsenso(false, false);
    setVisibile(false);
  }

  function salvaPersonalizzato() {
    salvaConsenso(analitici, marketing);
    setVisibile(false);
  }

  if (!visibile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">
                Questo sito utilizza i cookie
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Utilizziamo cookie tecnici necessari al funzionamento del sito e, previo consenso,
                cookie analitici e di marketing. Puoi personalizzare le tue preferenze o accettare
                tutti i cookie. Per maggiori informazioni leggi la{" "}
                <Link href="/cookie-policy" className="text-red-600 hover:underline">
                  Cookie Policy
                </Link>{" "}
                e la{" "}
                <Link href="/privacy-policy" className="text-red-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {espanso && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Cookie necessari</p>
                  <p className="text-xs text-gray-500">
                    Indispensabili per il funzionamento del sito (sessione, autenticazione).
                  </p>
                </div>
                <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  Sempre attivi
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Cookie analitici</p>
                  <p className="text-xs text-gray-500">
                    Misurano le performance del sito in forma anonima e aggregata.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analitici}
                    onChange={(e) => setAnalitici(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600" />
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Cookie di marketing</p>
                  <p className="text-xs text-gray-500">
                    Utilizzati per mostrare contenuti personalizzati in base ai tuoi interessi.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600" />
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={accettaTutti}
              className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Accetta tutti
            </button>
            <button
              onClick={rifiutaFacoltativi}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Solo necessari
            </button>
            {espanso && (
              <button
                onClick={salvaPersonalizzato}
                className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-900 transition-colors"
              >
                Salva preferenze
              </button>
            )}
            <button
              onClick={() => setEspanso(!espanso)}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {espanso ? (
                <>Nascondi dettagli <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Personalizza <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
