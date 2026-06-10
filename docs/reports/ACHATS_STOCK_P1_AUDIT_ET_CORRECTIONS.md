# Achats & Stock — Audit P1 et corrections (gel final)

**Date :** 2026-06-10  
**Branche :** `cursor/achats-stock-p0-ac42`  
**Prérequis :** P0 validé (#105)

---

## Synthèse

| P1 | Statut |
|----|--------|
| P1-1 Alimentation → Élevage | ✅ |
| P1-2 Graphiques uniques | ✅ |
| P1-3 Mouvements lecture seule | ✅ |
| P1-4 Multi-fermes | ✅ (migration + ledger) |
| P1-5 Traçabilité | ✅ |

**Verdict : ACHATS & STOCK = GELÉ V1**

---

## P1-1 — Alimentation = vérité Élevage

| Emplacement | Avant | Après |
|-------------|-------|-------|
| `StocksV3.jsx` sortie aliment | `commitFeedingWorkflow` | Redirection Élevage › Alimentation |
| `StocksV4.jsx` planner | `applyFeedingPlan` écriture | `StockFeedingElevageHint` (simulateur) |
| `HeyHorizonStockCard` | Créait `alimentation_logs` | Bloque sortie aliment → Élevage |
| Table alimentation StocksV3 | CRUD | Lecture seule |
| Canonique écriture | — | `elevageWorkflow` → `commitFeedingWorkflow` |

---

## P1-2 — Graphiques uniques

| Composant | Avant | Après |
|-----------|-------|-------|
| `StockEvolution` dans StocksV4 | Onglet Stock | Supprimé |
| `StockEvolution` | ModuleGraphiquesTab | **Seule instance** |
| `FournisseursEvolution` FournisseursReadable | Onglet Fournisseurs | `hideEvolutionSection` |
| `FournisseursEvolution` | ModuleGraphiquesTab | **Seule instance** |

---

## P1-3 — Mouvements lecture seule

`AchatsStockMovementsPanel` : bannière ajoutée — « Lecture seule — les saisies se font dans l'onglet Stock. »

Aucune fonction d'écriture dans le panneau (filtres + affichage uniquement).

---

## P1-4 — Multi-fermes

Migration `supabase/migrations/20260604120000_stock_movements_farm_scope.sql` :

- `farm_id`, `dedupe_key`, `movement_ref`, `metadata` sur `stock_movements`
- Index `farm_id` + unique partiel `dedupe_key`

`stockMovementHelpers.buildStockMovementPayload` résout `farm_id` depuis patch / fiche.

`commitFarmTransfer` : mouvements sortie/entrée avec `farm_id` source/destination.

Filtre ferme dans `AchatsStockMovementsPanel`.

---

## P1-5 — Traçabilité

Nouveau : `src/utils/stockTraceSideEffects.js` (`TRA-STOCK-{stockId}`).

| Workflow | Trace |
|----------|-------|
| Réception achat | `commitStockPurchaseWorkflow` |
| Paiement fournisseur | `commitStockPurchaseWorkflow` (si payé) |
| Perte stock | `runStockLossSideEffects` |
| Transfert inter-fermes | `commitFarmTransfer` |

Câblage : `App.jsx` → `onCreateTrace` / `onUpdateTrace` sur module `achats_stock`.

---

## Fichiers modifiés (P1)

- `src/modules/StocksV3.jsx`
- `src/modules/StocksV4.jsx`
- `src/modules/FournisseursReadable.jsx`
- `src/modules/achatsStock/AchatsStockMovementsPanel.jsx`
- `src/modules/achatsStock/AchatsStockTransferPanel.jsx`
- `src/modules/AchatsStockRecoveredModule.jsx`
- `src/modules/StockPurchaseReceptionForm.jsx`
- `src/App.jsx`
- `src/utils/stockTraceSideEffects.js` (nouveau)
- `src/utils/stockPurchaseWorkflow.js`
- `src/utils/purchaseSideEffects.js`
- `src/utils/farmTransferWorkflow.js`

---

## Critères de gel final

| Contrôle | OK |
|----------|-----|
| Workflow achat unique | ✅ |
| CMUP unique | ✅ |
| Ledger unique | ✅ |
| Graphiques uniques | ✅ |
| Alimentation unique (Élevage) | ✅ |
| Multi-fermes | ✅ |
| Traçabilité | ✅ |
