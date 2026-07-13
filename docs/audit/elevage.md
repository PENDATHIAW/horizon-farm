# Fiche audit · Élevage

Entry point : `src/modules/ElevageModule.jsx` → `ElevageRecoveredModule.jsx`.
Onglets réels : Lots & bandes · Cycles & Reproduction · Santé · Transformation.
**Non restructuré vers la cible (8 onglets attendus).** 54 fichiers sous
`src/modules/elevage/` + legacy (Avicole ×9, Sante ×7).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Lots & bandes | 3/5 | 4/5 | 4/5 | 3/5 | 4/5 | 3/5 | **3,5/5** |
| Cycles & Reproduction | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,3/5** |
| Santé | 3/5 | 4/5 | 4/5 | 3/5 | 4/5 | 3/5 | **3,5/5** |
| Transformation | 4/5 | 5/5 | 4/5 | 3/5 | 4/5 | 4/5 | **4,0/5** |

## Écart de structure (majeur)
La cible demande 8 onglets (Vue d'ensemble · Lots & animaux · Alimentation ·
Production · Santé & Biosécurité · Transformation · Coûts & performance ·
Historique). Le module en rend 4 qui mélangent les rôles : « Lots & bandes »
contient lots, animaux, alimentation et production ; il n'y a pas d'onglet
Historique (l'ex-Traçabilité n'est pas encore le composant `JournalEvenements`
filtré). **Correction** : éclater en 8 onglets, brancher Historique sur
`uniques/JournalEvenements` filtré lot/animal.

## Saisie (contrat 20 s)
Formulaires ponte/distribution/mortalité/pesée existants avec `issue_key`
(`src/utils/elevageWorkflow.js`) et confirmation à effets. Bon socle. À aligner
sur le registre `formulaires20s.config.js` et vérifier ≤ 5 champs à l'écran.

## Intégrité (points à corriger)
- **Vente d'animal** : `ElevageRecoveredModule.jsx:399` gère une « exception
  terrain — vente avec délai sanitaire actif » et `ElevageTransformationTab` offre
  un type « vente vivant ». Le cahier impose que la vente parte de Commercial avec
  lien au lot. **À vérifier/corriger** : Élevage ne doit pas créer de vente ; il
  lit les ventes (`buildElevageTransformationRows(... kind === 'vente')`) mais ne
  doit pas les saisir.
- **Transformation** : crée le stock viande + coproduits et l'écriture finance
  après validation explicite (`ElevageTransformationTab.jsx:59,81`). Conforme au
  rôle (abattage → produits finis en stock). Vérifier qu'il passe par un mouvement
  de stock idempotent et non un stock local.
- **KPI/calcul local** : 24 fichiers Élevage font du calcul local (marge, coût du
  lot). À terme, les KPI de coût/marge doivent venir du catalogue KPI (Finance
  propriétaire des marges).
- Aucune table d'alertes locale détectée (alertes via `onCreateAlert` → table
  centrale). Bon.

## Compréhensibilité
Libellés terrain corrects. Reste du tiret long et le mot « IA » dans des panneaux
d'analyse Élevage (ex. `ElevageInsightPanel`) — à migrer au dictionnaire.
