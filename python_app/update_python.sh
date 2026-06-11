#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# update_python.sh — Aggiorna l'app Python senza perdere dati
# ============================================================

SERVICE_NAME="booking-corsi"
APP_USER="${APP_USER:-booking-corsi}"
PYTHON_BIN="${PYTHON_BIN:-}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
warn()  { echo "[WARN]  $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

# Deriva APP_DIR dal servizio systemd installato (fonte di verità).
# Fallback alla directory dello script se il servizio non esiste ancora.
_SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [[ -f "$_SERVICE_FILE" ]]; then
  APP_DIR="$(grep '^WorkingDirectory=' "$_SERVICE_FILE" | cut -d= -f2- | tr -d ' ')"
  if [[ -z "$APP_DIR" || ! -d "$APP_DIR" ]]; then
    error "WorkingDirectory nel servizio systemd non trovata o inesistente: '$APP_DIR'. Controlla $_SERVICE_FILE"
  fi
  info "APP_DIR dal servizio systemd: $APP_DIR"
else
  APP_DIR="$(cd "$(dirname "$0")" && pwd)"
  info "Servizio non trovato, uso directory dello script: $APP_DIR"
fi

VENV_DIR="$APP_DIR/.venv"

version_ok() {
  "$1" - <<'PY'
import sys
major, minor = sys.version_info[:2]
raise SystemExit(0 if major == 3 and 11 <= minor <= 13 else 1)
PY
}

python_version() {
  "$1" - <<'PY'
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}")
PY
}

ensure_venv_support() {
  local version
  version="$(python_version "$1")"
  if ! "$1" -m venv --help >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y -qq "python${version}-venv" "python${version}-dev" || \
      error "Modulo venv non disponibile per Python $version. Installa python${version}-venv e rilancia."
  fi
}

ensure_service_user() {
  [[ "$APP_USER" != "root" ]] || error "APP_USER non può essere root"

  if id -u "$APP_USER" >/dev/null 2>&1; then
    info "Utente servizio già esistente: $APP_USER"
  else
    info "Creazione utente servizio: $APP_USER"
    useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
  fi
}

grant_parent_traversal() {
  local dir
  dir="$(dirname "$APP_DIR")"

  while [[ "$dir" != "/" && -n "$dir" ]]; do
    setfacl -m "u:${APP_USER}:--x" "$dir" 2>/dev/null || true
    dir="$(dirname "$dir")"
  done
}

select_python() {
  local candidate

  if [[ -n "$PYTHON_BIN" ]]; then
    command -v "$PYTHON_BIN" >/dev/null 2>&1 || error "PYTHON_BIN non trovato: $PYTHON_BIN"
    version_ok "$PYTHON_BIN" || error "Python non supportato: $("$PYTHON_BIN" --version). Usa Python 3.11, 3.12 o 3.13."
    echo "$PYTHON_BIN"
    return
  fi

  for candidate in python3.12 python3.11 python3.13 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && version_ok "$candidate"; then
      echo "$candidate"
      return
    fi
  done

  echo ""
}

[[ $EUID -eq 0 ]] || error "Esegui come root: sudo bash update_python.sh"
info "Utente servizio dedicato: $APP_USER"

# ── Dipendenze minime sistema ────────────────────────────────
apt-get update -qq
apt-get install -y -qq acl
ensure_service_user

# ── Aggiorna dipendenze Python ───────────────────────────────
info "Aggiornamento dipendenze Python..."
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  info "Virtualenv assente: creazione..."
  SELECTED_PYTHON="$(select_python)"
  [[ -n "$SELECTED_PYTHON" ]] || error "Nessun Python supportato trovato. Installa Python 3.11, 3.12 o 3.13."
  ensure_venv_support "$SELECTED_PYTHON"
  "$SELECTED_PYTHON" -m venv "$VENV_DIR"
fi

version_ok "$VENV_DIR/bin/python" || error "Virtualenv con Python non supportato: $("$VENV_DIR/bin/python" --version). Ricrea $VENV_DIR con Python 3.11, 3.12 o 3.13."
"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install --only-binary=:all: -r "$APP_DIR/requirements.txt" -q
"$VENV_DIR/bin/python" -m flask --version >/dev/null
ok "Dipendenze aggiornate"

# ── Permessi app ─────────────────────────────────────────────
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
grant_parent_traversal

# ── Verifica / ripristino .env ───────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  warn ".env mancante — rigenerazione automatica dai dati dell'installazione esistente..."

  # Recupera dominio e SSL da nginx
  NGINX_CONF="/etc/nginx/sites-available/${SERVICE_NAME}"
  RECOVERED_DOMAIN=""
  RECOVERED_SSL=false
  if [[ -f "$NGINX_CONF" ]]; then
    RECOVERED_DOMAIN="$(grep 'server_name' "$NGINX_CONF" | awk '{print $2}' | tr -d ';' | grep -v '^_$' | head -1 || true)"
    grep -q 'listen 443\|ssl_certificate' "$NGINX_CONF" 2>/dev/null && RECOVERED_SSL=true || true
  fi

  NEW_SECRET="$(openssl rand -base64 32)"
  if [[ -n "$RECOVERED_DOMAIN" && "$RECOVERED_SSL" == "true" ]]; then
    RECOVERED_URL="https://$RECOVERED_DOMAIN"
    RECOVERED_SECURE=true
  elif [[ -n "$RECOVERED_DOMAIN" ]]; then
    RECOVERED_URL="http://$RECOVERED_DOMAIN"
    RECOVERED_SECURE=false
  else
    RECOVERED_URL="http://$(hostname -I | awk '{print $1}')"
    RECOVERED_SECURE=false
  fi

  cat > "$APP_DIR/.env" <<EOF
FLASK_ENV=production
SECRET_KEY=$NEW_SECRET
DATABASE_URL=sqlite:///$APP_DIR/booking.db
APP_URL=$RECOVERED_URL
APP_NAME=Gestione Corsi
PORT=5000
SESSION_COOKIE_SECURE=$RECOVERED_SECURE
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  ok ".env ricreato (URL: $RECOVERED_URL) — le impostazioni SMTP/pagamenti vanno riconfigurate nel pannello admin"
fi

# ── Migrazione DB ────────────────────────────────────────────
info "Migrazione database..."
cd "$APP_DIR"
# Flask loads .env via python-dotenv in config.py — no need to export here
sudo -u "$APP_USER" "$VENV_DIR/bin/python" -m flask --app wsgi:app db migrate -m "auto" 2>/dev/null || true
sudo -u "$APP_USER" "$VENV_DIR/bin/python" -m flask --app wsgi:app db upgrade
ok "Database aggiornato"

# ── Riavvio servizio ─────────────────────────────────────────
if [[ ! -f "$_SERVICE_FILE" ]]; then
  error "Servizio systemd $SERVICE_NAME non installato. Esegui prima: sudo bash $APP_DIR/install_python.sh"
fi
info "Riavvio servizio..."
systemctl daemon-reload
systemctl restart "$SERVICE_NAME"
sleep 2
systemctl is-active "$SERVICE_NAME" && ok "Servizio riavviato" || error "Servizio non avviato, controlla: journalctl -u $SERVICE_NAME"

# ── Ricarica Nginx ───────────────────────────────────────────
nginx -t && systemctl reload nginx
ok "Nginx ricaricato"

echo ""
echo "========================================================"
echo "  Aggiornamento completato!"
echo ""
echo "  Per resettare la password admin da shell:"
echo "    sudo bash $APP_DIR/reset_admin.sh EMAIL NUOVA_PASSWORD"
echo "========================================================"
