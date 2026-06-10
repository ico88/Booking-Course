#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# update_python.sh — Aggiorna l'app Python senza perdere dati
# ============================================================

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$APP_DIR/.venv"
SERVICE_NAME="booking-corsi"
APP_USER="${APP_USER:-www-data}"
PYTHON_BIN="${PYTHON_BIN:-}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

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

# ── Pull aggiornamenti ───────────────────────────────────────
info "Pull da git..."
git -C "$APP_DIR/.." pull origin claude/python-rewrite
ok "Codice aggiornato"

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
