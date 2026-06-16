# Audit v2 — Module Finance & Pilotage

**Date :** 2026-06-09  
**Branche :** `cursor/erp-audit-kpi-alignment-ac42`  
**Périmètre :** module `finance_pilotage` — 5 onglets + sous-vues

---

## 1. Structure (5 onglets + sous-vues)

| Onglet | Sous-vues | Contenu |
|--------|-----------|---------|
| **Résumé** | — | Situation exécutive, KPI trésorerie, signaux IA, workflows, exports |
| **Trésorerie** | `saisie`, `reconciliation` | `FinancesV12` + panneaux réconciliation |
| **Créances & dettes** | — | Créances clients + dettes fournisseurs |
| **Pilotage** | `echeancier`, `financement`, `investissements`, `rentabilite`, `annexe` | Échéancier, BP, investissements, rentabilité + glossaire marge |
| **Graphiques** | — | `ModuleGraphiquesTab` |

---

## 2. Périmètre KPI (Période vs Cumul)

| Donnée | Périmètre | Note |
|--------|-----------|------|
| KPI Résumé (trésorerie, créances, marge réelle) | **Cumul ferme** | via `transactionsAll` + `consolidateFinance` |
| Liste saisie Trésorerie | Période si filtre actif | `transactions` filtrées |
| Graphiques | Période si filtre actif | props filtrées |
| Badge header | « Trésorerie & créances : cumul ferme » | Cohérent avec KPI Résumé |

---

## 3. Anomalies corrigées

| # | Problème | Correction |
|---|----------|------------|
| F1 | `transactionsAll` écrasé par transactions filtrées → KPI trésorerie faux avec filtre période | `allRows()` pour `transactionsAll` dans consolidation |
| F2 | Deep-links Investissements / Réconciliation / Échéancier perdaient la sous-vue (`App` résolvait l'onglet avant le module) | `App.jsx` passe l'onglet **brut** à `financeTab` |
| F3 | Redirect commercial réconciliation → Trésorerie saisie au lieu de réconciliation | `setFinanceTab('Réconciliation')` brut |
| F4 | Alias `Dépenses` absent | Ajout dans `FINANCE_TAB_ALIASES` + sous-vue `saisie` |
| F5 | `FinanceInsightPanel` : onglets `Performance`, `Financeurs`, `Fournisseurs` invalides | Onglets canoniques |
| F6 | Note de périmètre absente sous KPI Résumé | Footnote cumul vs période |

---

## 4. Navigation cross-module

- `resolveFinanceNavigation(raw)` : résout onglet + `treasurySubview` / `pilotageSubview`
- Fonctionne en interne via `navigateFinance()` dans le module
- **App** doit passer `initialTab` brut (corrigé)

Alias utiles : `Réconciliation` → Trésorerie + reconciliation, `Investissements` → Pilotage + investissements, `Rentabilité` → Pilotage + rentabilite.

---

## 5. Formulaires & glossaire

- **Écriture** : `emitHorizonForm('finances', 'finance_entry')` depuis Résumé / `FinancesV12`
- **Glossaire marges** : `MarginGlossaryPanel` dans sous-vue Rentabilité (Pilotage)
- **Réconciliation** : `FinanceReconciliationPanel` + lien Commercial Ventes

---

## 6. Anomalies ouvertes

| # | Anomalie | Priorité |
|---|----------|----------|
| O1 | Code mort : `FinanceIaPanel`, `CoherencePanel`, `MissingProofPanel` inline (doublons) | Basse |
| O2 | Investissements / BP filtrés par période (peut masquer actifs) | Moyenne |
| O3 | Glossaire marge absent du Résumé (seulement Rentabilité) | Basse |

---

## 7. Fichiers modifiés

- `src/App.jsx`
- `src/utils/commercialNavigation.js`
- `src/modules/FinancePilotageRecoveredModule.jsx`
- `src/modules/finance/FinanceInsightPanel.jsx`
- `tests/unit/financeNavigation.test.js`

---

## 8. Vérification

```bash
npm run build
npx vite-node tests/unit/financeNavigation.test.js
npx vite-node tests/unit/financePilotageV1.test.js
npx vite-node tests/unit/financeP0.test.js
```

---

## 9. Prochaine étape audit v2

Module **Élevage** (4 onglets + Avicole/Animaux).
