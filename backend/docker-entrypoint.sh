#!/usr/bin/env sh
set -eu

alembic upgrade head

if [ "${RUN_SEED:-0}" = "1" ]; then
  python -c 'import asyncio; from seed import seed; asyncio.run(seed())'
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
