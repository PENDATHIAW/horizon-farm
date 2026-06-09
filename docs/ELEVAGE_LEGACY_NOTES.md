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

## Panels orphelins (non montés — NE PAS MODIFIER sans vérifier)

Ces fichiers existent dans `src/modules/elevage/` mais ne sont **pas** importés par `ElevageRecoveredModule` :

| Fichier | Statut | Remplacé par |
|---------|--------|--------------|
| `ElevageAlimentationPanel.jsx` | Orphelin | Hub inline `FeedingHub` dans `ElevageRecoveredModule` |
| `ElevageRepairPanel.jsx` | Orphelin | Workflows + intégrité ERP |
| `ElevageProductionPanel.jsx` | Orphelin | Hub inline `ProductionHub` |
| `ElevageCyclesPanel.jsx` | **Canonique** onglet Cycles Élevage | `VisionCyclesTab` (Centre IA seul) |
| `ElevageSantePanel.jsx` | Orphelin | `SanteV8` direct |
| `ElevageReproductionPanel.jsx` | Orphelin | Hub inline `ReproductionHub` |
| `ElevageTransformationPanel.jsx` | Orphelin | Hub inline `TransformationHub` + bridges |
| `ElevageFeedingDistribution.jsx` | Orphelin | `ElevageWorkflowPanels` (modal feeding) |

**Règle :** ne pas étendre ces panels. Si une fonctionnalité est demandée, l'implémenter dans le module canonique ou un utilitaire V3.

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
