#!/usr/bin/env bash
# =============================================================================
#  Gestione Corsi — Script di aggiornamento
#  Uso: sudo bash update.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step()  { echo -e "\n${BLUE}${BOLD}▶ $*${NC}"; }
ok()    { echo -e "  ${GREEN}✔ $*${NC}"; }
warn()  { echo -e "  ${YELLOW}⚠ $*${NC}"; }
err()   { echo -e "  ${RED}✘ $*${NC}"; exit 1; }
info()  { echo -e "  ${CYAN}ℹ $*${NC}"; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo "ubuntu")}"

[[ $EUID -ne 0 ]] && err "Esegui con: sudo bash update.sh"

# Leggi nome PM2 dall'ecosystem.config.js
if [[ -f "$APP_DIR/ecosystem.config.js" ]]; then
  APP_NAME_PM2=$(grep "name:" "$APP_DIR/ecosystem.config.js" | head -1 | sed "s/.*name: *'//;s/'.*//" )
else
  APP_NAME_PM2="gestione-corsi"
fi

clear
echo -e "${BLUE}${BOLD}"
cat <<'BANNER'
  ╔══════════════════════════════════════════════════════╗
  ║        GESTIONE CORSI — Aggiornamento app            ║
  ╚══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
info "Directory : ${APP_DIR}"
info "Processo  : ${APP_NAME_PM2}"
info "Data      : $(date '+%d/%m/%Y %H:%M')"
echo ""

# =============================================================================
step "1/5 — Pull aggiornamenti da git"
cd "$APP_DIR"

if [[ -d .git ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  info "Branch corrente: ${BRANCH}"
  sudo -u "$APP_USER" git pull origin "$BRANCH" 2>&1 | tail -5
  ok "Repository aggiornato"
else
  warn "Nessun repository git trovato — copia manualmente i file aggiornati."
fi

# =============================================================================
step "2/5 — Installazione dipendenze"
sudo -u "$APP_USER" npm install --no-audit --no-fund 2>&1 | tail -3
ok "Dipendenze aggiornate"

# =============================================================================
step "3/5 — Aggiornamento schema database (prisma db push)"
sudo -u "$APP_USER" npx prisma generate 2>&1 | tail -2
sudo -u "$APP_USER" npx prisma db push 2>&1 | tail -4
ok "Schema database aggiornato"

# =============================================================================
step "4/5 — Build produzione"
info "Build in corso (può richiedere qualche minuto)..."
sudo -u "$APP_USER" npm run build 2>&1 | tail -10
ok "Build completata"

# =============================================================================
step "5/5 — Riavvio applicazione"
sudo -u "$APP_USER" pm2 reload "$APP_NAME_PM2" --update-env
sudo -u "$APP_USER" pm2 save
ok "Applicazione riavviata con zero-downtime (pm2 reload)"

# =============================================================================
echo ""
echo -e "${GREEN}${BOLD}  ✅  Aggiornamento completato!${NC}"
echo ""
info "Log in tempo reale: ${CYAN}pm2 logs ${APP_NAME_PM2}${NC}"
info "Stato processi    : ${CYAN}pm2 status${NC}"
echo ""
