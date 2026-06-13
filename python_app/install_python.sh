#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# install_python.sh — Installa l'app Python su VPS
# Debian/Ubuntu, Python 3.11-3.13, SQLite, Nginx, Gunicorn
# SSL Let's Encrypt via certbot
#
# Percorso consigliato:
#   git clone https://github.com/ico88/Booking-Course /opt/booking-corsi
#   cd /opt/booking-corsi/python_app
#   sudo bash install_python.sh
# ============================================================

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_USER="${APP_USER:-booking-corsi}"
VENV_DIR="$APP_DIR/.venv"
SERVICE_NAME="booking-corsi"
PORT="${PORT:-5000}"
DOMAIN="${DOMAIN:-}"
PYTHON_BIN="${PYTHON_BIN:-}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
warn()  { echo "[WARN]  $*"; }
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
    useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
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

[[ $EUID -eq 0 ]] || error "Esegui come root: sudo bash install_python.sh"

# ── Verifica percorso consigliato ────────────────────────────
if [[ "$APP_DIR" != /opt/* ]]; then
  warn "ATTENZIONE: stai installando in '$APP_DIR'."
  warn "Il percorso consigliato è /opt/booking-corsi/python_app."
  warn "Installare sotto /home può causare problemi di permessi con nginx."
  echo ""
  read -rp "[INPUT] Vuoi continuare comunque in '$APP_DIR'? [s/N]: " CONFIRM_PATH
  [[ "${CONFIRM_PATH,,}" == "s" ]] || error "Installazione annullata. Clona il repo in /opt/booking-corsi e rilancia."
fi

info "Installazione in: $APP_DIR"

# ── Dominio per SSL ──────────────────────────────────────────
if [[ -z "$DOMAIN" ]]; then
  read -rp "[INPUT] Inserisci il dominio (es. corsi.example.com) oppure lascia vuoto per usare solo IP: " DOMAIN
fi
if [[ -n "$DOMAIN" ]]; then
  info "Dominio: $DOMAIN"
  USE_SSL=true
  if [[ -z "${SSL_EMAIL:-}" ]]; then
    read -rp "[INPUT] Email per Let's Encrypt (notifiche scadenza certificato): " SSL_EMAIL
    [[ -n "$SSL_EMAIL" ]] || SSL_EMAIL="admin@${DOMAIN}"
  fi
  info "Email SSL: $SSL_EMAIL"
else
  warn "Nessun dominio specificato. SSL non verrà configurato (solo HTTP su porta 80)."
  USE_SSL=false
  SSL_EMAIL=""
fi

# ── Dipendenze sistema ──────────────────────────────────────
info "Installazione dipendenze sistema..."
apt-get update -qq
apt-get install -y -qq \
  gcc build-essential nginx curl cron certbot python3-certbot-nginx \
  python3-pip python3-venv python3-dev \
  libjpeg-dev zlib1g-dev libpng-dev libwebp-dev libfreetype6-dev liblcms2-dev
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now cron >/dev/null 2>&1 || true
fi

# ── Utente servizio ─────────────────────────────────────────
ensure_service_user

# ── Python ──────────────────────────────────────────────────
info "Verifica Python supportato (3.11, 3.12 o 3.13)..."
SELECTED_PYTHON="$(select_python)"
if [[ -z "$SELECTED_PYTHON" ]]; then
  apt-get install -y -qq python3.12 python3.12-venv python3.12-dev || \
    apt-get install -y -qq python3.11 python3.11-venv python3.11-dev || \
    error "Installa Python 3.11, 3.12 o 3.13 e rilancia lo script."
  SELECTED_PYTHON="$(select_python)"
fi
[[ -n "$SELECTED_PYTHON" ]] || error "Nessun Python supportato trovato. Usa PYTHON_BIN=/percorso/python3.12 sudo -E bash install_python.sh"
ok "Python OK: $("$SELECTED_PYTHON" --version)"
ensure_venv_support "$SELECTED_PYTHON"

# ── Virtualenv e dipendenze Python ──────────────────────────
info "Creazione virtualenv..."
if [[ -x "$VENV_DIR/bin/python" ]]; then
  VENV_VERSION="$(python_version "$VENV_DIR/bin/python")"
  SELECTED_VERSION="$(python_version "$SELECTED_PYTHON")"
  if [[ "$VENV_VERSION" != "$SELECTED_VERSION" ]]; then
    warn "Virtualenv esistente con Python $VENV_VERSION: verrà ricreata con Python $SELECTED_VERSION."
    rm -rf "$VENV_DIR"
  fi
fi
"$SELECTED_PYTHON" -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install --only-binary=:all: -r "$APP_DIR/requirements.txt" -q
"$VENV_DIR/bin/python" -m flask --version >/dev/null
ok "Virtualenv OK"

# ── .env ─────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  info "Generazione .env..."
  SECRET_KEY=$(openssl rand -base64 32)
  if [[ "$USE_SSL" == "true" ]]; then
    APP_URL="https://$DOMAIN"
    SESSION_COOKIE_SECURE_VALUE=true
  else
    APP_URL="http://$(hostname -I | awk '{print $1}')"
    SESSION_COOKIE_SECURE_VALUE=false
  fi
  cat > "$APP_DIR/.env" <<EOF
FLASK_ENV=production
SECRET_KEY=$SECRET_KEY
DATABASE_URL=sqlite:///$APP_DIR/booking.db
APP_URL=$APP_URL
APP_NAME=Gestione Corsi
PORT=$PORT
SESSION_COOKIE_SECURE=$SESSION_COOKIE_SECURE_VALUE
EOF
  ok ".env creato"
else
  info ".env già esistente, non sovrascritto"
  if ! grep -q '^SESSION_COOKIE_SECURE=' "$APP_DIR/.env"; then
    if [[ "$USE_SSL" == "true" ]]; then
      echo "SESSION_COOKIE_SECURE=true" >> "$APP_DIR/.env"
    else
      echo "SESSION_COOKIE_SECURE=false" >> "$APP_DIR/.env"
    fi
    ok "SESSION_COOKIE_SECURE aggiunto a .env"
  fi
fi

# ── Permessi ─────────────────────────────────────────────────
# /opt è world-traversable (755) per default: nessun ACL hack necessario
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR"
chmod 600 "$APP_DIR/.env"
mkdir -p "$APP_DIR/app/static/uploads"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/app/static/uploads"
# uploads deve essere leggibile da nginx
chmod 755 "$APP_DIR/app/static/uploads"

# ── Migrazione DB ────────────────────────────────────────────
info "Migrazione database..."
cd "$APP_DIR"
# Flask loads .env via python-dotenv in config.py — no need to export here

if [[ ! -d "migrations" || ! -f "migrations/env.py" ]]; then
  sudo -u "$APP_USER" "$VENV_DIR/bin/python" -m flask --app wsgi:app db init
fi
sudo -u "$APP_USER" "$VENV_DIR/bin/python" -m flask --app wsgi:app db migrate -m "auto" 2>/dev/null || true
sudo -u "$APP_USER" "$VENV_DIR/bin/python" -m flask --app wsgi:app db upgrade
ok "Database aggiornato"

# ── Admin iniziale ────────────────────────────────────────────
info "Creazione admin iniziale (se non esiste)..."
sudo -u "$APP_USER" "$VENV_DIR/bin/python" -c "
import os, sys
sys.path.insert(0, '$APP_DIR')
from dotenv import load_dotenv
load_dotenv('$APP_DIR/.env')
from app import create_app
from app.models import db, Utente, Ruolo
app = create_app('production')
with app.app_context():
    if not Utente.query.filter_by(ruolo=Ruolo.ADMIN).first():
        u = Utente(nome='Admin', cognome='', email='admin@example.com', ruolo=Ruolo.ADMIN)
        u.set_password('Admin1234!')
        db.session.add(u)
        db.session.commit()
        print('Admin creato: admin@example.com / Admin1234!')
    else:
        print('Admin già esistente')
"

# ── Systemd service ───────────────────────────────────────────
info "Configurazione servizio systemd..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Booking Corsi (Python/Flask)
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$VENV_DIR/bin/gunicorn --config $APP_DIR/gunicorn.conf.py wsgi:app
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
ok "Servizio $SERVICE_NAME avviato"

# ── Nginx ─────────────────────────────────────────────────────
info "Configurazione Nginx..."
NGINX_CONF="/etc/nginx/sites-available/$SERVICE_NAME"
SERVER_NAME="${DOMAIN:-_}"

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    client_max_body_size 25M;

    location /static/ {
        alias $APP_DIR/app/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx configurato (HTTP)"

# ── Let's Encrypt SSL ─────────────────────────────────────────
if [[ "$USE_SSL" == "true" ]]; then
  info "Richiesta certificato Let's Encrypt per $DOMAIN..."
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
      --email "$SSL_EMAIL" --redirect 2>/dev/null; then
    ok "Certificato SSL installato per $DOMAIN"
    nginx -t && systemctl reload nginx
    ok "Nginx ricaricato con SSL"
    if ! systemctl is-enabled certbot.timer &>/dev/null; then
      info "Aggiunta cron per rinnovo automatico certificato..."
      (crontab -l 2>/dev/null | grep -v "certbot renew"; \
        echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
      ok "Cron rinnovo SSL configurato"
    fi
  else
    warn "Certbot non è riuscito a ottenere il certificato."
    warn "Possibili cause: il dominio $DOMAIN non punta a questo IP, o la porta 80 è bloccata."
    warn "Puoi ritentare manualmente: certbot --nginx -d $DOMAIN"
    warn "L'app è raggiungibile su HTTP: http://$DOMAIN"
  fi
else
  ok "SSL non configurato. Accesso HTTP: http://$(hostname -I | awk '{print $1}')"
fi

# ── Cron per posti scaduti ────────────────────────────────────
info "Configurazione cron posti scaduti..."
SECRET_KEY_VAL=$(grep '^SECRET_KEY=' "$APP_DIR/.env" | cut -d= -f2-)
CRON_JOB="*/15 * * * * curl -s -X POST -H 'X-Cron-Secret: ${SECRET_KEY_VAL}' http://127.0.0.1:$PORT/api/cron/rilascia-posti"
(crontab -l 2>/dev/null | grep -v "rilascia-posti"; echo "$CRON_JOB") | crontab -
ok "Cron configurato"

echo ""
echo "========================================================"
echo "  Installazione completata!"
if [[ "$USE_SSL" == "true" ]]; then
  echo "  App: https://$DOMAIN"
else
  echo "  App: http://$(hostname -I | awk '{print $1}')"
fi
echo "  Directory: $APP_DIR"
echo "  Database:  $APP_DIR/booking.db"
echo "  Admin:     admin@example.com / Admin1234!"
echo "  CAMBIA LA PASSWORD ADMIN SUBITO!"
echo ""
echo "  Per aggiornare in futuro:"
echo "    cd $APP_DIR && sudo git pull && sudo bash update_python.sh"
echo "========================================================"
