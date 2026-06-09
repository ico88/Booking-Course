"use client";

import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (file: File) => void;
  accept?: string; // e.g. "image/jpeg,image/png"
  maxMB?: number;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  children?: React.ReactNode; // if provided, used as trigger instead of default UI
  className?: string;
}

export default function DropZone({
  onFile,
  accept,
  maxMB,
  label = "Trascina un file qui o clicca per selezionare",
  sublabel,
  disabled = false,
  children,
  className,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validaEInvia = useCallback(
    (file: File) => {
      setErrore(null);
      if (accept) {
        const tipi = accept.split(",").map((t) => t.trim());
        if (!tipi.includes(file.type)) {
          setErrore(`Formato non supportato. Accettati: ${tipi.join(", ")}`);
          return;
        }
      }
      if (maxMB && file.size > maxMB * 1024 * 1024) {
        setErrore(`File troppo grande (max ${maxMB} MB)`);
        return;
      }
      onFile(file);
    },
    [accept, maxMB, onFile]
  );

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validaEInvia(file);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validaEInvia(file);
    e.target.value = "";
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-colors cursor-pointer",
          dragging
            ? "border-red-500 bg-red-50 scale-[1.01]"
            : "border-gray-300 hover:border-red-400 hover:bg-red-50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {children ?? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <Upload className={cn("h-7 w-7 transition-colors", dragging ? "text-red-500" : "text-gray-400")} />
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
            {dragging && (
              <p className="text-sm font-semibold text-red-600">Rilascia per caricare</p>
            )}
          </div>
        )}
        {/* Overlay when dragging over children */}
        {children && dragging && (
          <div className="absolute inset-0 rounded-xl bg-red-500/10 border-2 border-red-500 flex items-center justify-center pointer-events-none">
            <p className="text-sm font-semibold text-red-600 bg-white/90 px-3 py-1.5 rounded-lg">
              Rilascia per caricare
            </p>
          </div>
        )}
      </div>
      {errore && <p className="text-xs text-red-600">{errore}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
