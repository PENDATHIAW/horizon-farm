#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  if [[ -z "${SUPABASE_MIGRATIONS:-}" ]]; then
    echo "SUPABASE_MIGRATIONS doit contenir une liste de fichiers SQL separes par des virgules."
    exit 1
  fi
  IFS=',' read -r -a requested <<< "$SUPABASE_MIGRATIONS"
  files=()
  for file in "${requested[@]}"; do
    clean="${file#${file%%[![:space:]]*}}"
    clean="${clean%${clean##*[![:space:]]}}"
    [[ "$clean" == supabase/migrations/* ]] || clean="supabase/migrations/$clean"
    files+=("$clean")
  done
  node scripts/supabase-management.mjs apply "${files[@]}"
  exit $?
fi

if command -v supabase >/dev/null 2>&1; then
  echo "Application des migrations Supabase (CLI) depuis $ROOT/supabase/migrations"
  supabase db push --workdir "$ROOT"
  exit $?
fi

echo "Credentials Supabase manquants. Options :"
echo "  1. SUPABASE_MIGRATIONS=<fichier.sql> npm run db:migrate"
echo "  2. Supabase Dashboard → SQL Editor → exécuter la migration explicitement sélectionnée"
ls -1 "$ROOT/supabase/migrations"/*.sql 2>/dev/null || true
exit 1
