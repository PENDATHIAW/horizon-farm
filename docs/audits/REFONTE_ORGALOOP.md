# Refonte visuelle — direction Orgaloop

Objectif : rapprocher l'ERP du rendu de référence (Orgaloop) — **épuré, aéré,
plat, entièrement sans-serif**. Le vert n'est plus qu'un accent réservé à
l'action principale. Refonte au niveau des primitives (`tokens.css`,
`index.css`) : elle profite à tout l'ERP d'un coup, sans changement de logique.

## Ce qui change

- **Typographie entièrement sans-serif** (`tokens.css`) — l'affichage passe de
  Fraunces (serif) à Inter. `--font-display`, `--font-serif` et
  `--hf-font-display` pointent désormais vers Inter. Plus aucun titre en serif.
- **Fond blanc franc et plat** (`index.css`) — suppression des dégradés et des
  teintes d'angle du fond. La page est blanche ; la séparation se fait par des
  filets clairs, pas par des ombres.
- **Cartes plates** (`tokens.css`) — `--shadow-card` réduit à un filet quasi
  invisible ; `--shadow-float` (survols, menus flottants) allégé. Les cartes se
  lisent par leur bordure, façon Orgaloop.
- **Surfaces plus blanches** — `--color-card` / `--hf-card` passent à blanc pur ;
  `--color-mist` / `--hf-mist` (fond de page) à un blanc cassé très clair.

## Ce qui ne change pas

- Aucune logique, aucun libellé, aucune donnée. La palette verte et les couleurs
  sémantiques (positif, vigilance, urgent) sont conservées.
- La barre latérale de navigation existe déjà (`AppLayout`) ; elle bénéficie
  directement du nouveau fond et des filets.

## Vérifications

- `npm run lint`, `npm run build`, gardes charte (tiret long, mot interdit) et
  suite unitaire : propres.

## Suite possible

- Harmoniser les espacements internes des composants partagés sur la nouvelle
  grille d'air.
- Revoir la barre latérale (`AppLayout`) pour coller au pixel à la référence
  (sections, libellés discrets, indicateur d'onglet actif).
