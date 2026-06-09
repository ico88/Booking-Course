#!/usr/bin/env bash
# =============================================================================
#  Gestione Corsi — Disinstallatore completo
#  Uso: sudo bash uninstall.sh
#  Rimuove tutto ciò che install.sh ha creato, lasciando la directory
#  dei sorgenti intatta per una reinstallazione pulita.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step()  { echo -e "\n${BLUE}${BOLD}▶ $*${NC}"; }
ok()    { echo -e "  ${GREEN}✔ $*${NC}"; }
warn()  { echo -e "  ${YELLOW}⚠ $*${NC}"; }
info()  { echo -e "  ${CYAN}ℹ $*${NC}"; }
skip()  { echo -e "  ${YELLOW}– $*${NC}"; }

ask_yn() {
  local prompt="$1" default="${2:-n}" ans
  local opts="[s/N]"; [[ "$default" == "s" ]] && opts="[S/n]"
  read -rp "  $(echo -e "${BOLD}${prompt}${NC}") ${opts} " ans
  ans="${ans:-$default}"
  [[ "${ans,,}" =~ ^(s|si|y|yes)$ ]]
}

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}Questo script deve essere eseguito come root. Usa: sudo bash uninstall.sh${NC}"
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo "ubuntu")}"

clear
echo -e "${RED}${BOLD}"
cat <<'BANNER'
  ╔═══════════════════════════════════════════════════════╗
  ║        GESTIONE CORSI — Disinstallatore               ║
  ║   Rimuove tutti i componenti installati da install.sh ║
  ╚═══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
echo -e "  ${BOLD}Directory app :${NC} ${APP_DIR}"
echo -e "  ${BOLD}Utente app    :${NC} ${APP_USER}"
echo ""
echo -e "  ${YELLOW}${BOLD}Questo script rimuoverà:${NC}"
echo -e "  • Processo PM2 e configurazione di avvio automatico"
echo -e "  • Database PostgreSQL e utente DB (dati inclusi)"
echo -e "  • node_modules, .next, .env, ecosystem.config.js"
echo -e "  • Configurazione Nginx (se presente)"
echo -e "  • Cron job dell'applicazione"
echo -e "  • Log dell'applicazione"
echo -e "  • Swap file (se creato dall'installer)"
echo ""
echo -e "  ${CYAN}I file sorgente (src/, prisma/, ecc.) NON vengono toccati.${NC}"
echo ""

if ! ask_yn "Sei sicuro di voler procedere con la disinstallazione?" "n"; then
  echo "  Annullato."
  exit 0
fi

# Leggi .env per recuperare i nomi del DB (se esiste)
DB_NAME="gestione_corsi"
DB_USER_PG="gestione_corsi"
APP_NAME_PM2="gestione-corsi"
APP_PORT=3000

if [[ -f "$APP_DIR/.env" ]]; then
  DB_NAME=$(grep -oP '(?<=/)[\w]+(?=\?)' "$APP_DIR/.env" 2>/dev/null \
            || grep DATABASE_URL "$APP_DIR/.env" | sed -E 's|.*\/([^?]+).*|\1|' 2>/dev/null \
            || echo "gestione_corsi")
  DB_USER_PG=$(grep DATABASE_URL "$APP_DIR/.env" \
    | sed -E 's|.*://([^:]+):.*|\1|' 2>/dev/null || echo "gestione_corsi")
  APP_PORT=$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2 | tr -d '"' 2>/dev/null || echo "3000")
fi

if [[ -f "$APP_DIR/ecosystem.config.js" ]]; then
  APP_NAME_PM2=$(grep "name:" "$APP_DIR/ecosystem.config.js" \
    | head -1 | sed "s/.*name: *['\"]//;s/['\"].*//" 2>/dev/null || echo "gestione-corsi")
fi

# =============================================================================
#  1 — PM2
# =============================================================================
step "Arresto e rimozione processo PM2"

if command -v pm2 &>/dev/null; then
  # Ferma e rimuove il processo
  sudo -u "$APP_USER" pm2 stop "$APP_NAME_PM2" 2>/dev/null \
    && ok "PM2: processo '$APP_NAME_PM2' fermato" || skip "PM2: processo non trovato"
  sudo -u "$APP_USER" pm2 delete "$APP_NAME_PM2" 2>/dev/null || true
  sudo -u "$APP_USER" pm2 save --force 2>/dev/null || true

  # Rimuove lo startup systemd di PM2
  PM2_SVC="pm2-${APP_USER}"
  if systemctl is-enabled "$PM2_SVC" &>/dev/null 2>&1; then
    systemctl stop "$PM2_SVC" 2>/dev/null || true
    systemctl disable "$PM2_SVC" 2>/dev/null || true
    rm -f "/etc/systemd/system/${PM2_SVC}.service"
    systemctl daemon-reload 2>/dev/null || true
    ok "Servizio systemd PM2 '$PM2_SVC' rimosso"
  else
    skip "Servizio systemd PM2 non trovato"
  fi
else
  skip "PM2 non installato"
fi

# =============================================================================
#  2 — CRON JOB
# =============================================================================
step "Rimozione cron job"

CURRENT_CRON=$(crontab -u "$APP_USER" -l 2>/dev/null || true)
if echo "$CURRENT_CRON" | grep -q "gestione-corsi"; then
  echo "$CURRENT_CRON" | grep -v "gestione-corsi" | crontab -u "$APP_USER" - 2>/dev/null || true
  ok "Cron job gestione-corsi rimossi dal crontab di ${APP_USER}"
else
  skip "Nessun cron job gestione-corsi trovato"
fi

# =============================================================================
#  3 — NGINX
# =============================================================================
step "Rimozione configurazione Nginx"

if command -v nginx &>/dev/null; then
  NGINX_CONF="/etc/nginx/sites-available/${APP_NAME_PM2}"
  NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME_PM2}"

  if [[ -f "$NGINX_CONF" || -L "$NGINX_ENABLED" ]]; then
    rm -f "$NGINX_ENABLED" "$NGINX_CONF"
    # Ripristina il sito default di Nginx se non esiste già
    if [[ ! -f /etc/nginx/sites-enabled/default && -f /etc/nginx/sites-available/default ]]; then
      ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
      info "Sito Nginx 'default' ripristinato"
    fi
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
    ok "Configurazione Nginx '${APP_NAME_PM2}' rimossa"
  else
    skip "Nessuna configurazione Nginx trovata per '${APP_NAME_PM2}'"
  fi
else
  skip "Nginx non installato"
fi

# =============================================================================
#  4 — DATABASE POSTGRESQL
# =============================================================================
step "Rimozione database PostgreSQL"

if command -v psql &>/dev/null && systemctl is-active postgresql &>/dev/null 2>&1; then
  info "Database: '${DB_NAME}' — Utente: '${DB_USER_PG}'"

  # Termina connessioni attive prima di droppare il DB
  sudo -u postgres psql -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" \
    >/dev/null 2>&1 || true

  if sudo -u postgres psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" >/dev/null 2>&1
    ok "Database '${DB_NAME}' eliminato"
  else
    skip "Database '${DB_NAME}' non trovato"
  fi

  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER_PG}'" 2>/dev/null | grep -q 1; then
    sudo -u postgres psql -c "DROP USER IF EXISTS \"${DB_USER_PG}\";" >/dev/null 2>&1
    ok "Utente PostgreSQL '${DB_USER_PG}' eliminato"
  else
    skip "Utente PostgreSQL '${DB_USER_PG}' non trovato"
  fi
else
  skip "PostgreSQL non attivo o non installato"
fi

# =============================================================================
#  5 — FILE APPLICAZIONE
# =============================================================================
step "Pulizia file applicazione"

# node_modules
if [[ -d "$APP_DIR/node_modules" ]]; then
  info "Rimozione node_modules (può richiedere qualche secondo)..."
  rm -rf "$APP_DIR/node_modules"
  ok "node_modules rimosso"
else
  skip "node_modules non trovato"
fi

# Build Next.js
if [[ -d "$APP_DIR/.next" ]]; then
  rm -rf "$APP_DIR/.next"
  ok ".next rimosso"
else
  skip ".next non trovato"
fi

# File di configurazione generati dall'installer
for f in .env ecosystem.config.js; do
  if [[ -f "$APP_DIR/$f" ]]; then
    rm -f "$APP_DIR/$f"
    ok "$f rimosso"
  else
    skip "$f non trovato"
  fi
done

# Cache npm locale al progetto (se esiste)
rm -rf "$APP_DIR/.npm" 2>/dev/null || true

# =============================================================================
#  6 — LOG
# =============================================================================
step "Rimozione log"

for logfile in \
    "/var/log/${APP_NAME_PM2}-error.log" \
    "/var/log/${APP_NAME_PM2}-out.log" \
    "/var/log/gestione-corsi-backup.log"; do
  if [[ -f "$logfile" ]]; then
    rm -f "$logfile"
    ok "Log rimosso: $logfile"
  fi
done

# Log PM2 nella home dell'utente
PM2_LOG_DIR="$(eval echo ~$APP_USER)/.pm2/logs"
if [[ -d "$PM2_LOG_DIR" ]]; then
  rm -f "${PM2_LOG_DIR}/${APP_NAME_PM2}"*.log 2>/dev/null || true
  ok "Log PM2 rimossi"
fi

# =============================================================================
#  7 — SWAP (se creato dall'installer)
# =============================================================================
step "Swap file"

if [[ -f /swapfile ]]; then
  SWAP_SIZE_MB=$(du -m /swapfile | cut -f1)
  if ask_yn "Trovato swap file da ${SWAP_SIZE_MB} MB (/swapfile). Rimuoverlo?"; then
    swapoff /swapfile 2>/dev/null || true
    rm -f /swapfile
    sed -i '/\/swapfile/d' /etc/fstab
    ok "Swap file rimosso"
  else
    skip "Swap file mantenuto"
  fi
else
  skip "Nessun swap file /swapfile trovato"
fi

# =============================================================================
#  8 — COMPONENTI DI SISTEMA (opzionale)
# =============================================================================
step "Componenti di sistema (opzionale)"

echo ""
echo -e "  ${CYAN}I seguenti componenti sono condivisi con altri programmi.${NC}"
echo -e "  ${CYAN}Rimuovili SOLO se sei sicuro che non vengano usati da altro.${NC}"
echo ""

if command -v pm2 &>/dev/null; then
  if ask_yn "Rimuovere PM2 globale? (npm uninstall -g pm2)"; then
    npm uninstall -g pm2 -q 2>/dev/null || true
    ok "PM2 disinstallato"
  else
    skip "PM2 mantenuto"
  fi
fi

if command -v node &>/dev/null; then
  NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  if ask_yn "Rimuovere Node.js ${NODE_VER}? (disinstalla anche npm)"; then
    apt-get purge -y -q nodejs 2>/dev/null || true
    apt-get autoremove -y -q 2>/dev/null || true
    rm -rf /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true
    ok "Node.js rimosso"
  else
    skip "Node.js mantenuto"
  fi
fi

if command -v psql &>/dev/null; then
  if ask_yn "Rimuovere PostgreSQL completamente? (ATTENZIONE: elimina TUTTI i database)"; then
    systemctl stop postgresql 2>/dev/null || true
    apt-get purge -y -q postgresql postgresql-* 2>/dev/null || true
    apt-get autoremove -y -q 2>/dev/null || true
    rm -rf /etc/postgresql /var/lib/postgresql 2>/dev/null || true
    ok "PostgreSQL rimosso"
  else
    skip "PostgreSQL mantenuto"
  fi
fi

if command -v nginx &>/dev/null; then
  if ask_yn "Rimuovere Nginx completamente?"; then
    systemctl stop nginx 2>/dev/null || true
    apt-get purge -y -q nginx nginx-* 2>/dev/null || true
    apt-get autoremove -y -q 2>/dev/null || true
    ok "Nginx rimosso"
  else
    skip "Nginx mantenuto"
  fi
fi

# =============================================================================
#  RIEPILOGO
# =============================================================================
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Disinstallazione completata.${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  I file sorgente in ${BOLD}${APP_DIR}${NC} sono intatti."
echo -e "  Per reinstallare, esegui:"
echo ""
echo -e "    ${BOLD}sudo bash ${APP_DIR}/install.sh${NC}"
echo ""
