#!/usr/bin/env bash
set -euo pipefail

# Crée le dépôt GitHub et pousse le code (à lancer avec VOS identifiants GitHub)
# Usage: ./scripts/bootstrap-github.sh [owner]

OWNER="${1:-PENDATHIAW}"
REPO="tallow-and-go"

echo "→ Création du dépôt ${OWNER}/${REPO}..."
gh repo create "${OWNER}/${REPO}" \
  --public \
  --description "Tallow & Go — cosmétiques naturels au suif, fabriqués au Sénégal" \
  --source=. \
  --remote=origin \
  --push

echo "✓ Dépôt créé et code poussé : https://github.com/${OWNER}/${REPO}"
