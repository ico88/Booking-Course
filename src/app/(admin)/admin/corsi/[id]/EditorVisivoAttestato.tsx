"use client";

import { useState, useRef, useEffect } from "react";
import DropZone from "@/components/ui/DropZone";
import { Trash2, X, MousePointer, Eye } from "lucide-react";
import { cn, sostituisciVariabiliAttestato } from "@/lib/utils";

const VARIABILI = [
  { var: "{{nomeCompleto}}", label: "Nome e cognome" },
  { var: "{{nome}}", label: "Nome" },
  { var: "{{cognome}}", label: "Cognome" },
  { var: "{{codiceFiscale}}", label: "Cod. Fiscale" },
  { var: "{{email}}", label: "Email" },
  { var: "{{titoloCorso}}", label: "Titolo corso" },
  { var: "{{dataCorso}}", label: "Data inizio" },
  { var: "{{dataFineCorso}}", label: "Data fine" },
  { var: "{{luogoCorso}}", label: "Luogo" },
  { var: "{{durataCorso}}", label: "Durata" },
  { var: "{{dataEmissione}}", label: "Data emissione" },
  { var: "{{anno}}", label: "Anno" },
  { var: "{{codiceAttestato}}", label: "Codice univoco" },
];

const FONT_FAMILIES = [
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
];

type Elemento = {
  id: string;
  testo: string;
  x: number; // % from left
  y: number; // % from top
  fontSize: number; // pt
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  fontFamily: string;
};

interface Props {
  onSalva: (html: string, sfondoFile: File | null) => void;
  salvando: boolean;
  htmlTemplate?: string | null;
}

// A4 landscape at 96 dpi ≈ 1123 × 794 px
const A4_W_PX = 1123;

// Resize and compress the background image to a data URL that fits comfortably in a DB TEXT field.
// Target: 1600px wide, JPEG at 0.75 quality ≈ 150-400 KB base64.
function comprimiSfondo(file: File, maxWidth = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("image load failed")); };
    img.src = objectUrl;
  });
}

// Parse a previously saved template HTML back into editor state.
// Returns null if the HTML doesn't look like a visual-editor template.
function parseTemplateSalvato(html: string): { sfondoDataUrl: string | null; elementi: Elemento[] } | null {
  if (typeof window === "undefined") return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const container = doc.querySelector<HTMLDivElement>("div[style*='297mm']");
  if (!container) return null;

  const style = container.getAttribute("style") ?? "";
  const bgMatch = style.match(/background-image:\s*url\(['"]?(data:[^'")\s]+)['"]?\)/);
  const sfondoDataUrl = bgMatch ? bgMatch[1] : null;

  const elementi: Elemento[] = [];
  container.querySelectorAll<HTMLSpanElement>("span[style]").forEach((span) => {
    const s = span.getAttribute("style") ?? "";
    const left = s.match(/left:([\d.]+)%/)?.[1];
    const top = s.match(/top:([\d.]+)%/)?.[1];
    const testo = span.textContent?.trim() ?? "";
    if (!left || !top || !testo) return;
    elementi.push({
      id: Math.random().toString(36).slice(2),
      testo,
      x: parseFloat(left),
      y: parseFloat(top),
      fontSize: parseFloat(s.match(/font-size:([\d.]+)pt/)?.[1] ?? "14"),
      fontWeight: (s.match(/font-weight:(normal|bold)/)?.[1] ?? "normal") as "normal" | "bold",
      fontStyle: (s.match(/font-style:(normal|italic)/)?.[1] ?? "normal") as "normal" | "italic",
      color: s.match(/color:(#[0-9a-fA-F]{3,8})/)?.[1] ?? "#000000",
      fontFamily: s.match(/font-family:([^;]+)/)?.[1]?.trim() ?? "Georgia, serif",
    });
  });

  return { sfondoDataUrl, elementi };
}

export default function EditorVisivoAttestato({ onSalva, salvando, htmlTemplate }: Props) {
  const [sfondoFile, setSfondoFile] = useState<File | null>(null);
  const [sfondoUrl, setSfondoUrl] = useState<string | null>(null);
  // Holds the already-compressed base64 when restoring from a saved template
  const [sfondoDataUrl, setSfondoDataUrl] = useState<string | null>(null);
  const [elementi, setElementi] = useState<Elemento[]>([]);
  const [variabileAttiva, setVariabileAttiva] = useState<string | null>(null);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const dragStart = useRef<{ mouseX: number; mouseY: number; origX: number; origY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Restore state from a previously saved template (runs once on mount)
  useEffect(() => {
    if (!htmlTemplate) return;
    const parsed = parseTemplateSalvato(htmlTemplate);
    if (!parsed) return;
    if (parsed.sfondoDataUrl) {
      setSfondoDataUrl(parsed.sfondoDataUrl);
      setSfondoUrl(parsed.sfondoDataUrl);
    }
    if (parsed.elementi.length > 0) setElementi(parsed.elementi);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track canvas width for accurate font-size preview scaling
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      setCanvasWidth(entries[0].contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [sfondoUrl]);

  // Drag: attach mousemove/mouseup on document while dragging
  useEffect(() => {
    if (!draggingId) return;
    function onMove(e: MouseEvent) {
      if (!dragStart.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.current.mouseX) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.mouseY) / rect.height) * 100;
      setElementi((prev) =>
        prev.map((el) =>
          el.id === draggingId
            ? {
                ...el,
                x: Math.max(0, Math.min(96, dragStart.current!.origX + dx)),
                y: Math.max(0, Math.min(97, dragStart.current!.origY + dy)),
              }
            : el
        )
      );
    }
    function onUp() {
      setDraggingId(null);
      dragStart.current = null;
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [draggingId]);

  function handleSfondo(file: File) {
    setSfondoFile(file);
    setSfondoDataUrl(null); // new file supersedes any restored data URL
    setSfondoUrl(URL.createObjectURL(file));
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggingId) return;
    if (!variabileAttiva || !canvasRef.current) return;
    if ((e.target as HTMLElement).closest("[data-elemento]")) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = Math.random().toString(36).slice(2);
    setElementi((prev) => [
      ...prev,
      {
        id,
        testo: variabileAttiva,
        x: Math.max(0, Math.min(96, x)),
        y: Math.max(0, Math.min(97, y)),
        fontSize: 14,
        fontWeight: "normal",
        fontStyle: "normal",
        color: "#000000",
        fontFamily: "Georgia, serif",
      },
    ]);
    setVariabileAttiva(null);
    setSelezionato(id);
  }

  function startDrag(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const el = elementi.find((el) => el.id === id);
    if (!el) return;
    setDraggingId(id);
    setSelezionato(id);
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, origX: el.x, origY: el.y };
  }

  function updateEl(id: string, changes: Partial<Elemento>) {
    setElementi((prev) => prev.map((el) => (el.id === id ? { ...el, ...changes } : el)));
  }

  function rimuovi(id: string) {
    setElementi((prev) => prev.filter((el) => el.id !== id));
    if (selezionato === id) setSelezionato(null);
  }

  async function handleSalva() {
    let bgStyle = "background:#fff;";
    if (sfondoFile) {
      // New file uploaded: compress and embed
      const base64 = await comprimiSfondo(sfondoFile);
      bgStyle = `background-image:url('${base64}');background-size:cover;background-position:center;`;
    } else if (sfondoDataUrl) {
      // Restored from existing template: reuse as-is (already compressed)
      bgStyle = `background-image:url('${sfondoDataUrl}');background-size:cover;background-position:center;`;
    }

    const spans = elementi
      .map(
        (el) =>
          `  <span style="position:absolute;left:${el.x.toFixed(2)}%;top:${el.y.toFixed(2)}%;font-size:${el.fontSize}pt;font-weight:${el.fontWeight};font-style:${el.fontStyle};color:${el.color};font-family:${el.fontFamily};white-space:nowrap;transform:translateY(-50%);">${el.testo}</span>`
      )
      .join("\n");

    const html = `<div style="width:297mm;height:210mm;position:relative;${bgStyle}print-color-adjust:exact;-webkit-print-color-adjust:exact;overflow:hidden;">\n${spans}\n</div>`;
    onSalva(html, null);
  }

  function handleAnteprima() {
    if (elementi.length === 0) return;

    const oggi = new Date();
    const valoriEsempio: Record<string, string> = {
      nome: "Mario",
      cognome: "Rossi",
      nomeCompleto: "Mario Rossi",
      codiceFiscale: "RSSMRA80A01H501U",
      email: "mario.rossi@esempio.it",
      titoloCorso: "Corso di primo soccorso",
      dataCorso: "15 gennaio 2025",
      dataFineCorso: "16 gennaio 2025",
      luogoCorso: "Milano, Via Roma 1",
      durataCorso: "8 ore",
      orarioCorso: "09:00 – 18:00",
      dataEmissione: oggi.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }),
      anno: oggi.getFullYear().toString(),
      codiceAttestato: "ABCD1234",
    };

    // Use the object URL directly for preview (no re-compression needed)
    const bgStyle = sfondoUrl
      ? `background-image:url('${sfondoUrl}');background-size:cover;background-position:center;`
      : "background:#fff;";

    const spans = elementi
      .map(
        (el) =>
          `  <span style="position:absolute;left:${el.x.toFixed(2)}%;top:${el.y.toFixed(2)}%;font-size:${el.fontSize}pt;font-weight:${el.fontWeight};font-style:${el.fontStyle};color:${el.color};font-family:${el.fontFamily};white-space:nowrap;transform:translateY(-50%);">${el.testo}</span>`
      )
      .join("\n");

    const divHtml = `<div style="width:297mm;height:210mm;position:relative;${bgStyle}print-color-adjust:exact;-webkit-print-color-adjust:exact;overflow:hidden;">\n${spans}\n</div>`;

    const fullHtml = sostituisciVariabiliAttestato(
      `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Anteprima attestato</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    body { margin: 0; padding: 0; background: #e5e7eb; display: flex; justify-content: center; padding: 24px; }
    @media print { body { background: none; padding: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:999;display:flex;gap:8px;">
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 14px;font-size:13px;font-family:sans-serif;color:#92400e;">
      ⚠ Anteprima con dati di esempio
    </div>
    <button onclick="window.print()" style="padding:8px 18px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:sans-serif">
      Stampa / Salva PDF
    </button>
  </div>
  ${divHtml}
</body>
</html>`,
      valoriEsempio
    );

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Release the blob URL after the new tab has had time to load it
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const elSel = elementi.find((el) => el.id === selezionato);
  // 1pt = 1.333px at 96dpi; scale by canvas display width vs real A4 width
  const ptToPx = canvasWidth ? (canvasWidth / A4_W_PX) * 1.333 : 0.75;

  return (
    <div className="space-y-4">
      {/* Step 1 — background image */}
      {!sfondoUrl ? (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
              1
            </span>
            Carica l&apos;immagine di sfondo del tuo attestato
          </p>
          <DropZone
            onFile={handleSfondo}
            accept="image/jpeg,image/png,image/webp"
            maxMB={10}
            label="Trascina l'immagine di sfondo"
            sublabel="JPG, PNG, WebP · max 10 MB — verrà incorporata nel template"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-200 text-green-700 text-xs font-bold">
              ✓
            </span>
            <p className="text-sm text-green-800 font-medium">Sfondo: {sfondoFile?.name}</p>
          </div>
          <button
            onClick={() => { setSfondoUrl(null); setSfondoFile(null); setSfondoDataUrl(null); }}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Cambia
          </button>
        </div>
      )}

      {sfondoUrl && (
        <>
          {/* Step 2 — place variables */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
                2
              </span>
              {variabileAttiva ? (
                <span>
                  Clicca sul canvas per posizionare{" "}
                  <strong className="text-purple-700">{variabileAttiva}</strong> — oppure scegli un&apos;altra
                </span>
              ) : (
                "Seleziona una variabile, poi cliccala sul canvas per posizionarla"
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABILI.map((v) => (
                <button
                  key={v.var}
                  onClick={() => setVariabileAttiva(variabileAttiva === v.var ? null : v.var)}
                  title={v.var}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    variabileAttiva === v.var
                      ? "bg-purple-600 border-purple-600 text-white shadow-md scale-105"
                      : elementi.some((el) => el.testo === v.var)
                      ? "bg-purple-50 border-purple-300 text-purple-700"
                      : "bg-white border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50"
                  )}
                >
                  {variabileAttiva === v.var && <MousePointer className="h-3 w-3" />}
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* A4 canvas */}
          <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm">
            <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">
                A4 orizzontale · {elementi.length} elemento{elementi.length !== 1 && "i"}
                {variabileAttiva && (
                  <span className="ml-2 text-purple-600 font-semibold animate-pulse">
                    ← clicca sul canvas per posizionare
                  </span>
                )}
              </span>
              {elementi.length > 0 && (
                <button
                  onClick={() => { setElementi([]); setSelezionato(null); }}
                  className="text-red-500 hover:text-red-700"
                >
                  Svuota tutto
                </button>
              )}
            </div>
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                aspectRatio: "297/210",
                position: "relative",
                backgroundImage: `url(${sfondoUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: variabileAttiva ? "crosshair" : draggingId ? "grabbing" : "default",
              }}
              className="w-full select-none"
            >
              {elementi.map((el) => (
                <div
                  key={el.id}
                  data-elemento="true"
                  onMouseDown={(e) => startDrag(e, el.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!draggingId) { setSelezionato(el.id); setVariabileAttiva(null); }
                  }}
                  style={{
                    position: "absolute",
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    fontSize: `${el.fontSize * ptToPx}px`,
                    fontWeight: el.fontWeight,
                    fontStyle: el.fontStyle,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    transform: "translateY(-50%)",
                    cursor: draggingId === el.id ? "grabbing" : "grab",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    zIndex: selezionato === el.id ? 20 : 10,
                    padding: "1px 4px",
                    borderRadius: "2px",
                    background: selezionato === el.id ? "rgba(139,92,246,0.12)" : "transparent",
                    outline: selezionato === el.id ? "1.5px solid #7c3aed" : "none",
                  }}
                >
                  {el.testo}
                  {selezionato === el.id && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); rimuovi(el.id); }}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "16px",
                        height: "16px",
                        fontSize: "11px",
                        lineHeight: "1",
                        zIndex: 30,
                      }}
                      className="bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Style panel for selected element */}
          {elSel && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Stile — {elSel.testo}
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dimensione (pt)</label>
                  <input
                    type="number"
                    min={6}
                    max={72}
                    value={elSel.fontSize}
                    onChange={(e) =>
                      updateEl(elSel.id, { fontSize: Math.max(6, Math.min(72, Number(e.target.value))) })
                    }
                    className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Font</label>
                  <select
                    value={elSel.fontFamily}
                    onChange={(e) => updateEl(elSel.id, { fontFamily: e.target.value })}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Grassetto</label>
                    <button
                      onClick={() =>
                        updateEl(elSel.id, { fontWeight: elSel.fontWeight === "bold" ? "normal" : "bold" })
                      }
                      className={cn(
                        "w-9 h-9 rounded-lg text-sm font-bold border transition-colors",
                        elSel.fontWeight === "bold"
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      B
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Corsivo</label>
                    <button
                      onClick={() =>
                        updateEl(elSel.id, { fontStyle: elSel.fontStyle === "italic" ? "normal" : "italic" })
                      }
                      className={cn(
                        "w-9 h-9 rounded-lg text-sm italic border transition-colors",
                        elSel.fontStyle === "italic"
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      I
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Colore</label>
                  <input
                    type="color"
                    value={elSel.color}
                    onChange={(e) => updateEl(elSel.id, { color: e.target.value })}
                    className="h-9 w-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                </div>
                <button
                  onClick={() => rimuovi(elSel.id)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Rimuovi
                </button>
              </div>
            </div>
          )}

          {/* Save / Preview */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleAnteprima}
              disabled={elementi.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Anteprima
            </button>
            <button
              onClick={handleSalva}
              disabled={salvando || elementi.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {salvando ? "Salvataggio in corso…" : "Genera e salva template"}
            </button>
            {elementi.length === 0 && (
              <p className="text-xs text-gray-400">Posiziona almeno un elemento sul canvas per salvare</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
