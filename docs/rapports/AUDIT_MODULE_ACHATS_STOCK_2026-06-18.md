# Audit module Achats & Stock (`achats_stock`)

**Date :** 2026-06-18  
**État :** 3 onglets canoniques + sections repliables Inventaire

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `AchatsStockModule.jsx` | Entry lazy | Oui |
| `AchatsStockRecoveredModule.jsx` | Orchestrateur (~470 lignes) | **Racine** |
| `StocksV5.jsx` → `StocksV4.jsx` → `StocksV3.jsx` | Inventaire opérationnel | Oui (Inventaire) |
| `StockPurchaseReceptionForm.jsx` | Réception achat canonique | Oui |
| `achatsStock/*` panels (17 fichiers) | Réceptions, mouvements, insight… | Oui |
| `FournisseursReadable.jsx` | Fournisseurs & dettes | Oui |
| `stockPurchaseWorkflow.js` | Workflow achat → stock/finance/mouvement | Service |
| `StocksV2.jsx`, `StockLossFinanceBridge.jsx` | Legacy | **Non montés** |

---

## 2. Onglets canoniques

```
Inventaire | Réceptions & achats | Fournisseurs & dettes
```

### Contenu repliable (Inventaire)

- Mouvements enregistrés (`AchatsStockMovementsPanel`)
- Annexe & graphiques (`AchatsStockAnnexeTab`, `ModuleGraphiquesTab`)

Alias legacy : `Résumé`, `Stock`, `Mouvements`, `Annexe`, `Graphiques` → `Inventaire` ; `Achats` → `Réceptions & achats` ; `Fournisseurs` → `Fournisseurs & dettes`.

---

## 3. Écarts corrigés (cette passe)

| Priorité | Écart | Correction |
|----------|-------|------------|
| **P0** | `emitHorizonForm` perdu hors onglet Inventaire (listener dans `StocksV4` non monté) | `openStockPurchaseForm` : file sessionStorage + bascule Inventaire + retries |
| **P1** | Double mouvement ledger à la réception | `skip_stock_movement_event` dans workflow + garde `side_effects_managed` dans `StocksV5` |
| **P1** | Liens `Mouvements` / `Annexe` → Inventaire sans scroll | Auto-ouverture des `<details>` via alias + `inventaireSection` |
| **P1** | Deep-links findings IA résolus trop tôt | Alias brut conservé (`Mouvements`, `Stock`…) dans `navigationOptionsForFinding` |
| **P1** | Props `opportunities` absentes dans `App.jsx` | Câblées pour `StockSalesOpportunityBridge` |
| **P2** | Score santé header non cliquable | Bouton → onglet Inventaire |

---

## 4. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Réception achat (`commitStockPurchaseWorkflow`) | `stock`, `stock_movements`, `finances`, fournisseur, `documents`, `tracabilite`, `alertes` |
| Achats à payer | `finance_pilotage` → Trésorerie (alias `Dépenses`) |
| Dettes / relance | `Fournisseurs & dettes`, tâches |
| Commercial opportunité stock | `StockSalesOpportunityBridge` |
| Élevage alimentation | Redirect Élevage (pas d'écriture stock directe) |
| Accueil / Centre | Priorités stock sous seuil → `achats_stock` Inventaire |

---

## 5. Formulaires

| Action | Mécanisme |
|--------|-----------|
| Réception stock | `StockPurchaseReceptionForm` via `openStockPurchaseForm` |
| CRUD inventaire | `StocksV3` modales |
| Paiement fournisseur | `FournisseursReadable` |
| Perte péremption | `buildExpiryLossPatch` + `onUpdateStock` |

---

## 6. Tests

```bash
node --test tests/unit/achatsStockFormBridge.test.js
node --test tests/unit/achatsStockV1P0.test.js
node --test tests/unit/stockPurchaseWorkflow.test.js
```

---

## 7. Reste ouvert

- Migration prod `stock_movements` (`farm_id`, `dedupe_key`) — à confirmer en déploiement
- `CONSUMPTION_GAPS` santé / emballages œufs (traçabilité partielle)
- Archivage `StocksV2.jsx`
- `StockLossFinanceBridge.jsx` — **non monté** ; modales corrigées si réactivation
- `StockFlowPanel.jsx` — legacy StocksV3/V5 ; prompts remplacés par `QuickInputModal` (voir audit transversal)
