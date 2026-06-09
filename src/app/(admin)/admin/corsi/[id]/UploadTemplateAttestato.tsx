"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import DropZone from "@/components/ui/DropZone";
import EditorVisivoAttestato from "./EditorVisivoAttestato";
import { Upload, FileText, Trash2, Download, Code, Info, X, Pencil } from "lucide-react";

interface Props {
  corsoId: string;
  templateAttuale: string | null;
  nomeFile: string | null;
  htmlTemplate: string | null;
  abilitato: boolean;
}

const VARIABILI = [
  { var: "{{nomeCompleto}}", desc: "Nome e cognome partecipante" },
  { var: "{{nome}}", desc: "Nome" },
  { var: "{{cognome}}", desc: "Cognome" },
  { var: "{{codiceFiscale}}", desc: "Codice fiscale" },
  { var: "{{email}}", desc: "Email partecipante" },
  { var: "{{titoloCorso}}", desc: "Titolo del corso" },
  { var: "{{dataCorso}}", desc: "Data inizio corso" },
  { var: "{{dataFineCorso}}", desc: "Data fine corso" },
  { var: "{{luogoCorso}}", desc: "Luogo" },
  { var: "{{durataCorso}}", desc: "Durata" },
  { var: "{{dataEmissione}}", desc: "Data di oggi (emissione)" },
  { var: "{{anno}}", desc: "Anno corrente" },
  { var: "{{codiceAttestato}}", desc: "Codice univoco attestato" },
];

const HTML_ESEMPIO = `<div style="width:297mm;height:210mm;padding:20mm;box-sizing:border-box;font-family:Georgia,serif;background:#fff;border:2px solid #8B0000;position:relative">
  <div style="text-align:center;margin-bottom:10mm">
    <h1 style="font-size:28pt;color:#8B0000;margin:0">ATTESTATO DI PARTECIPAZIONE</h1>
    <hr style="border-color:#8B0000;margin:4mm 0">
  </div>
  <div style="text-align:center;margin:8mm 0">
    <p style="font-size:14pt;margin:0">Si attesta che</p>
    <p style="font-size:22pt;font-weight:bold;margin:4mm 0">{{nomeCompleto}}</p>
    <p style="font-size:11pt;color:#555;margin:0">C.F. {{codiceFiscale}}</p>
  </div>
  <div style="text-align:center;margin:6mm 0">
    <p style="font-size:13pt;margin:0">ha partecipato al corso</p>
    <p style="font-size:17pt;font-weight:bold;color:#8B0000;margin:3mm 0">{{titoloCorso}}</p>
    <p style="font-size:11pt;margin:0">svoltosi il <strong>{{dataCorso}}</strong> · Durata: <strong>{{durataCorso}}</strong></p>
    <p style="font-size:11pt;margin:2mm 0">Luogo: <strong>{{luogoCorso}}</strong></p>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:12mm">
    <div style="text-align:center;width:40%">
      <div style="border-top:1px solid #333;padding-top:2mm">
        <p style="font-size:10pt;margin:0">Il Responsabile</p>
      </div>
    </div>
    <div style="text-align:right">
      <p style="font-size:9pt;color:#888;margin:0">Emesso il {{dataEmissione}}</p>
      <p style="font-size:9pt;color:#888;margin:0">Codice: {{codiceAttestato}}</p>
    </div>
  </div>
</div>`;

export default function UploadTemplateAttestato({
  corsoId,
  templateAttuale,
  nomeFile,
  htmlTemplate,
  abilitato,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"file" | "html" | "visivo">(htmlTemplate ? "html" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [htmlText, setHtmlText] = useState(htmlTemplate ?? "");
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [successo, setSuccesso] = useState(false);
  const [abilitaAttestato, setAbilitaAttestato] = useState(abilitato);

  async function salva() {
    setCaricamento(true);
    setErrore(null);

    try {
      const formData = new FormData();
      formData.append("abilita", abilitaAttestato.toString());

      if (tab === "file" && file) {
        formData.append("file", file);
      } else if (tab === "html") {
        formData.append("htmlTemplate", htmlText);
      }

      const res = await fetch(`/api/admin/corsi/${corsoId}/attestato-template`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) { setErrore(json.error || "Errore"); return; }

      setFile(null);
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  async function rimuovi() {
    if (!confirm("Rimuovere il template?")) return;
    await fetch(`/api/admin/corsi/${corsoId}/attestato-template`, { method: "DELETE" });
    setHtmlText("");
    router.refresh();
  }

  async function salvaHtmlDiretto(html: string, sfondoFile: File | null) {
    setCaricamento(true);
    setErrore(null);
    setSuccesso(false);
    try {
      const formData = new FormData();
      formData.append("abilita", "true"); // always enable when saving from visual editor
      formData.append("htmlTemplate", html);
      if (sfondoFile) formData.append("sfondo", sfondoFile);
      const res = await fetch(`/api/admin/corsi/${corsoId}/attestato-template`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) { setErrore(json.error || "Errore"); return; }
      setSuccesso(true);
      router.refresh();
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  const canSave = tab === "file" ? (!!file || abilitaAttestato !== abilitato) : true;

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("file")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "file" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Upload className="h-4 w-4" /> Carica file
        </button>
        <button
          onClick={() => setTab("html")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "html" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Code className="h-4 w-4" /> Template HTML
        </button>
        <button
          onClick={() => setTab("visivo")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "visivo" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Pencil className="h-4 w-4" /> Editor visivo
        </button>
      </div>

      {tab === "file" && (
        <>
          {templateAttuale && (
            <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">{nomeFile || "Template attestato"}</p>
                  <p className="text-xs text-purple-700">Template file attuale</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={templateAttuale} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="h-4 w-4" />
                </a>
                <button onClick={rimuovi} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {file ? (
            <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600 shrink-0" />
                <p className="text-sm font-medium text-purple-900">{file.name}</p>
              </div>
              <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <DropZone
              onFile={setFile}
              accept="application/pdf,image/jpeg,image/png"
              maxMB={20}
              label={templateAttuale ? "Carica nuovo template" : "Carica template attestato"}
              sublabel="PDF, JPG o PNG · max 20 MB"
            />
          )}
        </>
      )}

      {tab === "visivo" && (
        <EditorVisivoAttestato onSalva={salvaHtmlDiretto} salvando={caricamento} />
      )}

      {tab === "html" && (
        <div className="space-y-3">
          {/* Variables reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">Variabili disponibili — copia e incolla nel template</p>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {VARIABILI.map((v) => (
                <div key={v.var} className="flex items-center gap-2">
                  <code
                    className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700 cursor-pointer hover:bg-blue-100"
                    onClick={() => navigator.clipboard.writeText(v.var)}
                    title="Clicca per copiare"
                  >
                    {v.var}
                  </code>
                  <span className="text-xs text-gray-500">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* HTML editor */}
          <div className="relative">
            <textarea
              value={htmlText}
              onChange={(e) => setHtmlText(e.target.value)}
              rows={16}
              placeholder="Incolla o scrivi il tuo template HTML qui..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
            />
            {!htmlText && (
              <button
                type="button"
                onClick={() => setHtmlText(HTML_ESEMPIO)}
                className="absolute bottom-3 right-3 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                Usa esempio A4 orizzontale
              </button>
            )}
          </div>

          {htmlText && (
            <p className="text-xs text-gray-500">
              Il formato A4 orizzontale (297×210mm) è consigliato per gli attestati.
              Il pulsante &quot;Stampa / Salva PDF&quot; apparirà in alto a destra nell&apos;anteprima.
            </p>
          )}
        </div>
      )}

      {successo && <Alert variant="success">Template salvato! Attestati abilitati per questo corso.</Alert>}
      {errore && <Alert variant="error">{errore}</Alert>}

      {tab !== "visivo" && (
        <div className="flex gap-3">
          <Button onClick={salva} loading={caricamento} disabled={!canSave} variant="outline">
            {tab === "html" ? "Salva template HTML" : file ? "Carica template" : "Salva impostazioni"}
          </Button>
          {(templateAttuale || htmlText) && (
            <Button onClick={rimuovi} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Rimuovi template
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
