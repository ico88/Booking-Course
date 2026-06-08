"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Save, Eye, EyeOff, Mail, MessageSquare, Send, Settings } from "lucide-react";

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

      {STRUTTURA_IMPOSTAZIONI.map((sezione) => (
        <Card key={sezione.gruppo}>
          <div className="flex items-center gap-3 mb-1">
            <sezione.icona className="h-5 w-5 text-blue-600" />
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
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
