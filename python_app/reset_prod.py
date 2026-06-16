#!/usr/bin/env python3
"""
reset_prod.py — Svuota il DB per messa in produzione.

Elimina:
  - Partecipanti (dipendenza prenotazioni)
  - Prenotazioni (dipendenza corsi e utenti)
  - Corsi
  - Lead marketing esterni
  - Consenso marketing sugli utenti registrati
  - Tutti gli utenti TRANNE l'admin federico.durso@cricatania.it

Mantiene:
  - L'utente admin federico.durso@cricatania.it
  - Tutte le impostazioni (logo, colori, SMTP, ecc.)
  - Pagine legali

Eseguire dalla root dell'app:
  cd /opt/booking-corsi/python_app
  python reset_prod.py
"""

import sys
import os

# Conferma esplicita prima di procedere
print("=" * 60)
print("  RESET DATABASE PER PRODUZIONE")
print("=" * 60)
print()
print("Verranno eliminati:")
print("  - Tutti i corsi")
print("  - Tutte le prenotazioni e partecipanti")
print("  - Tutti i lead marketing esterni")
print("  - Consenso marketing di tutti gli utenti")
print("  - Tutti gli utenti TRANNE federico.durso@cricatania.it")
print()
risposta = input("Sei sicuro? Digita 'CONFERMA' per procedere: ").strip()
if risposta != "CONFERMA":
    print("Operazione annullata.")
    sys.exit(0)

# Setup Flask app context
sys.path.insert(0, os.path.dirname(__file__))
from app import create_app, db
from app.models import Partecipante, Prenotazione, Corso, LeadMarketing, Utente

app = create_app()

ADMIN_EMAIL = "federico.durso@cricatania.it"

with app.app_context():
    # 1. Partecipanti (FK → prenotazioni)
    n = Partecipante.query.delete()
    print(f"  Eliminati {n} partecipanti")

    # 2. Prenotazioni (FK → corsi e utenti)
    n = Prenotazione.query.delete()
    print(f"  Eliminate {n} prenotazioni")

    # 3. Corsi
    n = Corso.query.delete()
    print(f"  Eliminati {n} corsi")

    # 4. Lead marketing esterni
    n = LeadMarketing.query.delete()
    print(f"  Eliminati {n} lead marketing")

    # 5. Consenso marketing utenti registrati
    utenti_con_consenso = Utente.query.filter_by(consenso_marketing=True).all()
    for u in utenti_con_consenso:
        u.consenso_marketing = False
        u.tags_marketing = []
        u.data_consenso = None
    print(f"  Rimosso consenso marketing da {len(utenti_con_consenso)} utenti")

    # 6. Utenti (tutti tranne l'admin)
    admin = Utente.query.filter_by(email=ADMIN_EMAIL).first()
    if not admin:
        print(f"  ATTENZIONE: utente {ADMIN_EMAIL} non trovato! Nessun utente eliminato.")
        db.session.rollback()
        sys.exit(1)

    n = Utente.query.filter(Utente.email != ADMIN_EMAIL).delete()
    print(f"  Eliminati {n} utenti (mantenuto {ADMIN_EMAIL})")

    db.session.commit()
    print()
    print("✓ Reset completato con successo.")
