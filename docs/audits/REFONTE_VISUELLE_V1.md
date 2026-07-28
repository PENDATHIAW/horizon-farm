# Refonte visuelle — passe « air et hiérarchie » (v1)

Objectif : rapprocher l'ERP d'un rendu épuré et aéré (référence visuelle fournie
par la direction), sans réécriture ni changement de logique métier. Tout passe
par les primitives de style partagées, donc l'amélioration profite à tous les
écrans d'un coup.

## Ce qui change (couche design uniquement)

- **Échelle typographique restaurée** (`src/styles/tokens.css`) — les tailles
  d'affichage `--text-3xl` à `--text-6xl` étaient toutes écrasées à `1,5rem`, ce
  qui aplatissait la hiérarchie. Elles reprennent une progression modulaire
  (1,9 / 2,25 / 2,75 / 3,25rem). Les tailles courantes `--text-xl` et
  `--text-2xl` (très utilisées) restent à `1,5rem` pour ne pas bousculer les
  écrans existants.
- **Titre d'écran plus calme** — `--hf-text-screen-title` passe de `1,5rem` à
  `1,85rem` (le « Bonjour … » de l'Accueil et tous les titres d'écran en
  Fraunces respirent).
- **Valeur des cartes KPI** — `--hf-text-card-value` passe de `2rem` à `2,25rem`
  (les chiffres clés deviennent le point focal).
- **Cartes plus douces et plus aérées** — rayon `--radius-card` de `0,75rem` à
  `0,875rem` ; padding interne de `.hf-card` de `1,5rem` à `1,75rem` (mode
  compact préservé à `1,15rem`).
- **Fond épuré** (`src/index.css`) — suppression des deux taches d'angle
  colorées ; il ne reste qu'un dégradé vertical très doux. Moins de bruit
  visuel, plus d'air.

## Ce qui ne change pas

- Aucune logique, aucun libellé, aucune donnée. Palette et polices inchangées
  (Inter + Fraunces, vert Horizon).
- Les tailles de texte courantes et les composants restent compatibles.

## Vérifications

- `301/301` tests unitaires, gardes charte (tiret long, mot interdit),
  `npm run lint`, `npm run build` : propres.

## Suite (par étapes, à valider écran par écran)

1. Composants partagés (cartes KPI, panneaux, listes) : harmoniser les
   espacements internes sur la nouvelle grille d'air.
2. Accueil : mise en page en sections espacées façon tableau de bord calme.
3. Puis module par module.
