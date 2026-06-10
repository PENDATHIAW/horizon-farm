# Élevage — notes legacy (V3)

Document de référence pour éviter les imports obsolètes sans suppression brutale.

## Module canonique

| Zone | Fichier canonique | Point d'entrée |
|------|-------------------|----------------|
| Élevage UI | `src/modules/ElevageRecoveredModule.jsx` | `modules.config.js` → elevage via `ElevageModule.jsx` |
| Avicole | `src/modules/AvicoleV10.jsx` | Monté dans Élevage > Avicole |
| Animaux | `src/modules/AnimauxV2.jsx` | Monté dans Élevage > Animaux |
| Santé | `src/modules/SanteV8.jsx` | Monté dans Élevage > Santé |
| Workflows | `src/utils/elevageWorkflow.js` | `commitElevageFeeding`, `commitElevageEggProduction`, etc. |
| Modales | `src/modules/elevage/ElevageWorkflowPanels.jsx` | feeding, health, mortality, eggs, weighing, transform |
| P&L V3 | `src/utils/elevageActivityPnl.js` | `buildElevageActivityPnl`, KPIs pondeuses/chair/bovins |
| IA V3 | `src/utils/elevageIaInsights.js` | `buildElevageCostAwareInsights` |
| Export V3 | `src/utils/elevageExport.js` | `buildElevageInvestorReport`, `exportElevageInvestorPdf` |

**Règle :** tout nouveau code Élevage doit passer par `ElevageRecoveredModule` ou les utilitaires V3 ci-dessus.

## Panels legacy supprimés (POST-GEL P1-08)

Les panels orphelins suivants ont été retirés — ne pas réintroduire :

| Fichier supprimé | Remplacé par |
|------------------|--------------|
| `ElevageAlimentationPanel.jsx` | Hub inline `FeedingHub` dans `ElevageRecoveredModule` |
| `ElevageFeedingDistribution.jsx` | `ElevageWorkflowPanels` (modal feeding) |
| `ElevageRepairPanel.jsx` | Workflows + intégrité ERP |
| `ElevageProductionPanel.jsx` | Hub inline `ProductionHub` |
| `ElevageCyclesPanel.jsx` | `VisionCyclesTab` |
| `ElevageSantePanel.jsx` | `SanteV8` direct |
| `ElevageReproductionPanel.jsx` | Hub inline `ReproductionHub` |
| `ElevageTransformationPanel.jsx` | Hub inline `TransformationHub` + bridges |

**Règle :** toute évolution passe par le module canonique ou un utilitaire V3.

## Multi-fermes (`VITE_ENABLE_FARM_FILTER`)

Source : `src/utils/farmScope.js` → `isFarmScopeFilteringEnabled()`, `filterRowsByFarmScope()`.

| Comportement | Détail |
|--------------|--------|
| Filtrage actif | Uniquement si `VITE_ENABLE_FARM_FILTER=true` (build) ou `forceFilter` / `filteringEnabled` explicite |
| Par défaut (mono-ferme) | Pas de filtrage — toutes les lignes visibles (régression zéro) |
| Lignes sans `farm_id` | Toujours visibles même avec filtre actif |
| Scope « toutes les fermes » | `mode: 'all'` — aucun filtre par ferme |

Zones Élevage vérifiées POST-GEL P1-09 (KPI, Production, Résumé, Cycles) : données passent par `periodFiltered` / `farmScope` du module parent quand le filtre est activé ; sans flag, comportement identique à mono-ferme.

Stamp création logs : `resolveElevageLogFarmId` + migration `20260607120000_elevage_logs_farm_id.sql`.

## Alias Avicole V2–V9 (ne pas importer directement)

| Fichier | Statut | Redirige vers |
|---------|--------|-------------|
| `Avicole.js` | Alias legacy | `AvicoleV2.jsx` |
| `Avicole.jsx` | Alias legacy | `AvicoleV10.jsx` |
| `Avicole/index.jsx` | Alias legacy | `AvicoleV4.jsx` |
| `AvicoleV5.js` | Alias legacy | `AvicoleV7.jsx` |
| `AvicoleV8.jsx` | Alias legacy | `AvicoleV9.jsx` |
| `AvicoleV2`–`V9` | Conservés, non montés | Remplacés par **AvicoleV10** dans Élevage |

**Règle :** tout nouveau code doit importer `AvicoleV10` ou passer par `ElevageRecoveredModule`, jamais `AvicoleV3`–`V9` directement.

## Module wrapper

| Fichier | Rôle |
|---------|------|
| `ElevageModule.jsx` | Re-export `ElevageRecoveredModule` — point d'entrée `moduleEntryPoints.js` |

## Chemins stock œufs (unifié V2)

Chemin officiel production → stock :

1. `commitElevageEggProduction` (`elevageWorkflow.js`)
2. `production_oeufs_logs` + `farm_id` + `dedupe_key`
3. Entrée stock via `findEggStockRow` + `buildEggProductionStockMovementPayload` + `persistConsumptionMovement`
4. `business_event` `production_oeufs` / `entree_stock_oeufs`

Chemins legacy (conservés, ne pas étendre) :

- `eggStockSyncService.syncEggStockFromProduction` — sync tablettes depuis Avicole CRUD direct
- `livestockStockBridge.js` — Hey Horizon / cartes avicole historiques

## Taux de ponte officiel

Source unique : `src/utils/elevageLayingRate.js`

Formule : `œufs produits / pondeuses actives × 100`

Message si impossible : **« Taux de ponte non calculable »**

## Seuils officiels

Source : `src/utils/elevageThresholds.js` (override ferme via `farm_cost_settings.elevageThresholds`)

- Mortalité alerte : 4 %
- Mortalité critique : 8 %
- Casse œufs alerte : 8 %
- Ponte faible : 65 %

## Coûts complets (V3)

Source : `src/services/unifiedCostService.js` → `calculateUnifiedLotCost` / `calculateUnifiedAnimalCost`

Marge fiable uniquement si `costComplete === true` (alimentation + santé + données production/achat selon type).

Les panneaux V3 (`ElevageActivityPnlPanel`, `ElevageProfitabilityKpis`, `ElevageInsightPanel`) respectent cette règle.

## farm_id logs

Migration : `supabase/migrations/20260607120000_elevage_logs_farm_id.sql`

Stamp création : `resolveElevageLogFarmId` + `FARM_SCOPED_CREATE_MODULES` (`alimentation_logs`, `production_oeufs_logs`, `sante`)

## Tests de référence

| Fichier | Couverture |
|---------|------------|
| `tests/unit/elevageV1.test.js` | Workflows, startup, coûts alimentation |
| `tests/unit/elevageV2.test.js` | Ponte officielle, farm_id, marges |
| `tests/unit/elevageV3.test.js` | P&L activité, KPIs, IA, export |
| `tests/unit/elevageBroilerScenario.test.js` | Scénario chair bout-en-bout |
| `tests/unit/moduleTabsStability.test.js` | Tous onglets Élevage (dont simulé) |
| `tests/unit/elevagePostGelP1.test.js` | Corrections POST-GEL P1 (marge, santé, reproduction, voix) |
| `tests/unit/elevageProductionHub.test.js` | Hub Production V2 (œufs, chair, bovins, ovins, caprins) |

## Vérité financière unique (POST-GEL P1-01)

Libellé canonique : **Marge brute technique** = Revenus − coût de production unifié ERP.

Source : `src/utils/productionFinancialTruth.js` (`MARGIN_GROSS_DEFINITION`, `PRODUCTION_FINANCE_LABELS`).
