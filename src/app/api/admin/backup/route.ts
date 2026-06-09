import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.ruolo !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const scriptPath = path.join(process.cwd(), "backup.sh");

  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json({ error: "Script di backup non trovato" }, { status: 500 });
  }

  try {
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
      timeout: 120_000, // 2 minuti
      env: { ...process.env },
    });

    // Estrai la riga con il percorso del backup
    const percorsoMatch = stdout.match(/Percorso:\s*(.+)/);
    const dimensioneMatch = stdout.match(/Dimensione totale:\s*(.+)/);

    return NextResponse.json({
      success: true,
      percorso: percorsoMatch?.[1]?.trim(),
      dimensione: dimensioneMatch?.[1]?.trim(),
      log: stdout,
      ...(stderr ? { avvertenze: stderr } : {}),
    });
  } catch (err) {
    const error = err as { message?: string; stderr?: string; stdout?: string };
    console.error("Backup error:", error);
    return NextResponse.json(
      {
        error: "Backup fallito",
        dettaglio: error.stderr || error.message,
        log: error.stdout,
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.ruolo !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const backupDir = process.env.BACKUP_DIR || "/var/backups/booking-course";

  try {
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ backups: [] });
    }

    const voci = fs.readdirSync(backupDir, { withFileTypes: true });
    const backups = voci
      .filter((v) => v.isDirectory())
      .map((v) => {
        const dirPath = path.join(backupDir, v.name);
        const files = fs.readdirSync(dirPath).map((f) => {
          const stat = fs.statSync(path.join(dirPath, f));
          return { nome: f, dimensione: stat.size };
        });
        const dataStr = v.name.substring(0, 15).replace(
          /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
          "$1-$2-$3 $4:$5:$6"
        );
        return {
          cartella: v.name,
          data: dataStr,
          files,
          dimensioneTotale: files.reduce((s, f) => s + f.dimensione, 0),
        };
      })
      .sort((a, b) => b.cartella.localeCompare(a.cartella));

    return NextResponse.json({ backups, cartella: backupDir });
  } catch {
    return NextResponse.json({ backups: [], cartella: backupDir });
  }
}
