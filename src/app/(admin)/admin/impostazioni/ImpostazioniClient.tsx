"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Save, Eye, EyeOff, Mail, MessageSquare, Send, Settings, ImagePlus, Trash2, BookOpen, CreditCard, FlaskConical, CheckCircle, XCircle } from "lucide-react";

interface Impostazione {
  id: string;
  chiave: string;
  valore: string;
  gruppo: string;
  sensibile: boolean;
}

const STRUTTURA_IMPOSTAZIONI = [
  {
    gruppo: "email",
    icona: Mail,
    titolo: "Email (SMTP)",
    descrizione: "Configurazione per l'invio di notifiche email agli utenti.",
    campi: [
      { chiave: "smtp_host", label: "Host SMTP", placeholder: "smtp.gmail.com", tipo: "text" },
      { chiave: "smtp_port", label: "Porta SMTP", placeholder: "587", tipo: "number" },
      { chiave: "smtp_user", label: "Utente SMTP (email mittente)", placeholder: "noreply@tuodominio.it", tipo: "email" },
      { chiave: "smtp_password", label: "Password SMTP", placeholder: "••••••••", tipo: "password" },
      { chiave: "smtp_from_name", label: "Nome mittente", placeholder: "Gestione Corsi", tipo: "text" },
    ],
  },
  {
    gruppo: "whatsapp",
    icona: MessageSquare,
    titolo: "WhatsApp Business (futuro)",
    descrizione: "Integrazione con WhatsApp Business API per notifiche via WhatsApp.",
    campi: [
      { chiave: "whatsapp_abilitato", label: "Abilita notifiche WhatsApp", placeholder: "false", tipo: "select", opzioni: ["false", "true"] },
      { chiave: "whatsapp_phone_id", label: "Phone Number ID", placeholder: "ID del numero WhatsApp Business", tipo: "text" },
      { chiave: "whatsapp_token", label: "Token API (Bearer)", placeholder: "••••••••", tipo: "password" },
      { chiave: "whatsapp_template_prenotazione", label: "Template prenotazione", placeholder: "nome_template", tipo: "text" },
    ],
  },
  {
    gruppo: "telegram",
    icona: Send,
    titolo: "Telegram Bot (futuro)",
    descrizione: "Integrazione con Telegram Bot API per notifiche via Telegram.",
    campi: [
      { chiave: "telegram_abilitato", label: "Abilita notifiche Telegram", placeholder: "false", tipo: "select", opzioni: ["false", "true"] },
      { chiave: "telegram_bot_token", label: "Token Bot Telegram", placeholder: "••••••••", tipo: "password" },
      { chiave: "telegram_chat_id_segreteria", label: "Chat ID segreteria", placeholder: "-1001234567890", tipo: "text" },
    ],
  },
  {
    gruppo: "generale",
    icona: Settings,
    titolo: "Impostazioni generali",
    descrizione: "Configurazione generale della piattaforma.",
    campi: [
      { chiave: "app_name", label: "Nome applicazione", placeholder: "Gestione Corsi", tipo: "text" },
      { chiave: "app_url", label: "URL base applicazione", placeholder: "https://tuo-dominio.it", tipo: "url" },
      { chiave: "email_segreteria", label: "Email notifiche segreteria", placeholder: "segreteria@tuodominio.it", tipo: "email" },
      { chiave: "cron_secret", label: "Cron Secret (per rilascio posti)", placeholder: "••••••••", tipo: "password" },
    ],
  },
];

export default function ImpostazioniClient() {
  const [impostazioni, setImpostazioni] = useState<Record<string, string>>({});
  const [visibili, setVisibili] = useState<Record<string, boolean>>({});
  const [caricamento, setCaricamento] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: "success" | "error"; testo: string } | null>(null);
  const [caricandoLogo, setCaricandoLogo] = useState(false);
  const [messaggioLogo, setMessaggioLogo] = useState<{ tipo: "success" | "error"; testo: string } | null>(null);
  const [testandoEmail, setTestandoEmail] = useState(false);
  const [risultatoTestEmail, setRisultatoTestEmail] = useState<{ tipo: "success" | "error"; testo: string } | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/impostazioni")
      .then((r) => r.json())
      .then((data: Impostazione[]) => {
        const mappa: Record<string, string> = {};
        data.forEach((i) => { mappa[i.chiave] = i.valore; });
        setImpostazioni(mappa);
        setCaricamento(false);
      })
      .catch(() => setCaricamento(false));
  }, []);

  async function caricaLogo(file: File) {
    setCaricandoLogo(true);
    setMessaggioLogo(null);
    const form = new FormData();
    form.append("logo", file);
    const res = await fetch("/api/admin/impostazioni/logo", { method: "POST", body: form });
    const json = await res.json();
    setCaricandoLogo(false);
    if (res.ok) {
      setImpostazioni((prev) => ({ ...prev, logo_url: json.url }));
      setMessaggioLogo({ tipo: "success", testo: "Logo caricato con successo!" });
    } else {
      setMessaggioLogo({ tipo: "error", testo: json.error ?? "Errore durante il caricamento." });
    }
  }

  async function rimuoviLogo() {
    setCaricandoLogo(true);
    setMessaggioLogo(null);
    const res = await fetch("/api/admin/impostazioni/logo", { method: "DELETE" });
    setCaricandoLogo(false);
    if (res.ok) {
      setImpostazioni((prev) => { const n = { ...prev }; delete n.logo_url; return n; });
      setMessaggioLogo({ tipo: "success", testo: "Logo rimosso. Verrà usato il logo predefinito." });
      if (inputLogoRef.current) inputLogoRef.current.value = "";
    } else {
      setMessaggioLogo({ tipo: "error", testo: "Errore durante la rimozione." });
    }
  }

  async function testaSmtp() {
    setTestandoEmail(true);
    setRisultatoTestEmail(null);
    try {
      const res = await fetch("/api/admin/impostazioni/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: impostazioni.smtp_host,
          port: Number(impostazioni.smtp_port) || 587,
          user: impostazioni.smtp_user,
          pass: impostazioni.smtp_password,
          fromName: impostazioni.smtp_from_name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRisultatoTestEmail({ tipo: "success", testo: data.messaggio });
      } else {
        setRisultatoTestEmail({ tipo: "error", testo: `${data.error}${data.dettaglio ? `: ${data.dettaglio}` : ""}` });
      }
    } catch {
      setRisultatoTestEmail({ tipo: "error", testo: "Errore di rete durante il test." });
    } finally {
      setTestandoEmail(false);
    }
  }

  async function salva() {
    setSalvando(true);
    setMessaggio(null);

    const lista = Object.entries(impostazioni).map(([chiave, valore]) => {
      const gruppo = STRUTTURA_IMPOSTAZIONI.find((g) =>
        g.campi.some((c) => c.chiave === chiave)
      )?.gruppo ?? "generale";
      return { chiave, valore, gruppo };
    });

    const res = await fetch("/api/admin/impostazioni", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ impostazioni: lista }),
    });

    setSalvando(false);

    if (res.ok) {
      setMessaggio({ tipo: "success", testo: "Impostazioni salvate con successo!" });
    } else {
      setMessaggio({ tipo: "error", testo: "Errore durante il salvataggio." });
    }
  }

  if (caricamento) {
    return <div className="space-y-4">{[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
    ))}</div>;
  }

  return (
    <div className="space-y-6">
      {messaggio && (
        <Alert variant={messaggio.tipo}>
          {messaggio.testo}
        </Alert>
      )}

      {/* Card Logo */}
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <ImagePlus className="h-5 w-5 text-red-600" />
          <h2 className="font-semibold text-gray-900">Logo piattaforma</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Carica un'immagine personalizzata (PNG, JPG, WebP o SVG, max 2 MB).
          Viene mostrata nella barra di navigazione e nel pannello admin.
        </p>

        {/* Anteprima */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center justify-center w-40 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden shrink-0">
            {impostazioni.logo_url ? (
              <img
                src={impostazioni.logo_url}
                alt="Logo corrente"
                className="max-h-14 max-w-36 object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <BookOpen className="h-6 w-6" />
                <span className="text-xs">Predefinito</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {impostazioni.logo_url ? (
              <p className="font-medium text-green-700">Logo personalizzato attivo</p>
            ) : (
              <p className="text-gray-500">Nessun logo personalizzato — viene usato il logo predefinito.</p>
            )}
          </div>
        </div>

        {messaggioLogo && (
          <Alert variant={messaggioLogo.tipo} className="mb-4">
            {messaggioLogo.testo}
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            caricandoLogo
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}>
            <ImagePlus className="h-4 w-4" />
            {caricandoLogo ? "Caricamento…" : "Seleziona e carica logo"}
            <input
              ref={inputLogoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={caricandoLogo}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) caricaLogo(f);
              }}
            />
          </label>

          {impostazioni.logo_url && (
            <button
              onClick={rimuoviLogo}
              disabled={caricandoLogo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Rimuovi logo
            </button>
          )}
        </div>
      </Card>

      {/* Card Pagamenti */}
      {(() => {
        let metodiAbilitati: string[] = [];
        try { metodiAbilitati = JSON.parse(impostazioni["metodi_pagamento"] ?? "[]"); } catch { /* ignore */ }

        const toggleMetodo = (m: string) => {
          const next = metodiAbilitati.includes(m)
            ? metodiAbilitati.filter((x) => x !== m)
            : [...metodiAbilitati, m];
          setImpostazioni((prev) => ({ ...prev, metodi_pagamento: JSON.stringify(next) }));
        };

        return (
          <Card>
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-gray-900">Metodi di pagamento</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Abilita i metodi di pagamento online. Il bonifico bancario è sempre disponibile.
            </p>

            <div className="space-y-5">
              {/* Bonifico — sempre attivo */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <input type="checkbox" checked readOnly disabled className="h-4 w-4 text-red-600 rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Bonifico bancario</p>
                  <p className="text-xs text-gray-400">Sempre abilitato — nessuna configurazione richiesta</p>
                </div>
              </div>

              {/* Stripe */}
              <div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 mb-3">
                  <input
                    type="checkbox"
                    id="stripe-check"
                    checked={metodiAbilitati.includes("STRIPE")}
                    onChange={() => toggleMetodo("STRIPE")}
                    className="h-4 w-4 text-red-600 rounded"
                  />
                  <label htmlFor="stripe-check" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Stripe (carta di credito/debito)
                  </label>
                </div>
                {metodiAbilitati.includes("STRIPE") && (
                  <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                    {[
                      { chiave: "stripe_publishable_key", label: "Publishable Key (pk_...)", tipo: "text" },
                      { chiave: "stripe_secret_key", label: "Secret Key (sk_...)", tipo: "password" },
                    ].map((campo) => (
                      <div key={campo.chiave}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{campo.label}</label>
                        <div className="relative">
                          <input
                            type={campo.tipo === "password" && !visibili[campo.chiave] ? "password" : "text"}
                            value={impostazioni[campo.chiave] ?? ""}
                            onChange={(e) => setImpostazioni((prev) => ({ ...prev, [campo.chiave]: e.target.value }))}
                            placeholder={campo.tipo === "password" ? "••••••••" : ""}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 pr-10 font-mono"
                          />
                          {campo.tipo === "password" && (
                            <button type="button" onClick={() => setVisibili((prev) => ({ ...prev, [campo.chiave]: !prev[campo.chiave] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                              {visibili[campo.chiave] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PayPal */}
              <div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 mb-3">
                  <input
                    type="checkbox"
                    id="paypal-check"
                    checked={metodiAbilitati.includes("PAYPAL")}
                    onChange={() => toggleMetodo("PAYPAL")}
                    className="h-4 w-4 text-red-600 rounded"
                  />
                  <label htmlFor="paypal-check" className="text-sm font-medium text-gray-700 cursor-pointer">
                    PayPal
                  </label>
                </div>
                {metodiAbilitati.includes("PAYPAL") && (
                  <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                    {[
                      { chiave: "paypal_client_id", label: "Client ID", tipo: "text" },
                      { chiave: "paypal_client_secret", label: "Client Secret", tipo: "password" },
                    ].map((campo) => (
                      <div key={campo.chiave}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{campo.label}</label>
                        <div className="relative">
                          <input
                            type={campo.tipo === "password" && !visibili[campo.chiave] ? "password" : "text"}
                            value={impostazioni[campo.chiave] ?? ""}
                            onChange={(e) => setImpostazioni((prev) => ({ ...prev, [campo.chiave]: e.target.value }))}
                            placeholder={campo.tipo === "password" ? "••••••••" : ""}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 pr-10 font-mono"
                          />
                          {campo.tipo === "password" && (
                            <button type="button" onClick={() => setVisibili((prev) => ({ ...prev, [campo.chiave]: !prev[campo.chiave] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                              {visibili[campo.chiave] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modalità</label>
                      <select
                        value={impostazioni["paypal_mode"] ?? "sandbox"}
                        onChange={(e) => setImpostazioni((prev) => ({ ...prev, paypal_mode: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="sandbox">Sandbox (test)</option>
                        <option value="live">Live (produzione)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {STRUTTURA_IMPOSTAZIONI.map((sezione) => (
        <Card key={sezione.gruppo}>
          <div className="flex items-center gap-3 mb-1">
            <sezione.icona className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-gray-900">{sezione.titolo}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">{sezione.descrizione}</p>

          <div className="space-y-4">
            {sezione.campi.map((campo) => (
              <div key={campo.chiave}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {campo.label}
                </label>
                {campo.tipo === "select" && campo.opzioni ? (
                  <select
                    value={impostazioni[campo.chiave] ?? ""}
                    onChange={(e) =>
                      setImpostazioni((prev) => ({ ...prev, [campo.chiave]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- non configurato --</option>
                    {campo.opzioni.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type={
                        campo.tipo === "password"
                          ? visibili[campo.chiave] ? "text" : "password"
                          : campo.tipo
                      }
                      value={impostazioni[campo.chiave] ?? ""}
                      onChange={(e) =>
                        setImpostazioni((prev) => ({ ...prev, [campo.chiave]: e.target.value }))
                      }
                      placeholder={campo.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                    />
                    {campo.tipo === "password" && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibili((prev) => ({ ...prev, [campo.chiave]: !prev[campo.chiave] }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        {visibili[campo.chiave] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1 font-mono">{campo.chiave}</p>
              </div>
            ))}
          </div>

          {sezione.gruppo === "email" && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={testaSmtp}
                  disabled={testandoEmail}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <FlaskConical className="h-4 w-4" />
                  {testandoEmail ? "Invio in corso…" : "Invia email di test"}
                </button>
                <p className="text-xs text-gray-400">
                  Invia un&apos;email di prova alla tua casella admin per verificare la configurazione.
                  Salva prima le impostazioni se hai modificato la password.
                </p>
              </div>
              {risultatoTestEmail && (
                <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
                  risultatoTestEmail.tipo === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {risultatoTestEmail.tipo === "success"
                    ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{risultatoTestEmail.testo}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={salva} loading={salvando} size="lg">
          <Save className="h-4 w-4" />
          Salva tutte le impostazioni
        </Button>
      </div>
    </div>
  );
}
