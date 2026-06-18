#!/bin/bash
# Esegui la suite di test
# Uso: ./run_tests.sh [opzioni pytest]
#   ./run_tests.sh             → tutti i test
#   ./run_tests.sh -v          → verbose
#   ./run_tests.sh --cov=app   → con coverage
#   ./run_tests.sh tests/test_models.py  → solo i modelli

set -e
cd "$(dirname "$0")"

export SECRET_KEY="${SECRET_KEY:-test-secret-key-locale}"

rm -f /tmp/test_booking.db

python -m pytest "$@"
