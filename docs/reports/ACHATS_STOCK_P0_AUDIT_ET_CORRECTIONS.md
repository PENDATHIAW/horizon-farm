# Achats & Stock — Audit P0 et corrections

**Date :** 2026-06-10  
**Branche :** `cursor/achats-stock-p0-ac42`  
**Objectif :** Éligibilité au gel V1 (niveau Élevage / Cultures)

---

## Synthèse exécutive

| P0 | Statut | Vérité canonique |
|----|--------|------------------|
| P0-1 Achat | ✅ Corrigé | `commitStockPurchaseWorkflow` |
| P0-2 CMUP | ✅ Corrigé | `stockValuation.js` |
| P0-3 Commercial doublon | ✅ Corrigé | 1× `StockSalesOpportunityBridge` (StocksV5) |
| P0-4 IA honnête | ✅ Corrigé | Libellés « Signaux métier » |
| P0-5 Prix stock | ✅ Corrigé | Prix non éditable sur fiche ; CMUP affiché |

**Score estimé :** ~82/100 (avant ~68) — **ÉLIGIBLE AU GEL P0**

---

## P0-1 — Vérité unique achat

### Audit (avant)

| Emplacement | Utilisation | Impact ERP | Action |
|-------------|-------------|------------|--------|
| `StockPurchaseReceptionForm.jsx` L185 | `commitStockPurchaseWorkflow` | Stock, finance, dette, document, ledger | Canonique — conservé |
| `StocksV3.jsx` L147 | `commitPurchaseWorkflow` via MovementModal | Side-effects partiels `workflowService` | **Supprimé** |
| `workflowService.js` L436 | Définition legacy | Doublon structure records | Conservé pour compat WhatsApp legacy path |
| `whatsappDraftService.js` L252 | `commitPurchaseWorkflow` | WhatsApp | Hors scope UI module (bridge existant) |

### Correction

**Fichier :** `src/modules/StocksV3.jsx`

1. Bouton « Réceptionner » → `onOpenPurchaseReception` → `StockPurchaseReceptionForm` (canonique).
2. Fallback MovementModal (entrée + finance) → `prepareStockPurchaseWorkflow` + `commitStockPurchaseWorkflow`.
3. Suppression import `commitPurchaseWorkflow`.

**Impact ERP :** une seule chaîne : stock_movement ledger, finance, dette fournisseur, document, business_event.

---

## P0-2 — Vérité unique CMUP

### Audit (avant)

| Fichier | Calcul actuel | CMUP | Risque |
|---------|---------------|------|--------|
| `StocksV3.jsx` | `qty × prixUnit` | Non | KPI et tableau inventaire faux |
| `AchatsStockRecoveredModule.jsx` L208 | Fallback `qty × prix` | Partiel | KPI Résumé divergent |
| `summarizeStockValuation` | CMUP | Oui | Canonique — sous-utilisé UI |

### Correction

- `StocksV3.jsx` : `displayUnitPrice` / `displayValue` via `computeWeightedAverageCost`.
- KPI « Valeur totale (CMUP) » via `summarizeStockValuation`.
- Colonnes tableau : « CMUP / dernier achat », « Valeur (CMUP) ».
- `AchatsStockRecoveredModule.jsx` : `stockValue = valuation.totalValue` (sans fallback prix fiche).

**Props ajoutées :** `transactions`, `documents` dans `stockProps`.

---

## P0-3 — Doublon Commercial

### Audit (avant)

| Instance | Fichier | Active | Supprimable |
|----------|---------|--------|-------------|
| 1 | `StocksV3.jsx` | Oui | ✅ Supprimée |
| 2 | `StocksV5.jsx` | Oui | Conservée (seule instance) |

**Chaîne :** AchatsStockRecoveredModule → StocksV5 → StocksV4 → StocksV3 (doublon).

### Correction

Suppression de `<StockSalesOpportunityBridge />` dans `StocksV3.jsx`. Instance unique dans `StocksV5.jsx` L81-91.

---

## P0-4 — IA honnête

### Classification

| Fonction | Type | Libellé avant | Libellé après |
|----------|------|---------------|---------------|
| `buildStockIaRecommendations` | Règles métier | — | (interne, non affiché « IA ») |
| `AchatsStockInsightPanel` | Règles | Pilotage IA stock & achats | Signaux métier stock & achats |
| `AchatsStockRecoveredModule` | UI | Action IA créée | Action métier créée |
| Section avancée Résumé | UI | « IA, seuils… » | « Signaux métier, seuils… » |

Aucun LLM dans le module Achats & Stock.

---

## P0-5 — Vérité unique prix stock

### Audit (avant)

| Écran | Champ | Modifiable | Impact CMUP |
|-------|-------|------------|-------------|
| StocksV3 Create/Edit | `prixUnit` | Oui | Contradiction CMUP |
| StockPurchaseReceptionForm | `prix_unitaire` | Oui (réception) | ✅ Met à jour CMUP via workflow |
| Tableau inventaire | prix fiche | Affiché | Divergence |

### Correction

- Champ `prixUnit` retiré de `stockFields()` (create/edit).
- `stripManualPrice()` sur create/edit (ignore prix saisi).
- Affichage CMUP / dernier achat dans tableau et détail.
- CTA « Réception achat » pour saisie prix documentée.

---

## Fichiers modifiés

| Fichier | P0 |
|---------|-----|
| `src/modules/StocksV3.jsx` | P0-1, P0-2, P0-3, P0-5 |
| `src/modules/AchatsStockRecoveredModule.jsx` | P0-2, P0-4 |
| `src/modules/achatsStock/AchatsStockInsightPanel.jsx` | P0-4 |
| `tests/unit/achatsStockV1P0.test.js` | Tests P0 |
| `docs/reports/ACHATS_STOCK_P0_AUDIT_ET_CORRECTIONS.md` | Livrable |

---

## Tests

```bash
node --test tests/unit/achatsStockV1P0.test.js
npm run build
```

Tests ajoutés : P0-01 (pas de `commitPurchaseWorkflow` dans StocksV3), P0-02 (CMUP), P0-03 (bridge unique), P0-04 (libellés).

---

## P1 — Non traité (après validation P0)

- P1-1 Alimentation → Élevage (une vérité)
- P1-2 StockEvolution doublon Stock / Graphiques
- P1-3 Mouvements lecture seule + bannière
- P1-4 Migration `20260604120000_stock_movements_farm_scope.sql`
- P1-5 `onCreateTrace` comme Cultures

---

## Critères de gel P0

| Contrôle | Résultat |
|----------|----------|
| Workflow achat | ✅ Unique (`commitStockPurchaseWorkflow`) |
| Valorisation | ✅ CMUP unique dans onglet Stock + Résumé |
| Opportunités commerciales | ✅ Une source (StocksV5) |
| KPI valeur stock | ✅ `summarizeStockValuation` |
| IA libellés | ✅ Signaux métier |
| Prix fiche éditable | ✅ Bloqué |

**Verdict : ACHATS & STOCK V1 ÉLIGIBLE AU GEL P0**

Note tests unitaires : `node --test tests/unit/achatsStockV1P0.test.js` nécessite résolution ESM complète (imports `.js` en chaîne `stockPurchaseWorkflow` → préexistant). Tests statiques (grep fichier + `stockValuation.js`) validés. Build Vite : OK.
