# Cultures — Audit existant & architecture cible V1

Date : 2026-06-10 · Branche : `cursor/cultures-v1-structure-ac42`

## Score estimé

| Dimension | Avant V1 | Après V1 (shell) | Cible complète |
|-----------|----------|------------------|----------------|
| Architecture onglets | 25/100 | 65/100 | 85/100 |
| Workflow unifié récolte | 45/100 | 75/100 | 85/100 |
| Interconnexions ERP | 55/100 | 68/100 | 80/100 |
| Orphelins / dette | 30/100 | 55/100 | 85/100 |
| **Composite** | **~42/100** | **~66/100** | **~81/100** |

## Cartographie existant (main avant refonte)

### Point d’entrée canonique

- `src/config/moduleEntryPoints.js` → `CulturesRecoveredModule.jsx`
- Alias : `CulturesV5.jsx`, `CulturesModule.jsx` (non utilisés par App)

### Structure UI avant V1

- **Vertical** : `CulturesV4` (sections empilées) + **5 sous-onglets** dans `CulturesV3`
- Pas de `MODULE_TARGET_TABS.cultures` dans `horizonVision.config.js`

### Onglets / sections avant → cible V1

| Avant | Cible V1 | Décision |
|-------|----------|----------|
| CultureOperationalHealthPanel + Repair (haut) | Pilotage | Fusionner + 6 KPI |
| LifecycleHistoryPanel (V4) | Cycles | Calendrier + historique |
| CulturesV3 (Cultures/Parcelles/Campagnes) | Parcelles & Cultures | Registre seul |
| CultureInputsWeatherPanel (V4) | Intrants & Météo | Lecture stock + utilisation |
| score_sante, traitements champs | Santé & Protection | Risques + pertes |
| CulturesHarvestPanel (non affiché) + 3 UIs récolte | Récoltes | `commitCultureHarvest` seul |
| — | Transformation | V1 stub + liens stock |
| ManureEconomyPanel (V4) | Économie circulaire | Conservé |
| — | Annexe | Documents cultures |
| CulturesEvolution (V4) | Graphiques | + narrations IA |

## Doublons identifiés (non supprimés sans audit)

| Doublon | Fichiers | Action V1 |
|---------|----------|-----------|
| Récolte prompt + stock direct | `CulturesWorkflowBridge.registerHarvest` | **Supprimé** (bug stockCrud) |
| Récolte modal simple | `CulturesTabActionsBridge.saveHarvest` | Masqué si `hideHarvestActions` |
| Récolte canonique | `CulturesHarvestPanel` + `commitCultureHarvest` | **Onglet Récoltes** |
| Opportunités vente | SaleBridge + TabActions + `salesOpportunityDerivation` | Conservé Récoltes + dérivation Commercial |
| Intrants | TabActions + `runCultureInputSideEffects` | Onglet Intrants uniquement |

## Fichiers orphelins (conservés — pas supprimés)

- `CulturesV2.jsx`, `Cultures.jsx` — chaîne legacy
- `CultureHarvestStockBridge.jsx`, `CultureCostOverview.jsx`, `CulturesReadinessBridge.jsx`, `CultureWorkflowBridgePanel.jsx`
- Voir `docs/CULTURES_LEGACY_NOTES.md`

## Workflows réutilisés (ne pas recréer)

- `commitCultureHarvest`, `commitCultureExpense`, `commitCultureStockSale` — `culturesWorkflow.js`
- `runCultureInputSideEffects`, `runCultureHarvestSideEffects` — `cultureSideEffects.js`
- `buildCultureDecisionProfile` — IA terrain
- `buildCulturesGapRows` — repair panel

## Interconnexions ajoutées V1

- Navigation `onNavigate('cultures', { tab })` avec `resolveCulturesTab` + `culturesTab` App
- Pilotage → Stock, Ventes, Smart Farm, Finance Rentabilité
- Cycles → Commercial Opportunités, Finance
- Intrants → Achats & Stock (lecture + décrément via workflow existant)
- Récoltes → Stock, Finance, Commercial (via `commitCultureHarvest`)
- Transformation → Récoltes + Stock produit fini
- Graphiques → `CulturesEvolution` + `buildCulturesChartNarratives`

## Tests

- `tests/unit/culturesWorkflow.test.js` (existant)
- `tests/unit/culturesV1.test.js` (nouveau)
