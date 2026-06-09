"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Database, HardDrive, RefreshCw, CheckCircle, Clock, FileArchive } from "lucide-react";

interface BackupFile {
  nome: string;
  dimensione: number;
}

interface Backup {
  cartella: string;
  data: string;
  files: BackupFile[];
  dimensioneTotale: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function BackupClient() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [cartella, setCartella] = useState("");
  const [caricando, setCaricando] = useState(false);
  const [eseguendo, setEseguendo] = useState(false);
  const [risultato, setRisultato] = useState<{
    tipo: "success" | "error";
    testo: string;
    log?: string;
  } | null>(null);
  const [logAperto, setLogAperto] = useState(false);

  const caricaBackup = useCallback(async () => {
    setCaricando(true);
    try {
      const res = await fetch("/api/admin/backup");
      const data = await res.json();
      setBackups(data.backups ?? []);
      setCartella(data.cartella ?? "");
    } finally {
      setCaricando(false);
    }
  }, []);

  useEffect(() => {
    caricaBackup();
  }, [caricaBackup]);

  async function eseguiBackup() {
    setEseguendo(true);
    setRisultato(null);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setRisultato({
          tipo: "success",
          testo: `Backup completato${data.dimensione ? ` (${data.dimensione})` : ""}.${data.percorso ? ` Salvato in: ${data.percorso}` : ""}`,
          log: data.log,
        });
        caricaBackup();
      } else {
        setRisultato({
          tipo: "error",
          testo: data.error ?? "Backup fallito.",
          log: data.dettaglio ?? data.log,
        });
      }
    } catch {
      setRisultato({ tipo: "error", testo: "Errore di rete durante il backup." });
    } finally {
      setEseguendo(false);
    }
  }

  return (
    <div className="space-y-6">
      {risultato && (
        <Alert variant={risultato.tipo}>
          <div>
            <p>{risultato.testo}</p>
            {risultato.log && (
              <button
                onClick={() => setLogAperto(!logAperto)}
                className="text-xs underline mt-1 opacity-70"
              >
                {logAperto ? "Nascondi log" : "Mostra log"}
              </button>
            )}
            {logAperto && risultato.log && (
              <pre className="mt-2 text-xs bg-black/10 rounded p-2 whitespace-pre-wrap overflow-auto max-h-40">
                {risultato.log}
              </pre>
            )}
          </div>
        </Alert>
      )}

      {/* Azione manuale */}
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <Database className="h-5 w-5 text-red-600" />
          <h2 className="font-semibold text-gray-900">Backup manuale</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Crea subito un backup completo del database e di tutti i file caricati (ricevute, attestati, loghi).
          Il backup viene compresso e salvato in{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">{cartella || "/var/backups/booking-course"}</code>.
        </p>

        <div className="flex items-center gap-4">
          <Button onClick={eseguiBackup} loading={eseguendo}>
            <Database className="h-4 w-4" />
            {eseguendo ? "Backup in corso…" : "Avvia backup ora"}
          </Button>
          <button
            onClick={caricaBackup}
            disabled={caricando}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${caricando ? "animate-spin" : ""}`} />
            Aggiorna lista
          </button>
        </div>
      </Card>

      {/* Pianificazione automatica */}
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <Clock className="h-5 w-5 text-red-600" />
          <h2 className="font-semibold text-gray-900">Backup automatico (cron)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configura il cron sul server per eseguire il backup automaticamente ogni notte.
        </p>
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400">
          <p className="text-gray-400 text-xs mb-2"># Esegui come root o con utente che ha accesso a pg_dump</p>
          <p>crontab -e</p>
          <p className="text-yellow-300 mt-2">
            # Backup ogni notte alle 02:00, log in /var/log/
          </p>
          <p>{"0 2 * * * /var/www/booking-course/backup.sh \\"}</p>
          <p className="pl-8">{">> /var/log/booking-backup.log 2>&1"}</p>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Frequenza consigliata", valore: "Ogni notte alle 02:00" },
            { label: "Conservazione default", valore: "30 giorni" },
            { label: "Personalizza", valore: "BACKUP_DIR e RETENTION_DAYS in .env" },
          ].map(({ label, valore }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-700 mt-0.5">{valore}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Lista backup esistenti */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="h-5 w-5 text-red-600" />
          <h2 className="font-semibold text-gray-900">Backup salvati</h2>
          <span className="ml-auto text-xs text-gray-400">{backups.length} trovati</span>
        </div>

        {backups.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Nessun backup trovato in{" "}
            <code className="bg-gray-100 px-1 rounded">{cartella || "/var/backups/booking-course"}</code>.
            Avvia il primo backup manuale.
          </p>
        ) : (
          <div className="space-y-3">
            {backups.map((b) => (
              <div
                key={b.cartella}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{b.data}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {b.files.map((f) => (
                      <span
                        key={f.nome}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-0.5"
                      >
                        <FileArchive className="h-3 w-3" />
                        {f.nome.includes("database") ? "DB" : "Files"}
                        <span className="text-gray-400">({formatBytes(f.dimensione)})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatBytes(b.dimensioneTotale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
