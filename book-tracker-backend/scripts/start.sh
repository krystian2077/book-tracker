#!/usr/bin/env bash
# Production entrypoint for Railway (and similar PaaS hosts).
set -euo pipefail

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding demo account and curated library..."
python manage.py seed_demo_data

echo "Starting gunicorn on port ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
