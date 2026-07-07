# Audit module Finance & Pilotage (`finance_pilotage`)

**Date :** 2026-06-18  
**État :** 5 onglets canoniques + sous-vues Trésorerie / Pilotage

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `FinancePilotageModule.jsx` | Entry lazy | Oui |
| `FinancePilotageRecoveredModule.jsx` | Orchestrateur (~820 lignes) | **Racine** |
| `FinancesV12.jsx` → `FinancesV11.jsx` | Saisie trésorerie CRUD | Oui (Trésorerie → saisie) |
| `FinanceReconciliationPanel.jsx` | Réconciliation paiements | Oui (Trésorerie → reconciliation) |
| `InvestissementsV9.jsx` | BP / investissements | Oui (Pilotage → investissements) |
| `finance/*` panels | Résumé, alertes, exports, échéancier… | Oui |
| `ModuleGraphiquesTab.jsx` | Graphiques | Oui |
| `FinancesV2–V10.jsx`, `FinanceTreasuryView.jsx` | Legacy | **Non montés** |

---

## 2. Onglets canoniques

```
Résumé | Trésorerie | Créances & dettes | Pilotage | Graphiques
```

### Sous-vues

| Onglet | Sous-vues |
|--------|-----------|
| Trésorerie | `saisie`, `reconciliation` |
| Pilotage | `echeancier`, `financement`, `investissements`, `rentabilite`, `annexe` |

Alias : `Réconciliation`, `Dépenses`, `Investissements`, `Rentabilité`, `Échéancier`, `Financement`, `Annexe`, `Créances`, `Dettes` → résolus via `resolveFinanceNavigation`.

---

## 3. Écarts corrigés (cette passe)

| Priorité | Écart | Correction |
|----------|-------|------------|
| **P0** | Deep-links externes perdaient la sous-vue (Investissements → Pilotage/échéancier) | `App.jsx` conserve l’alias brut dans `financeTab` ; `navigationOptionsForFinding` / `navigateForIaFinding` idem |
| **P0** | Investissements / BP filtrés par période → onglet vide en démo | `investissements` et `businessPlans` hors filtre période |
| **P1** | Navigation interne ne persistait pas l’alias sous-vue | `onTabChange` reçoit la cible brute (`Investissements`, `Réconciliation`…) |
| **P1** | Libellé « Pilotage IA finance » | → **Signaux métier finance** (`FinanceInsightPanel`) |
| **P2** | Panels inline morts (`FinanceIaPanel`, `CoherencePanel`, `MissingProofPanel`) | Supprimés (remplacés par `FinanceInsightPanel` / `FinanceMissingProofPanel`) |

---

## 4. Interconnexions vérifiées

| Flux | Modules / tables |
|------|------------------|
| Vente → encaissement | `payments`, `finances`, MAJ commande |
| Commercial réconciliation | `App` → `financeTab: 'Réconciliation'` → sous-vue trésorerie |
| Créances panel | Lien → `commercial` / Clients & créances |
| Dettes panel | Lien → `achats_stock` / Fournisseurs & dettes |
| Side-effects terrain | `saleSideEffects`, `purchaseSideEffects`, `feedingSideEffects`, `cultureSideEffects` |
| Accueil Carnet | Cartes finances → Résumé / Trésorerie / Créances & dettes |
| Centre décisionnel | Findings → navigation alias finance préservée |

---

## 5. Formulaires (lecture audit)

| Zone | Mécanisme |
|------|-----------|
| Nouvelle écriture | `emitHorizonForm('finances', 'finance_entry')` |
| CRUD transactions | `FinanceTransactionsOnly` + modales |
| Réconciliation | Création finance depuis paiement |
| Investissements / BP | `InvestissementsV9` + CRUD BP |
| Justificatifs manquants | `FinanceMissingProofPanel` → formulaire finance ou document |

---

## 6. Tests

```bash
npx vite-node tests/unit/financeNavigation.test.js
npx vite-node tests/unit/financePilotageV1.test.js
npx vite-node tests/unit/financeP0.test.js
npx vite-node tests/unit/financeP1.test.js
```

---

## 7. Reste ouvert (non bloquant démo courte)

- Archivage `FinancesV2–V10` (dette technique)
- Gap Reproduction → valorisation cheptel investisseur (doc séparé)
- Glossaire marge uniquement sous Rentabilité (pas Résumé)
