#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# update_python.sh — Aggiorna l'app Python senza perdere dati
# ============================================================

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$APP_DIR/.venv"
SERVICE_NAME="booking-corsi"
APP_USER="${APP_USER:-www-data}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || error "Esegui come root: sudo bash update_python.sh"

# ── Pull aggiornamenti ───────────────────────────────────────
info "Pull da git..."
git -C "$APP_DIR/.." pull origin claude/python-rewrite
ok "Codice aggiornato"

# ── Aggiorna dipendenze Python ───────────────────────────────
info "Aggiornamento dipendenze Python..."
"$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt" -q
ok "Dipendenze aggiornate"

# ── Migrazione DB ────────────────────────────────────────────
info "Migrazione database..."
cd "$APP_DIR"
export $(grep -v '^#' .env | xargs)
sudo -u "$APP_USER" "$VENV_DIR/bin/flask" --app wsgi:app db migrate -m "auto" 2>/dev/null || true
sudo -u "$APP_USER" "$VENV_DIR/bin/flask" --app wsgi:app db upgrade
ok "Database aggiornato"

# ── Aggiorna permessi statici ────────────────────────────────
chown -R "$APP_USER:$APP_USER" "$APP_DIR/app/static"

# ── Riavvio servizio ─────────────────────────────────────────
info "Riavvio servizio..."
systemctl restart "$SERVICE_NAME"
sleep 2
systemctl is-active "$SERVICE_NAME" && ok "Servizio riavviato" || error "Servizio non avviato, controlla: journalctl -u $SERVICE_NAME"

# ── Ricarica Nginx ───────────────────────────────────────────
nginx -t && systemctl reload nginx
ok "Nginx ricaricato"

echo ""
echo "========================================================"
echo "  Aggiornamento completato!"
echo "========================================================"
