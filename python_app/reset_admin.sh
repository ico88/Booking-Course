#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# reset_admin.sh — Resetta o crea l'utente admin da shell
# Uso: sudo bash reset_admin.sh [email] [password]
# ============================================================

SERVICE_NAME="booking-corsi"
APP_USER="${APP_USER:-booking-corsi}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || error "Esegui come root: sudo bash reset_admin.sh"

# Ricava APP_DIR dal servizio systemd (fonte di verità)
_SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [[ -f "$_SERVICE_FILE" ]]; then
  APP_DIR="$(grep '^WorkingDirectory=' "$_SERVICE_FILE" | cut -d= -f2- | tr -d ' ')"
else
  APP_DIR="$(cd "$(dirname "$0")" && pwd)"
fi
VENV_DIR="$APP_DIR/.venv"

[[ -f "$APP_DIR/.env" ]]        || error ".env non trovato in $APP_DIR"
[[ -x "$VENV_DIR/bin/python" ]] || error "Virtualenv non trovato in $VENV_DIR"

ADMIN_EMAIL="${1:-admin@example.com}"
ADMIN_PASS="${2:-}"

if [[ -z "$ADMIN_PASS" ]]; then
  read -rsp "[INPUT] Nuova password per $ADMIN_EMAIL: " ADMIN_PASS
  echo
fi

[[ ${#ADMIN_PASS} -ge 8 ]] || error "La password deve essere di almeno 8 caratteri"

sudo -u "$APP_USER" "$VENV_DIR/bin/python" - <<PYEOF
import sys
sys.path.insert(0, '$APP_DIR')
from dotenv import load_dotenv
load_dotenv('$APP_DIR/.env')
from app import create_app
from app.models import db, Utente, Ruolo

app = create_app('production')
with app.app_context():
    email = '$ADMIN_EMAIL'
    password = '$ADMIN_PASS'
    u = Utente.query.filter_by(email=email).first()
    if u:
        u.set_password(password)
        db.session.commit()
        print(f"[OK]    Password aggiornata per {email}")
    else:
        u = Utente(nome='Admin', cognome='', email=email, ruolo=Ruolo.ADMIN)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        print(f"[OK]    Utente admin creato: {email}")
PYEOF
