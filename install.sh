#!/usr/bin/env bash
# =============================================================================
#  Gestione Corsi — Installer guidato per Ubuntu Server
#  Uso: bash install.sh
# =============================================================================
set -euo pipefail

# ── Colori ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────
step()    { echo -e "\n${BLUE}${BOLD}▶ $*${NC}"; }
ok()      { echo -e "  ${GREEN}✔ $*${NC}"; }
warn()    { echo -e "  ${YELLOW}⚠ $*${NC}"; }
err()     { echo -e "  ${RED}✘ $*${NC}"; exit 1; }
info()    { echo -e "  ${CYAN}ℹ $*${NC}"; }
divider() { echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"; }

ask() {
  local prompt="$1" default="${2:-}" var
  if [[ -n "$default" ]]; then
    read -rp "  $(echo -e "${BOLD}${prompt}${NC}") [${default}]: " var
    echo "${var:-$default}"
  else
    read -rp "  $(echo -e "${BOLD}${prompt}${NC}"): " var
    echo "$var"
  fi
}

ask_secret() {
  local prompt="$1" var
  read -rsp "  $(echo -e "${BOLD}${prompt}${NC}"): " var; echo >&2
  echo "$var"
}

ask_yn() {
  local prompt="$1" default="${2:-s}" ans
  local opts="[S/n]"; [[ "$default" == "n" ]] && opts="[s/N]"
  read -rp "  $(echo -e "${BOLD}${prompt}${NC}") ${opts} " ans
  ans="${ans:-$default}"
  [[ "${ans,,}" =~ ^(s|si|y|yes)$ ]]
}

gen_secret() { openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))"; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    err "Questo script deve essere eseguito come root. Usa: sudo bash install.sh"
  fi
}

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo "ubuntu")}"
NODE_MIN=18

# =============================================================================
#  BANNER
# =============================================================================
clear
echo -e "${BLUE}${BOLD}"
cat <<'BANNER'
  ╔═══════════════════════════════════════════════════════╗
  ║          GESTIONE CORSI — Installer v1.0              ║
  ║     Installazione guidata per Ubuntu Server           ║
  ╚═══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
info "Directory applicazione : ${APP_DIR}"
info "Utente applicazione    : ${APP_USER}"
info "Data                   : $(date '+%d/%m/%Y %H:%M')"
divider

require_root

# =============================================================================
#  STEP 1 — REQUISITI DI SISTEMA
# =============================================================================
step "Verifica requisiti di sistema"

# Ubuntu check
if ! grep -qi ubuntu /etc/os-release 2>/dev/null; then
  warn "Sistema non rilevato come Ubuntu. Lo script è stato testato su Ubuntu 20.04/22.04/24.04."
  ask_yn "Vuoi procedere comunque?" "n" || err "Installazione annullata."
fi

# Aggiorna apt
info "Aggiornamento lista pacchetti apt..."
apt-get update -q

# Pacchetti di base
PKGS_BASE=(curl wget git openssl ca-certificates gnupg lsb-release)
for pkg in "${PKGS_BASE[@]}"; do
  if ! dpkg -s "$pkg" &>/dev/null; then
    info "Installazione ${pkg}..."
    apt-get install -y -q "$pkg"
  fi
done
ok "Pacchetti di base disponibili"

# =============================================================================
#  STEP 2 — NODE.JS
# =============================================================================
step "Node.js"

install_node() {
  info "Installazione Node.js 20 LTS tramite NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y -q nodejs
}

if command -v node &>/dev/null; then
  NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  if (( NODE_VER >= NODE_MIN )); then
    ok "Node.js ${NODE_VER} già installato"
  else
    warn "Node.js ${NODE_VER} trovato ma richiede almeno v${NODE_MIN}."
    ask_yn "Aggiornare a Node.js 20 LTS?" && install_node || err "Node.js insufficiente. Installazione annullata."
  fi
else
  install_node
fi
ok "Node.js $(node -v) — npm $(npm -v)"

# =============================================================================
#  STEP 3 — POSTGRESQL
# =============================================================================
step "PostgreSQL"

install_pg() {
  info "Installazione PostgreSQL..."
  apt-get install -y -q postgresql postgresql-contrib
  systemctl enable postgresql --quiet
  systemctl start postgresql
}

if command -v psql &>/dev/null; then
  ok "PostgreSQL già installato ($(psql --version | awk '{print $3}'))"
else
  install_pg
  ok "PostgreSQL installato"
fi

# =============================================================================
#  STEP 4 — PM2
# =============================================================================
step "PM2 (process manager)"

if command -v pm2 &>/dev/null; then
  ok "PM2 già installato ($(pm2 -v))"
else
  info "Installazione PM2 globale..."
  npm install -g pm2 -q
  ok "PM2 $(pm2 -v) installato"
fi

# =============================================================================
#  STEP 5 — DIPENDENZE APP
# =============================================================================
step "Installazione dipendenze Node.js"

cd "$APP_DIR"
info "Esecuzione npm install (ci vorrà un momento)..."
sudo -u "$APP_USER" npm install --no-audit --no-fund 2>&1 | tail -3
ok "Dipendenze installate"

# =============================================================================
#  STEP 6 — CONFIGURAZIONE AMBIENTE
# =============================================================================
step "Configurazione ambiente (.env)"

if [[ -f "$APP_DIR/.env" ]]; then
  warn "File .env già esistente."
  if ! ask_yn "Vuoi riconfigurarlo?"; then
    info "Configurazione saltata — verranno usati i valori esistenti."
    source "$APP_DIR/.env" 2>/dev/null || true
    APP_PORT="${PORT:-3000}"
    goto_db_setup=true
  fi
fi

if [[ "${goto_db_setup:-false}" != "true" ]]; then

  divider
  echo -e "  ${BOLD}── Database PostgreSQL ──${NC}"
  DB_HOST=$(ask "Host database" "localhost")
  DB_PORT=$(ask "Porta database" "5432")
  DB_NAME=$(ask "Nome database" "gestione_corsi")
  DB_USER=$(ask "Utente database" "gestione_corsi")
  DB_PASS=$(ask_secret "Password database (lascia vuoto per generarne una)")
  [[ -z "$DB_PASS" ]] && DB_PASS=$(gen_secret | tr -dc 'A-Za-z0-9' | head -c 24)

  divider
  echo -e "  ${BOLD}── Applicazione ──${NC}"
  APP_URL=$(ask "URL dell'applicazione (es. https://miodominio.it)" "http://localhost:3000")
  APP_NAME=$(ask "Nome applicazione" "Gestione Corsi")
  APP_PORT=$(ask "Porta su cui gira Next.js" "3000")

  divider
  echo -e "  ${BOLD}── Email SMTP ──${NC}"
  info "Inserisci i parametri SMTP per le email transazionali."
  info "Per Gmail usa smtp.gmail.com:587 con una App Password."
  SMTP_HOST=$(ask "Host SMTP" "smtp.gmail.com")
  SMTP_PORT=$(ask "Porta SMTP" "587")
  SMTP_USER=$(ask "Utente SMTP (email mittente)")
  SMTP_PASS=$(ask_secret "Password SMTP")
  SMTP_FROM=$(ask "Nome mittente" "Gestione Corsi")

  divider
  echo -e "  ${BOLD}── Sicurezza ──${NC}"
  info "Generazione automatica dei segreti crittografici..."
  NEXTAUTH_SECRET=$(gen_secret)
  CRON_SECRET=$(gen_secret)
  ok "NEXTAUTH_SECRET generato"
  ok "CRON_SECRET generato"

  # Scrivi .env
  cat > "$APP_DIR/.env" <<ENVFILE
# ── Database ──────────────────────────────────────────────
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# ── NextAuth ───────────────────────────────────────────────
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="${APP_URL}"

# ── Applicazione ───────────────────────────────────────────
APP_URL="${APP_URL}"
APP_NAME="${APP_NAME}"
PORT=${APP_PORT}
NODE_ENV="production"

# ── Email SMTP ─────────────────────────────────────────────
SMTP_HOST="${SMTP_HOST}"
SMTP_PORT="${SMTP_PORT}"
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
SMTP_FROM="${SMTP_FROM}"

# ── Cron ───────────────────────────────────────────────────
CRON_SECRET="${CRON_SECRET}"
ENVFILE

  chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  ok "File .env scritto con permessi 600"
fi

# Rileggi variabili dal .env per i passi successivi
set -a; source "$APP_DIR/.env"; set +a
APP_PORT="${PORT:-3000}"
DB_ACTUAL_URL="${DATABASE_URL:-}"

# =============================================================================
#  STEP 7 — DATABASE
# =============================================================================
step "Creazione database PostgreSQL"

# Estrai credenziali dall'URL (formato postgresql://user:pass@host:port/db)
if [[ -n "$DB_ACTUAL_URL" ]]; then
  DB_USER_X=$(echo "$DB_ACTUAL_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
  DB_PASS_X=$(echo "$DB_ACTUAL_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
  DB_HOST_X=$(echo "$DB_ACTUAL_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
  DB_NAME_X=$(echo "$DB_ACTUAL_URL" | sed -E 's|.*/([^?]+).*|\1|')
fi

DB_USER_X="${DB_USER_X:-${DB_USER:-gestione_corsi}}"
DB_PASS_X="${DB_PASS_X:-${DB_PASS:-}}"
DB_NAME_X="${DB_NAME_X:-${DB_NAME:-gestione_corsi}}"

if [[ "${DB_HOST_X:-localhost}" == "localhost" || "${DB_HOST_X:-127.0.0.1}" == "127.0.0.1" ]]; then
  # Crea utente DB se non esiste
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER_X}'" | grep -q 1; then
    ok "Utente DB '${DB_USER_X}' già esistente"
  else
    sudo -u postgres psql -c "CREATE USER \"${DB_USER_X}\" WITH PASSWORD '${DB_PASS_X}';" \
      && ok "Utente DB '${DB_USER_X}' creato"
  fi

  # Crea database se non esiste
  if sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "${DB_NAME_X}"; then
    ok "Database '${DB_NAME_X}' già esistente"
  else
    sudo -u postgres psql -c "CREATE DATABASE \"${DB_NAME_X}\" OWNER \"${DB_USER_X}\";" \
      && ok "Database '${DB_NAME_X}' creato"
  fi

  # Privilegi
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"${DB_NAME_X}\" TO \"${DB_USER_X}\";" >/dev/null
  ok "Privilegi assegnati"
else
  info "Database remoto rilevato (${DB_HOST_X}) — assicurati che esista già e sia raggiungibile."
fi

# =============================================================================
#  STEP 8 — SCHEMA DATABASE (PRISMA)
# =============================================================================
step "Applicazione schema Prisma al database"

cd "$APP_DIR"
info "Esecuzione prisma generate..."
sudo -u "$APP_USER" npx prisma generate 2>&1 | tail -2
info "Esecuzione prisma db push..."
sudo -u "$APP_USER" npx prisma db push --accept-data-loss 2>&1 | tail -4
ok "Schema applicato con successo"

if ask_yn "Vuoi popolare il database con dati di esempio (admin/segreteria/utente test)?"; then
  info "Installazione ts-node per il seed..."
  npm install -g ts-node typescript --silent 2>/dev/null || true
  sudo -u "$APP_USER" npx ts-node --compiler-options '{"module":"CommonJS"}' \
    "$APP_DIR/prisma/seed.ts" 2>&1 | tail -10
  ok "Dati di esempio inseriti"
fi

# =============================================================================
#  STEP 9 — BUILD
# =============================================================================
step "Build produzione (npm run build)"

info "Questo passaggio può richiedere 2-5 minuti..."
sudo -u "$APP_USER" npm run build 2>&1 | tail -10
ok "Build completata"

# =============================================================================
#  STEP 10 — DIRECTORY UPLOAD
# =============================================================================
step "Creazione directory per i file caricati"

for DIR in contabili attestati "attestati-template" logo; do
  mkdir -p "$APP_DIR/public/uploads/${DIR}"
  chown -R "$APP_USER":"$APP_USER" "$APP_DIR/public/uploads/${DIR}"
done
ok "Directory public/uploads/ pronta"

# =============================================================================
#  STEP 11 — PM2
# =============================================================================
step "Configurazione PM2"

APP_NAME_PM2=$(echo "${APP_NAME:-gestione-corsi}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

cat > "$APP_DIR/ecosystem.config.js" <<PM2CONF
module.exports = {
  apps: [{
    name: '${APP_NAME_PM2}',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '${APP_DIR}',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT}
    },
    error_file: '/var/log/${APP_NAME_PM2}-error.log',
    out_file:   '/var/log/${APP_NAME_PM2}-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
PM2CONF

chown "$APP_USER":"$APP_USER" "$APP_DIR/ecosystem.config.js"

# Ferma l'eventuale istanza precedente senza uscire in errore
sudo -u "$APP_USER" pm2 delete "$APP_NAME_PM2" 2>/dev/null || true

sudo -u "$APP_USER" pm2 start "$APP_DIR/ecosystem.config.js"
sudo -u "$APP_USER" pm2 save

# Configura PM2 per partire al boot
PM2_STARTUP=$(sudo -u "$APP_USER" pm2 startup systemd -u "$APP_USER" --hp "$(eval echo ~$APP_USER)" 2>&1 | grep "sudo env" || true)
if [[ -n "$PM2_STARTUP" ]]; then
  eval "$PM2_STARTUP" >/dev/null 2>&1 || true
fi

ok "PM2 avviato e configurato per il boot automatico"
info "Usa: pm2 logs ${APP_NAME_PM2}   per i log in tempo reale"

# =============================================================================
#  STEP 12 — NGINX (opzionale)
# =============================================================================
step "Nginx (reverse proxy)"

if ask_yn "Vuoi configurare Nginx come reverse proxy?"; then
  if ! command -v nginx &>/dev/null; then
    info "Installazione Nginx..."
    apt-get install -y -q nginx
  fi

  DOMAIN=$(echo "${APP_URL:-}" | sed -E 's|https?://([^/]+).*|\1|')
  DOMAIN=$(ask "Dominio del server (senza http/https)" "${DOMAIN:-example.com}")

  NGINX_CONF="/etc/nginx/sites-available/${APP_NAME_PM2}"

  cat > "$NGINX_CONF" <<NGINXCONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Upload max size (ricevute, loghi, attestati)
    client_max_body_size 20M;

    # File statici Next.js
    location /_next/static/ {
        alias ${APP_DIR}/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # File caricati dagli utenti
    location /uploads/ {
        alias ${APP_DIR}/public/uploads/;
        expires 30d;
        add_header Cache-Control "public";
        # Impedisce esecuzione di script
        add_header X-Content-Type-Options "nosniff";
    }

    # Tutte le altre richieste → Next.js
    location / {
        proxy_pass          http://127.0.0.1:${APP_PORT};
        proxy_http_version  1.1;
        proxy_set_header    Upgrade            \$http_upgrade;
        proxy_set_header    Connection         'upgrade';
        proxy_set_header    Host               \$host;
        proxy_set_header    X-Real-IP          \$remote_addr;
        proxy_set_header    X-Forwarded-For    \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto  \$scheme;
        proxy_cache_bypass  \$http_upgrade;
        proxy_read_timeout  120s;
    }
}
NGINXCONF

  ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${APP_NAME_PM2}"

  # Rimuove il default se presente e non è già stato rimosso
  [[ -f /etc/nginx/sites-enabled/default ]] && rm -f /etc/nginx/sites-enabled/default && info "Sito Nginx 'default' disabilitato"

  nginx -t && systemctl reload nginx
  ok "Nginx configurato per ${DOMAIN} → 127.0.0.1:${APP_PORT}"

  # ── SSL con Certbot ────────────────────────────────────────────────────────
  if ask_yn "Vuoi installare il certificato SSL gratuito con Let's Encrypt (certbot)?"; then
    if ! command -v certbot &>/dev/null; then
      info "Installazione certbot..."
      apt-get install -y -q certbot python3-certbot-nginx
    fi

    CERTBOT_EMAIL=$(ask "Email per le notifiche Let's Encrypt")
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
      --redirect 2>&1 | tail -5
    ok "Certificato SSL installato e rinnovo automatico attivo"
  fi
else
  ok "Nginx saltato — l'app sarà raggiungibile su http://SERVER_IP:${APP_PORT}"
fi

# =============================================================================
#  STEP 13 — CRON JOB (rilascio posti scaduti)
# =============================================================================
step "Cron job per il rilascio automatico dei posti"

CRON_SECRET_VAL="${CRON_SECRET:-$(grep CRON_SECRET "$APP_DIR/.env" | cut -d= -f2 | tr -d '"')}"
CRON_CMD="curl -s -o /dev/null -X POST -H \"x-cron-secret: ${CRON_SECRET_VAL}\" http://127.0.0.1:${APP_PORT}/api/cron/rilascia-posti"
CRON_ENTRY="0 * * * * ${CRON_CMD} # gestione-corsi"

CURRENT_CRON=$(crontab -u "$APP_USER" -l 2>/dev/null || true)

if echo "$CURRENT_CRON" | grep -q "gestione-corsi"; then
  ok "Cron job già presente nel crontab di ${APP_USER}"
else
  (echo "$CURRENT_CRON"; echo "$CRON_ENTRY") | crontab -u "$APP_USER" -
  ok "Cron job aggiunto: ogni ora → POST /api/cron/rilascia-posti"
fi

# =============================================================================
#  STEP 14 — FIREWALL (ufw)
# =============================================================================
step "Firewall (ufw)"

if command -v ufw &>/dev/null; then
  UFW_STATUS=$(ufw status | head -1)
  if echo "$UFW_STATUS" | grep -qi "active"; then
    ufw allow 'Nginx Full' >/dev/null 2>&1 || ufw allow "${APP_PORT}/tcp" >/dev/null 2>&1 || true
    ufw allow 'OpenSSH' >/dev/null 2>&1 || true
    ok "Regole firewall aggiornate"
  else
    info "ufw non è attivo — nessuna regola aggiunta"
  fi
else
  info "ufw non trovato — configura manualmente il firewall"
fi

# =============================================================================
#  RIEPILOGO FINALE
# =============================================================================
divider
echo -e "\n${GREEN}${BOLD}  ✅  Installazione completata con successo!${NC}\n"
divider

RE_APP_URL="${APP_URL:-http://localhost:${APP_PORT}}"

echo -e "  ${BOLD}Applicazione${NC}"
echo -e "    URL           : ${CYAN}${RE_APP_URL}${NC}"
echo -e "    Processo PM2  : ${APP_NAME_PM2}"
echo -e "    Porta         : ${APP_PORT}"
echo -e "    Directory     : ${APP_DIR}"
echo -e ""
echo -e "  ${BOLD}Comandi utili${NC}"
echo -e "    ${CYAN}pm2 status${NC}                   — stato processi"
echo -e "    ${CYAN}pm2 logs ${APP_NAME_PM2}${NC}   — log in tempo reale"
echo -e "    ${CYAN}pm2 restart ${APP_NAME_PM2}${NC} — riavvia l'app"
echo -e "    ${CYAN}bash ${APP_DIR}/update.sh${NC}    — aggiorna l'app"
echo -e ""

if grep -q "SMTP_USER=\"\"" "$APP_DIR/.env" 2>/dev/null || grep -qE "SMTP_USER=$" "$APP_DIR/.env" 2>/dev/null; then
  echo -e "  ${YELLOW}⚠  SMTP non configurato. Le email non verranno inviate.${NC}"
  echo -e "     Modifica ${APP_DIR}/.env e poi: pm2 restart ${APP_NAME_PM2}"
  echo ""
fi

if [[ -f "$APP_DIR/prisma/seed.ts" ]]; then
  echo -e "  ${BOLD}Credenziali di test (se hai eseguito il seed)${NC}"
  echo -e "    Admin       : admin@example.com     / AdminSystem2024!"
  echo -e "    Segreteria  : segreteria@example.com / Admin2024!"
  echo -e "    Utente      : utente@example.com     / Utente2024!"
  echo -e "    ${RED}Cambia le password di produzione dal pannello Admin!${NC}"
fi

echo ""
echo -e "  ${BOLD}CRON_SECRET${NC} (per chiamate manuali al cron):"
echo -e "    ${CYAN}${CRON_SECRET_VAL}${NC}"
echo ""
divider
echo ""
