# Élevage — Phase d'alignement vision cible (2026-06-09)

## Conservé

- Workflows reproduction existants (`ReproductionWorkflowForm`, routing `elevage` / `animaux`)
- `ElevageCyclesPanel` (Cycles V1, déjà sur `main`)
- Moteurs KPI : `buildPondeuseKpis`, `buildChairKpis`, `buildBovinKpis`, `buildProductionHubSnapshot`
- Composants terrain : `ElevageActionCard`, `ElevageStatCard`, `ELEVAGE_KPI_GRID`
- Règle IA : drafts / pré-remplissage sans création auto sans validation humaine

## Supprimé / réduit

- Hero Production « registre » (lots chair actifs, bovins actifs) remplacé par 6 KPI performances
- Libellés ambigus « Mise bas / naissance » vs « Naissance / mise bas (fiche) »
- Document reproduction sans mère ni photo (métadonnée locale seule)

## Fusionné / clarifié

- **Naissance** : encadré explicite + cartes « Workflow portée » vs « Fiche jeune (1 animal) »
- **Production** : sections repliables par filière avec liens « Registre » vers Avicole/Animaux

## Ajouté

- `buildReproductionProofDocument` — persistance photo + lien mère + `module_source=reproduction`
- Formulaire preuve : sélecteur mère, upload photo, événement `document_reproduction`
- Bloc `snapshot.performance` : taux casse, IC chair, GMQ, marges techniques agrégées
- Tests `elevageVisionAlign.test.js`

## Score estimé

| Zone | Avant | Après |
|------|-------|-------|
| Reproduction UX | ~48 | ~58 |
| Production hub | ~45 | ~58 |
| Cycles (V1 main) | ~50 | ~50 |
| Alignement global Élevage | ~46 | ~58 |

## Risques restants

- Marges techniques partielles si alimentation/santé incomplètes (labels « partielle » côté P&L)
- Lait non modélisé explicitement dans ce hub (pas de filière lait dédiée dans les données)
- Comparaison multi-fermes avancée Cycles : hors scope
- Photos reproduction en data URL (même pattern que Santé) — volumétrie stockage
