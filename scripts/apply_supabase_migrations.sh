#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI introuvable. Appliquez manuellement les fichiers SQL dans $MIGRATIONS_DIR via le SQL Editor."
  echo "Migrations roadmap récentes :"
  ls -1 "$MIGRATIONS_DIR"/202606*.sql 2>/dev/null || true
  exit 1
fi

echo "Application des migrations Supabase depuis $MIGRATIONS_DIR"
supabase db push --workdir "$ROOT"

echo "Migrations appliquées."
