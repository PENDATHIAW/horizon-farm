#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" || -n "${DATABASE_URL:-}" || -n "${SUPABASE_DB_URL:-}" || -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  node scripts/apply_supabase_migrations.mjs
  exit $?
fi

if command -v supabase >/dev/null 2>&1; then
  echo "Application des migrations Supabase (CLI) depuis $ROOT/supabase/migrations"
  supabase db push --workdir "$ROOT"
  exit $?
fi

echo "Credentials Supabase manquants. Options :"
echo "  1. node scripts/apply_supabase_migrations.mjs  (avec SUPABASE_ACCESS_TOKEN ou DATABASE_URL)"
echo "  2. Supabase Dashboard → SQL Editor → exécuter les fichiers supabase/migrations/202606*.sql"
ls -1 "$ROOT/supabase/migrations"/202606*.sql 2>/dev/null || true
exit 1
