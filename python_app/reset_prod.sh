#!/bin/bash
# reset_prod.sh — Svuota il DB per messa in produzione
# Eseguire come: sudo bash reset_prod.sh

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$APP_DIR/.venv"
PYTHON="$VENV/bin/python"

if [ ! -f "$PYTHON" ]; then
  echo "ERRORE: virtualenv non trovato in $VENV"
  exit 1
fi

echo "============================================================"
echo "  RESET DATABASE PER PRODUZIONE"
echo "============================================================"
echo ""
echo "Verranno eliminati:"
echo "  - Tutti i corsi"
echo "  - Tutte le prenotazioni e partecipanti"
echo "  - Tutti i lead marketing esterni"
echo "  - Consenso marketing di tutti gli utenti"
echo "  - Tutti gli utenti TRANNE federico.durso@cricatania.it"
echo ""
read -p "Sei sicuro? Digita 'CONFERMA' per procedere: " risposta
if [ "$risposta" != "CONFERMA" ]; then
  echo "Operazione annullata."
  exit 0
fi

"$PYTHON" - <<'PYEOF'
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Partecipante, Prenotazione, Corso, LeadMarketing, Utente

app = create_app()
ADMIN_EMAIL = "federico.durso@cricatania.it"

with app.app_context():
    n = Partecipante.query.delete()
    print(f"  Eliminati {n} partecipanti")

    n = Prenotazione.query.delete()
    print(f"  Eliminate {n} prenotazioni")

    n = Corso.query.delete()
    print(f"  Eliminati {n} corsi")

    n = LeadMarketing.query.delete()
    print(f"  Eliminati {n} lead marketing")

    utenti_con_consenso = Utente.query.filter_by(consenso_marketing=True).all()
    for u in utenti_con_consenso:
        u.consenso_marketing = False
        u.tags_marketing = []
        u.data_consenso = None
    print(f"  Rimosso consenso marketing da {len(utenti_con_consenso)} utenti")

    admin = Utente.query.filter_by(email=ADMIN_EMAIL).first()
    if not admin:
        print(f"  ATTENZIONE: utente {ADMIN_EMAIL} non trovato! Operazione annullata.")
        db.session.rollback()
        sys.exit(1)

    n = Utente.query.filter(Utente.email != ADMIN_EMAIL).delete()
    print(f"  Eliminati {n} utenti (mantenuto {ADMIN_EMAIL})")

    db.session.commit()
    print("")
    print("Reset completato con successo.")
PYEOF
