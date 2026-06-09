#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# install_python.sh — Installa l'app Python su VPS
# Debian/Ubuntu, Python 3.11+, PostgreSQL, Nginx, Gunicorn
# SSL Let's Encrypt via certbot
# ============================================================

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_USER="${APP_USER:-www-data}"
VENV_DIR="$APP_DIR/.venv"
SERVICE_NAME="booking-corsi"
PORT="${PORT:-5000}"
DOMAIN="${DOMAIN:-}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
warn()  { echo "[WARN]  $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || error "Esegui come root: sudo bash install_python.sh"

# ── Dominio per SSL ──────────────────────────────────────────
if [[ -z "$DOMAIN" ]]; then
  read -rp "[INPUT] Inserisci il dominio (es. corsi.example.com) oppure lascia vuoto per usare solo IP: " DOMAIN
fi
if [[ -n "$DOMAIN" ]]; then
  info "Dominio: $DOMAIN"
  USE_SSL=true
else
  warn "Nessun dominio specificato. SSL non verrà configurato (solo HTTP su porta 80)."
  USE_SSL=false
fi

# ── Python ──────────────────────────────────────────────────
info "Verifica Python 3.11+..."
if ! python3 --version 2>/dev/null | grep -qE '3\.(1[1-9]|[2-9][0-9])'; then
  apt-get update -qq
  apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip
fi
ok "Python OK: $(python3 --version)"

# ── Dipendenze sistema ──────────────────────────────────────
info "Installazione dipendenze sistema..."
apt-get update -qq
apt-get install -y -qq \
  libpq-dev gcc build-essential \
  postgresql postgresql-client \
  nginx \
  postgresql-client-common \
  curl \
  certbot \
  python3-certbot-nginx

# ── PostgreSQL ───────────────────────────────────────────────
info "Configurazione PostgreSQL..."
DB_NAME="${DB_NAME:-booking_corsi}"
DB_USER="${DB_USER:-booking_user}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)}"

systemctl start postgresql || true
systemctl enable postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

ok "PostgreSQL OK: $DB_NAME"

# ── Virtualenv e dipendenze Python ──────────────────────────
info "Creazione virtualenv..."
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt" -q
ok "Virtualenv OK"

# ── .env ─────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  info "Generazione .env..."
  SECRET_KEY=$(openssl rand -base64 32)
  if [[ "$USE_SSL" == "true" ]]; then
    APP_URL="https://$DOMAIN"
  else
    APP_URL="http://$(hostname -I | awk '{print $1}')"
  fi
  cat > "$APP_DIR/.env" <<EOF
FLASK_ENV=production
SECRET_KEY=$SECRET_KEY
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
APP_URL=$APP_URL
APP_NAME=Gestione Corsi
PORT=$PORT
EOF
  ok ".env creato"
else
  info ".env già esistente, non sovrascritto"
fi

# ── Permessi ─────────────────────────────────────────────────
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
mkdir -p "$APP_DIR/app/static/uploads"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/app/static/uploads"

# ── Migrazione DB ────────────────────────────────────────────
info "Migrazione database..."
cd "$APP_DIR"
export $(grep -v '^#' .env | xargs)

if [[ ! -d "migrations" || ! -f "migrations/env.py" ]]; then
  sudo -u "$APP_USER" "$VENV_DIR/bin/flask" --app wsgi:app db init
fi
sudo -u "$APP_USER" "$VENV_DIR/bin/flask" --app wsgi:app db migrate -m "auto" 2>/dev/null || true
sudo -u "$APP_USER" "$VENV_DIR/bin/flask" --app wsgi:app db upgrade
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
After=network.target postgresql.service

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

# ── Nginx — configurazione iniziale HTTP ─────────────────────
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

  # Obtain certificate using Nginx plugin (handles HTTP challenge automatically)
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
      --email "admin@${DOMAIN}" --redirect 2>/dev/null; then
    ok "Certificato SSL installato per $DOMAIN"

    # certbot --nginx rewrites the Nginx config automatically.
    # Reload Nginx to apply the final SSL config.
    nginx -t && systemctl reload nginx
    ok "Nginx ricaricato con SSL"

    # ── Auto-rinnovo ────────────────────────────────────────
    # certbot installs a systemd timer or cron job automatically.
    # Add an explicit cron fallback in case the timer is missing.
    if ! systemctl is-enabled certbot.timer &>/dev/null; then
      info "Aggiunta cron per rinnovo automatico certificato..."
      (crontab -l 2>/dev/null | grep -v "certbot renew"; \
        echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
      ok "Cron rinnovo SSL configurato"
    fi
  else
    warn "Certbot non è riuscito a ottenere il certificato."
    warn "Possibili cause:"
    warn "  - Il dominio $DOMAIN non punta ancora a questo server IP"
    warn "  - La porta 80 è bloccata dal firewall"
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
echo "  Admin: admin@example.com / Admin1234!"
echo "  CAMBIA LA PASSWORD ADMIN SUBITO!"
echo "========================================================"
