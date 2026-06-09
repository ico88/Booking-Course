#!/usr/bin/env bash
# =============================================================================
#  Gestione Corsi — Script di aggiornamento guidato
#  Uso: sudo bash update.sh
# =============================================================================
set -euo pipefail

# ── Colori ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step()    { echo -e "\n${BLUE}${BOLD}▶ $*${NC}"; }
ok()      { echo -e "  ${GREEN}✔ $*${NC}"; }
warn()    { echo -e "  ${YELLOW}⚠ $*${NC}"; }
err()     { echo -e "  ${RED}✘ $*${NC}"; exit 1; }
info()    { echo -e "  ${CYAN}ℹ $*${NC}"; }
divider() { echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"; }

ask_yn() {
  local prompt="$1" default="${2:-s}" ans
  local opts="[S/n]"; [[ "$default" == "n" ]] && opts="[s/N]"
  read -rp "  $(echo -e "${BOLD}${prompt}${NC}") ${opts} " ans
  ans="${ans:-$default}"
  [[ "${ans,,}" =~ ^(s|si|y|yes)$ ]]
}

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo "ubuntu")}"

[[ $EUID -ne 0 ]] && err "Questo script deve essere eseguito come root. Usa: sudo bash update.sh"

# Leggi configurazione da .env e ecosystem.config.js
set -a; source "$APP_DIR/.env" 2>/dev/null || true; set +a
APP_PORT="${PORT:-3000}"

if [[ -f "$APP_DIR/ecosystem.config.js" ]]; then
  APP_NAME_PM2=$(grep "name:" "$APP_DIR/ecosystem.config.js" | head -1 | sed "s/.*name: *'//;s/'.*//")
else
  APP_NAME_PM2=$(echo "${APP_NAME:-gestione-corsi}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
fi

# =============================================================================
#  BANNER
# =============================================================================
clear
echo -e "${BLUE}${BOLD}"
cat <<'BANNER'
  ╔═══════════════════════════════════════════════════════╗
  ║          GESTIONE CORSI — Aggiornamento               ║
  ║     Script di update guidato per Ubuntu Server        ║
  ╚═══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
info "Directory applicazione : ${APP_DIR}"
info "Utente applicazione    : ${APP_USER}"
info "Processo PM2           : ${APP_NAME_PM2}"
info "Data                   : $(date '+%d/%m/%Y %H:%M')"
cd "$APP_DIR"
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || git log -1 --format='%h' 2>/dev/null || echo "N/A")
info "Versione corrente      : ${CURRENT_TAG}"
divider

# =============================================================================
#  STEP 1 — BACKUP PREVENTIVO
# =============================================================================
step "1 — Backup preventivo"

if [[ -f "$APP_DIR/backup.sh" ]]; then
  chmod +x "$APP_DIR/backup.sh"
  if ask_yn "Eseguire un backup del database prima di aggiornare? (consigliato)"; then
    info "Esecuzione backup in corso..."
    sudo -u "$APP_USER" bash "$APP_DIR/backup.sh" 2>&1 | tail -5
    ok "Backup completato"
  else
    warn "Backup saltato. Assicurati di avere un backup recente."
  fi
else
  warn "backup.sh non trovato — backup non disponibile."
fi

# =============================================================================
#  STEP 2 — PULL AGGIORNAMENTI
# =============================================================================
step "2 — Download aggiornamenti dal repository"

if [[ ! -d "$APP_DIR/.git" ]]; then
  warn "Nessun repository git trovato in ${APP_DIR}."
  info "Copia manualmente i file aggiornati e rilancia lo script per proseguire."
  if ! ask_yn "Vuoi saltare questo step e procedere con npm install / build?" "n"; then
    err "Aggiornamento annullato."
  fi
else
  # Controlla modifiche locali
  GIT_STATUS=$(sudo -u "$APP_USER" git status --porcelain 2>/dev/null || true)
  if [[ -n "$GIT_STATUS" ]]; then
    warn "Ci sono modifiche locali non salvate:"
    echo "$GIT_STATUS" | head -10
    if ask_yn "Salvare le modifiche locali in uno stash git e procedere?" "n"; then
      sudo -u "$APP_USER" git stash push -m "pre-update $(date +%Y%m%d_%H%M%S)"
      ok "Modifiche salvate nello stash (ripristina con: git stash pop)"
    else
      err "Aggiornamento annullato. Salva o rimuovi le modifiche locali prima di procedere."
    fi
  fi

  BRANCH=$(sudo -u "$APP_USER" git branch --show-current 2>/dev/null || echo "main")
  info "Branch: ${BRANCH}"

  sudo -u "$APP_USER" git fetch origin 2>&1 | tail -2
  COMMITS_BEHIND=$(sudo -u "$APP_USER" git rev-list "HEAD..origin/${BRANCH}" --count 2>/dev/null || echo "?")

  if [[ "$COMMITS_BEHIND" == "0" ]]; then
    ok "Il codice è già all'ultima versione (0 nuovi commit)"
    if ! ask_yn "Nessuna novità da scaricare. Vuoi comunque rieseguire npm install + build?"; then
      info "Aggiornamento saltato — nessuna modifica necessaria."
      exit 0
    fi
  else
    info "${COMMITS_BEHIND} nuovo/i commit da applicare:"
    sudo -u "$APP_USER" git log HEAD..origin/"$BRANCH" --oneline 2>/dev/null | head -10
    echo ""
    sudo -u "$APP_USER" git pull origin "$BRANCH" 2>&1 | tail -5
    ok "Codice aggiornato"
  fi
fi

# =============================================================================
#  STEP 3 — DIPENDENZE NPM
# =============================================================================
step "3 — Aggiornamento dipendenze Node.js"

info "npm install in corso..."
sudo -u "$APP_USER" npm install --no-audit --no-fund 2>&1 | tail -3
ok "Dipendenze aggiornate"

# =============================================================================
#  STEP 4 — PRISMA
# =============================================================================
step "4 — Aggiornamento schema database"

info "prisma generate..."
sudo -u "$APP_USER" npx prisma generate 2>&1 | tail -2

info "prisma db push (applica nuove colonne/tabelle senza perdere dati)..."
sudo -u "$APP_USER" npx prisma db push 2>&1 | tail -4
ok "Schema database aggiornato"

# =============================================================================
#  STEP 5 — BUILD
# =============================================================================
step "5 — Build produzione"

info "Compilazione Next.js in corso (2-5 minuti)..."
sudo -u "$APP_USER" npm run build 2>&1 | tail -10
ok "Build completata"

# =============================================================================
#  STEP 6 — RIAVVIO PM2
# =============================================================================
step "6 — Riavvio applicazione"

if sudo -u "$APP_USER" pm2 list 2>/dev/null | grep -q "$APP_NAME_PM2"; then
  sudo -u "$APP_USER" pm2 reload "$APP_NAME_PM2" --update-env
  sudo -u "$APP_USER" pm2 save
  ok "Applicazione riavviata con zero-downtime (pm2 reload)"
else
  warn "Processo PM2 '${APP_NAME_PM2}' non trovato."
  if [[ -f "$APP_DIR/ecosystem.config.js" ]]; then
    sudo -u "$APP_USER" pm2 start "$APP_DIR/ecosystem.config.js"
    sudo -u "$APP_USER" pm2 save
    ok "Applicazione avviata"
  else
    err "ecosystem.config.js non trovato. Esegui install.sh per configurare PM2."
  fi
fi

# =============================================================================
#  RIEPILOGO FINALE
# =============================================================================
divider
echo -e "\n${GREEN}${BOLD}  ✅  Aggiornamento completato con successo!${NC}\n"
divider

RE_APP_URL="${APP_URL:-http://localhost:${APP_PORT}}"
NEW_TAG=$(git describe --tags --abbrev=0 2>/dev/null || git log -1 --format='%h %s' 2>/dev/null || echo "N/A")

echo -e "  ${BOLD}Applicazione${NC}"
echo -e "    URL              : ${CYAN}${RE_APP_URL}${NC}"
echo -e "    Processo PM2     : ${APP_NAME_PM2}"
echo -e "    Versione corrente: ${NEW_TAG}"
echo ""
echo -e "  ${BOLD}Comandi utili${NC}"
echo -e "    ${CYAN}pm2 status${NC}                      — stato processi"
echo -e "    ${CYAN}pm2 logs ${APP_NAME_PM2}${NC}      — log in tempo reale"
echo -e "    ${CYAN}pm2 restart ${APP_NAME_PM2}${NC}   — riavvio manuale"
echo ""
divider
echo ""
