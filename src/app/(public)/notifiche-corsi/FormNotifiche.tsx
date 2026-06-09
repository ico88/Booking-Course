"use client";

import { useState } from "react";
import { Bell, CheckCircle, Loader2 } from "lucide-react";

interface Tag {
  valore: string;
  etichetta: string;
}

interface Props {
  tags: Tag[];
}

export default function FormNotifiche({ tags }: Props) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [tagsSelezionati, setTagsSelezionati] = useState<string[]>([]);
  const [stato, setStato] = useState<"idle" | "loading" | "ok" | "errore">("idle");
  const [messaggio, setMessaggio] = useState("");

  function toggleTag(valore: string) {
    setTagsSelezionati((prev) =>
      prev.includes(valore) ? prev.filter((t) => t !== valore) : [...prev, valore]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tagsSelezionati.length === 0) {
      setMessaggio("Seleziona almeno una tipologia di corso.");
      setStato("errore");
      return;
    }

    setStato("loading");
    setMessaggio("");

    try {
      const res = await fetch("/api/marketing/registrati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nome: nome || undefined, cognome: cognome || undefined, tags: tagsSelezionati }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessaggio(data.error ?? "Errore durante la registrazione.");
        setStato("errore");
      } else {
        setStato("ok");
      }
    } catch {
      setMessaggio("Errore di rete. Riprova più tardi.");
      setStato("errore");
    }
  }

  if (stato === "ok") {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Quasi fatto!</h2>
        <p className="text-gray-600 leading-relaxed">
          Ti abbiamo inviato una email a <strong>{email}</strong>.<br />
          Clicca il link di conferma per attivare le notifiche.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="la-tua-email@esempio.it"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Mario"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
            <input
              type="text"
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              placeholder="Rossi"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Tipologie di corso <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const attivo = tagsSelezionati.includes(tag.valore);
            return (
              <button
                key={tag.valore}
                type="button"
                onClick={() => toggleTag(tag.valore)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  attivo
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
                }`}
              >
                {tag.etichetta}
              </button>
            );
          })}
        </div>
        {tagsSelezionati.length === 0 && stato === "errore" && (
          <p className="text-red-600 text-sm mt-2">Seleziona almeno una tipologia.</p>
        )}
      </div>

      {messaggio && stato === "errore" && (
        <p className="text-red-600 text-sm">{messaggio}</p>
      )}

      <p className="text-xs text-gray-500">
        Confermando acconsenti a ricevere email informative sui corsi. Potrai
        disiscriverti in qualsiasi momento tramite il link presente in ogni email.
        I tuoi dati non saranno ceduti a terzi.
      </p>

      <button
        type="submit"
        disabled={stato === "loading"}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {stato === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        Iscriviti alle notifiche
      </button>
    </form>
  );
}
