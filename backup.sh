#!/usr/bin/env bash
# ============================================================
# Backup automatico — database PostgreSQL + uploads
# Eseguire come: ./backup.sh
# Cron suggerito (ogni notte alle 02:00):
#   0 2 * * * /path/to/backup.sh >> /var/log/booking-backup.log 2>&1
# ============================================================
set -euo pipefail

# --- Configurazione ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# Carica variabili d'ambiente
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

# Directory di destinazione backup
BACKUP_DIR="${BACKUP_DIR:-/var/backups/booking-course}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"  # Giorni di conservazione backup

# Timestamp per il nome file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_LABEL=$(date +"%Y-%m-%d %H:%M:%S")

# Cartella del backup odierno
BACKUP_TODAY="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "$BACKUP_TODAY"

echo "======================================================"
echo " Backup avviato: ${DATE_LABEL}"
echo "======================================================"

# ── 1. Backup database PostgreSQL ──────────────────────────
echo "[1/3] Backup database..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "  ERRORE: DATABASE_URL non impostata nel file .env"
  exit 1
fi

# Estrai credenziali dalla DATABASE_URL
# Formato: postgresql://user:pass@host:port/dbname
DB_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)"
if [[ "$DATABASE_URL" =~ $DB_REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "  ERRORE: DATABASE_URL non in formato standard postgresql://user:pass@host:port/dbname"
  exit 1
fi

DB_DUMP="${BACKUP_TODAY}/database_${TIMESTAMP}.sql.gz"

PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=plain \
  --encoding=UTF8 \
  | gzip > "$DB_DUMP"

DB_SIZE=$(du -sh "$DB_DUMP" | cut -f1)
echo "  ✓ Database salvato: database_${TIMESTAMP}.sql.gz (${DB_SIZE})"

# ── 2. Backup uploads (file caricati dagli utenti) ─────────
echo "[2/3] Backup uploads..."

UPLOADS_DIR="${SCRIPT_DIR}/public/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  UPLOADS_DUMP="${BACKUP_TODAY}/uploads_${TIMESTAMP}.tar.gz"
  tar -czf "$UPLOADS_DUMP" -C "${SCRIPT_DIR}/public" uploads/
  UPLOADS_SIZE=$(du -sh "$UPLOADS_DUMP" | cut -f1)
  echo "  ✓ Uploads salvati: uploads_${TIMESTAMP}.tar.gz (${UPLOADS_SIZE})"
else
  echo "  ℹ Directory uploads non trovata — saltato"
fi

# ── 3. Rotazione backup (elimina backup più vecchi) ─────────
echo "[3/3] Rotazione backup (>${RETENTION_DAYS} giorni)..."

ELIMINATI=$(find "$BACKUP_DIR" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" | wc -l)
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ Eliminati ${ELIMINATI} backup scaduti"

# ── Riepilogo ───────────────────────────────────────────────
TOTALE=$(du -sh "$BACKUP_TODAY" | cut -f1)
echo ""
echo "======================================================"
echo " Backup completato: ${DATE_LABEL}"
echo " Percorso: ${BACKUP_TODAY}"
echo " Dimensione totale: ${TOTALE}"
echo " Conservazione: ${RETENTION_DAYS} giorni"
echo "======================================================"
