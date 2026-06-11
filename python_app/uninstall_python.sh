#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# uninstall_python.sh — Rimuove completamente l'installazione
# Booking Corsi (servizio, nginx, cron, file app)
# ============================================================

SERVICE_NAME="booking-corsi"
APP_USER="${APP_USER:-booking-corsi}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
warn()  { echo "[WARN]  $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || error "Esegui come root: sudo bash uninstall_python.sh"

# Ricava APP_DIR dal servizio systemd (fonte di verità)
_SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [[ -f "$_SERVICE_FILE" ]]; then
  APP_DIR="$(grep '^WorkingDirectory=' "$_SERVICE_FILE" | cut -d= -f2- | tr -d ' ')"
  info "Installazione trovata in: $APP_DIR"
else
  APP_DIR="$(cd "$(dirname "$0")" && pwd)"
  warn "Servizio systemd non trovato. Uso directory dello script: $APP_DIR"
fi

echo ""
echo "========================================================"
echo "  DISINSTALLAZIONE BOOKING CORSI"
echo "  Verranno rimossi:"
echo "    - Servizio systemd: $SERVICE_NAME"
echo "    - Configurazione nginx: /etc/nginx/sites-*/booking-corsi"
echo "    - Cron jobs dell'app"
echo "    - Directory app: $APP_DIR"
echo ""
warn "Il database SQLite in $APP_DIR sarà eliminato."
warn "Fai un backup prima se vuoi conservare i dati!"
echo "========================================================"
echo ""

# ── Backup opzionale del database ────────────────────────────
DB_FILE="$APP_DIR/booking.db"
if [[ -f "$DB_FILE" ]]; then
  read -rp "[INPUT] Vuoi fare un backup del database prima di eliminare? [S/n]: " BACKUP_CHOICE
  BACKUP_CHOICE="${BACKUP_CHOICE:-S}"
  if [[ "${BACKUP_CHOICE^^}" == "S" ]]; then
    BACKUP_PATH="/root/booking_backup_$(date +%Y%m%d_%H%M%S).db"
    cp "$DB_FILE" "$BACKUP_PATH"
    ok "Backup salvato in: $BACKUP_PATH"
  fi
fi

# ── Conferma finale ───────────────────────────────────────────
read -rp "[INPUT] Confermi la disinstallazione completa? [s/N]: " CONFIRM
[[ "${CONFIRM,,}" == "s" ]] || { info "Disinstallazione annullata."; exit 0; }

# ── Stop e rimozione servizio systemd ────────────────────────
if systemctl is-active "$SERVICE_NAME" &>/dev/null; then
  info "Stop servizio $SERVICE_NAME..."
  systemctl stop "$SERVICE_NAME"
fi
if systemctl is-enabled "$SERVICE_NAME" &>/dev/null; then
  systemctl disable "$SERVICE_NAME"
fi
if [[ -f "$_SERVICE_FILE" ]]; then
  rm -f "$_SERVICE_FILE"
  systemctl daemon-reload
  ok "Servizio systemd rimosso"
fi

# ── Rimozione configurazione nginx ───────────────────────────
NGINX_ENABLED="/etc/nginx/sites-enabled/$SERVICE_NAME"
NGINX_AVAILABLE="/etc/nginx/sites-available/$SERVICE_NAME"
[[ -L "$NGINX_ENABLED" ]]   && rm -f "$NGINX_ENABLED"   && info "Rimosso symlink nginx"
[[ -f "$NGINX_AVAILABLE" ]] && rm -f "$NGINX_AVAILABLE" && info "Rimossa config nginx"
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  ok "Nginx ricaricato"
fi

# ── Rimozione cron jobs ───────────────────────────────────────
if crontab -l 2>/dev/null | grep -q "rilascia-posti"; then
  (crontab -l 2>/dev/null | grep -v "rilascia-posti") | crontab -
  ok "Cron job rimosso"
fi
if crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null | grep -v "certbot renew") | crontab -
  ok "Cron rinnovo SSL rimosso"
fi

# ── Rimozione directory app ───────────────────────────────────
if [[ -d "$APP_DIR" ]]; then
  rm -rf "$APP_DIR"
  ok "Directory $APP_DIR rimossa"
fi

# ── Rimozione utente servizio (opzionale) ────────────────────
if id -u "$APP_USER" &>/dev/null; then
  read -rp "[INPUT] Rimuovere l'utente di sistema '$APP_USER'? [s/N]: " REMOVE_USER
  if [[ "${REMOVE_USER,,}" == "s" ]]; then
    userdel "$APP_USER" 2>/dev/null || true
    ok "Utente $APP_USER rimosso"
  fi
fi

echo ""
echo "========================================================"
echo "  Disinstallazione completata."
if [[ -f "${BACKUP_PATH:-}" ]]; then
  echo "  Backup database: $BACKUP_PATH"
fi
echo ""
echo "  Per reinstallare:"
echo "    git clone https://github.com/ico88/Booking-Course /opt/booking-corsi"
echo "    cd /opt/booking-corsi/python_app"
echo "    sudo bash install_python.sh"
echo "========================================================"
