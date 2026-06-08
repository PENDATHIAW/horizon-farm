# Élevage — notes legacy (V2)

Document de référence pour éviter les imports obsolètes sans suppression brutale.

## Module canonique

| Zone | Fichier canonique | Point d'entrée |
|------|-------------------|----------------|
| Élevage UI | `src/modules/ElevageRecoveredModule.jsx` | `modules.config.js` → elevage |
| Avicole | `src/modules/AvicoleV10.jsx` | Monté dans Élevage > Avicole |
| Animaux | `src/modules/AnimauxV2.jsx` | Monté dans Élevage > Animaux |
| Santé | `src/modules/SanteV8.jsx` | Monté dans Élevage > Santé |
| Workflows | `src/utils/elevageWorkflow.js` | `commitElevageFeeding`, `commitElevageEggProduction`, etc. |
| Modales | `src/modules/elevage/ElevageWorkflowPanels.jsx` | feeding, health, mortality, eggs, weighing, transform |

## Alias Avicole V2–V9 (ne pas importer directement)

| Fichier | Statut | Redirige vers |
|---------|--------|-------------|
| `Avicole.js` | Alias legacy | `AvicoleV2.jsx` |
| `Avicole/index.jsx` | Alias legacy | `AvicoleV4.jsx` |
| `AvicoleV5.js` | Alias legacy | `AvicoleV7.jsx` |
| `AvicoleV8.jsx` | Alias legacy | `AvicoleV9.jsx` |
| `AvicoleV2`–`V9` | Conservés, non montés | Remplacés par **AvicoleV10** dans Élevage |

**Règle :** tout nouveau code doit importer `AvicoleV10` ou passer par `ElevageRecoveredModule`, jamais `AvicoleV3`–`V9` directement.

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

## farm_id logs

Migration : `supabase/migrations/20260607120000_elevage_logs_farm_id.sql`

Stamp création : `resolveElevageLogFarmId` + `FARM_SCOPED_CREATE_MODULES` (`alimentation_logs`, `production_oeufs_logs`, `sante`).
