#!/usr/bin/env bash
# Corrige le build Vercel et pousse vers PENDATHIAW/tallow-and-go
set -euo pipefail

BASE="https://raw.githubusercontent.com/PENDATHIAW/horizon-farm/main/sites/tallow-and-go"

echo "→ Téléchargement des fichiers corrigés..."
curl -fsSL -o vercel.json "$BASE/vercel.json"
curl -fsSL -o .npmrc "$BASE/.npmrc"
curl -fsSL -o package.json "$BASE/package.json"
curl -fsSL -o package-lock.json "$BASE/package-lock.json"

echo "→ Vérification install..."
npm install
npm run build

echo "→ Push Git..."
git add vercel.json .npmrc package.json package-lock.json
git commit -m "fix: corriger build Vercel (vite en dependencies)" || true
git push origin main

echo "✓ Terminé — Vercel va redéployer automatiquement."
