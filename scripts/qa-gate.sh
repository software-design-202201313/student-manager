#!/usr/bin/env bash
set -euo pipefail

echo "[qa] backend lint + tests"
(cd backend && .venv312/bin/ruff check app tests && .venv312/bin/pytest -q)

echo "[qa] frontend typecheck"
(cd frontend && ./node_modules/.bin/tsc --noEmit)

echo "[qa] complete"
