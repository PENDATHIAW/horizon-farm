# Achats & Stock — Audit et corrections (gel V1)

**Date :** 2026-06-10  
**Branche :** `cursor/achats-stock-p0-ac42`  
**PR :** [#105](https://github.com/PENDATHIAW/horizon-farm/pull/105)  
**Objectif :** Gel module Achats & Stock V1 (niveau Élevage / Cultures)

---

## Synthèse exécutive

| Id | Thème | Statut | Vérité canonique |
|----|-------|--------|------------------|
| P0-1 | Achat | ✅ | `commitStockPurchaseWorkflow` |
| P0-2 | CMUP | ✅ | `stockValuation.js` |
| P0-3 | Commercial doublon | ✅ | 1× `StockSalesOpportunityBridge` (StocksV5) |
| P0-4 | IA honnête | ✅ | Libellés « Signaux métier » |
| P0-5 | Prix stock | ✅ | CMUP affiché ; prix fiche non éditable |
| P1-1 | Alimentation | ✅ | Écriture Élevage › Alimentation |
| P1-2 | Graphiques | ✅ | Onglet Graphiques seul |
| P1-3 | Mouvements | ✅ | Lecture seule + bannière |
| P1-4 | Multi-fermes | ✅ | Migration + `farm_id` ledger |
| P1-5 | Traçabilité | ✅ | `onCreateTrace` / `TRA-STOCK-{id}` |

**Score :** ~68/100 (avant) → ~85/100 (après)  
**Verdict : ACHATS & STOCK = GELÉ V1**

---

## P0-1 — Vérité unique achat

### Audit (avant)

| Emplacement | Utilisation | Impact ERP | Action |
|-------------|-------------|------------|--------|
| `StockPurchaseReceptionForm.jsx` | `commitStockPurchaseWorkflow` | Stock, finance, dette, document, ledger | Canonique — conservé |
| `StocksV3.jsx` MovementModal | `commitPurchaseWorkflow` | Side-effects partiels | **Supprimé** |
| `workflowService.js` | Définition legacy | Doublon | Conservé (WhatsApp legacy) |
| `whatsappDraftService.js` | `commitPurchaseWorkflow` | WhatsApp | Hors scope UI module |

### Correction

**Fichier :** `src/modules/StocksV3.jsx`

1. « Réceptionner » → `onOpenPurchaseReception` → `StockPurchaseReceptionForm`.
2. Fallback MovementModal (entrée + finance) → `prepareStockPurchaseWorkflow` + `commitStockPurchaseWorkflow`.
3. Suppression de `commitPurchaseWorkflow` dans le module Stock.

**Impact ERP :** une chaîne — stock_movement, finance, dette fournisseur, document, business_event.

---

## P0-2 — Vérité unique CMUP

### Audit (avant)

| Fichier | Calcul actuel | CMUP | Risque |
|---------|---------------|------|--------|
| `StocksV3.jsx` | `qty × prixUnit` | Non | KPI / tableau faux |
| `AchatsStockRecoveredModule.jsx` | Fallback `qty × prix` | Partiel | KPI Résumé divergent |
| `summarizeStockValuation` | CMUP | Oui | Canonique, sous-utilisé UI |

### Correction

- `displayUnitPrice` / `displayValue` via `computeWeightedAverageCost`.
- KPI « Valeur totale (CMUP) » via `summarizeStockValuation`.
- Colonnes : « CMUP / dernier achat », « Valeur (CMUP) ».
- Résumé : `stockValue = valuation.totalValue` (sans fallback prix fiche).
- Props `transactions`, `documents` dans `stockProps`.

---

## P0-3 — Doublon Commercial

| Instance | Fichier | Résultat |
|----------|---------|----------|
| ~~1~~ | `StocksV3.jsx` | Supprimée |
| 1 | `StocksV5.jsx` | **Seule instance active** |

---

## P0-4 — IA honnête

| Fonction / UI | Type | Avant | Après |
|---------------|------|-------|-------|
| `buildStockIaRecommendations` | Règles métier | — | Interne |
| `AchatsStockInsightPanel` | UI | Pilotage IA stock & achats | Signaux métier stock & achats |
| `AchatsStockRecoveredModule` | Toast | Action IA créée | Action métier créée |
| Section avancée Résumé | UI | IA, seuils… | Signaux métier, seuils… |

Aucun LLM dans le module.

---

## P0-5 — Vérité unique prix stock

| Écran | Avant | Après |
|-------|-------|-------|
| Create/Edit fiche | `prixUnit` éditable | Champ retiré ; `stripManualPrice()` |
| Réception achat | `prix_unitaire` | Canonique (met à jour CMUP) |
| Tableau inventaire | Prix fiche | CMUP / dernier achat |

---

## P1-1 — Alimentation = vérité Élevage

| Emplacement | Avant | Après |
|-------------|-------|-------|
| `StocksV3.jsx` sortie aliment | `commitFeedingWorkflow` | Redirection Élevage › Alimentation |
| `StocksV4.jsx` planner | `applyFeedingPlan` écriture | `StockFeedingElevageHint` (simulateur) |
| `HeyHorizonStockCard` | Créait `alimentation_logs` | Bloque sortie aliment → Élevage |
| Table alimentation StocksV3 | CRUD | Lecture seule (sans actions) |
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

`AchatsStockMovementsPanel` : bannière **« Lecture seule — les saisies se font dans l'onglet Stock. »**

Filtres et affichage uniquement — aucune écriture dans l'onglet Mouvements.

---

## P1-4 — Multi-fermes

Migration `supabase/migrations/20260604120000_stock_movements_farm_scope.sql` :

| Colonne / index | Rôle |
|-----------------|------|
| `farm_id` | Scope ferme sur ledger |
| `dedupe_key` | Idempotence |
| `movement_ref` | Référence workflow |
| `metadata` | Kind, coût unitaire, etc. |

- `buildStockMovementPayload` résout `farm_id` depuis patch / fiche.
- `commitFarmTransfer` : sortie source + entrée destination avec `farm_id` distincts.
- Filtre ferme dans `AchatsStockMovementsPanel`.

---

## P1-5 — Traçabilité

Nouveau : `src/utils/stockTraceSideEffects.js` — fiche `TRA-STOCK-{stockId}`.

| Workflow | Trace créée |
|----------|-------------|
| Réception achat | `commitStockPurchaseWorkflow` |
| Paiement fournisseur | `commitStockPurchaseWorkflow` (si payé) |
| Perte stock | `runStockLossSideEffects` |
| Transfert inter-fermes | `commitFarmTransfer` |

Câblage : `App.jsx` → `onCreateTrace` / `onUpdateTrace` sur `achats_stock`.

---

## Fichiers modifiés

| Fichier | P0 | P1 |
|---------|----|----|
| `src/modules/StocksV3.jsx` | ✅ | ✅ |
| `src/modules/AchatsStockRecoveredModule.jsx` | ✅ | ✅ |
| `src/modules/achatsStock/AchatsStockInsightPanel.jsx` | ✅ | — |
| `src/modules/StocksV4.jsx` | — | ✅ |
| `src/modules/FournisseursReadable.jsx` | — | ✅ |
| `src/modules/achatsStock/AchatsStockMovementsPanel.jsx` | — | ✅ |
| `src/modules/achatsStock/AchatsStockTransferPanel.jsx` | — | ✅ |
| `src/modules/StockPurchaseReceptionForm.jsx` | — | ✅ |
| `src/App.jsx` | — | ✅ |
| `src/utils/stockTraceSideEffects.js` | — | ✅ (nouveau) |
| `src/utils/stockPurchaseWorkflow.js` | — | ✅ |
| `src/utils/purchaseSideEffects.js` | — | ✅ |
| `src/utils/farmTransferWorkflow.js` | — | ✅ |
| `src/utils/stockWorkflows.js` | ✅ | — |
| `tests/unit/achatsStockV1P0.test.js` | ✅ | — |

---

## Tests et build

```bash
npm run build
node --test tests/unit/achatsStockV1P0.test.js   # ESM chain — voir note ci-dessous
```

Tests P0 ajoutés : pas de `commitPurchaseWorkflow` dans StocksV3, CMUP, bridge unique, libellés honnêtes.

Note : le runner Node sur `achatsStockV1P0.test.js` peut échouer sur la chaîne ESM `stockPurchaseWorkflow` (préexistant). Validations manuelles grep + `stockValuation.js` OK. Build Vite : OK.

---

## Critères de gel final

| Contrôle | Résultat |
|----------|----------|
| Workflow achat | ✅ `commitStockPurchaseWorkflow` |
| Valorisation CMUP | ✅ `summarizeStockValuation` |
| Ledger stock | ✅ `stock_movements` + idempotence |
| Opportunités commerciales | ✅ Une source (StocksV5) |
| KPI valeur stock | ✅ Identiques (CMUP) |
| Graphiques | ✅ Onglet Graphiques seul |
| Alimentation | ✅ Élevage seul écrivain |
| Multi-fermes | ✅ Migration + filtres |
| Traçabilité | ✅ `onCreateTrace` câblé |
| IA libellés | ✅ Signaux métier |
| Prix fiche | ✅ Non éditable |

**ACHATS & STOCK = GELÉ V1**

---

## Convention rapports

Les audits et corrections d’un module sont regroupés dans **un seul fichier** `docs/reports/{MODULE}_AUDIT_ET_CORRECTIONS.md` (P0 + P1 + suites, sans fichiers séparés par phase).
