# Fiche audit · Documents & Rapports

Entry point : `DocumentsRapportsModule.jsx`. Onglets réels : Centre de contrôle ·
Gestionnaire & OCR · Rapprochement & preuves · Rapports & exports. **Non conforme à
la cible** (Bibliothèque · Preuves & justificatifs · Rapports · Publications ·
Archives).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Centre de contrôle | 3/5 | 3/5 | 3/5 | 3/5 | n/a | 3/5 | **3,0/5** |
| Gestionnaire & OCR | 3/5 | 4/5 | 3/5 | 3/5 | 4/5 | 3/5 | **3,3/5** |
| Rapprochement & preuves | 4/5 | 4/5 | 4/5 | 3/5 | n/a | 4/5 | **3,8/5** |
| Rapports & exports | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 3/5 | **3,4/5** |

## Problèmes
- **Libellés techniques à l'écran** : « OCR », « Rapprochement » sont du jargon ; la
  cible parle de Preuves & justificatifs, Rapports, Publications, Archives.
- **Onglet Modèles** : doit être fusionné dans Rapports (bouton réservé aux rôles
  autorisés) — vérifier qu'il n'existe pas d'onglet Modèles séparé (semble déjà
  absent).
- **Document stocké une fois, lié par référence** : à vérifier qu'un même
  justificatif n'est pas dupliqué (référence unique).
- **Rapport publié immuable + versionné** : le cahier impose collecte → aperçu daté
  → validation → gel immuable → publication ; correction = nouvelle version ; aucun
  chiffre saisi à la main ; blocage si une valeur diverge de sa source. **Point
  critique à vérifier** : l'immuabilité et le blocage sur divergence de source.
- 8 fichiers font du calcul local — un rapport ne doit collecter que des valeurs de
  source, jamais recalculer.

## Corrections prioritaires
1. Restructurer et dé-jargonner les onglets.
2. Prouver l'immuabilité des rapports publiés (test lot 6).
