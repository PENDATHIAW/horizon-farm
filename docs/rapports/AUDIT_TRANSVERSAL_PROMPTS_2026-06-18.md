# Audit transversal — suppression `window.prompt`

**Date :** 2026-06-18  
**Objectif :** Éliminer les saisies métier via `window.prompt` au profit de modales gouvernées (Valider / Annuler).

---

## 1. Correctifs appliqués

| Fichier | Flux | Remplacement |
|---------|------|--------------|
| `CommercialDeliveriesPanel.jsx` | Preuve livraison | `QuickInputModal` textarea |
| `CommercialScheduledRelancesPanel.jsx` | Date relance planifiée | `QuickInputModal` date |
| `WorkflowQualityPanel.jsx` | Note validation manuelle workflow | `QuickInputModal` textarea |
| `AlertesCenter.jsx` | Commentaire alerte | `QuickInputModal` textarea |
| `StockFlowPanel.jsx` | Qty mouvement + mode paiement réception | `QuickInputModal` number + select |
| `StockLossFinanceBridge.jsx` | Quantité perte | `QuickInputModal` number |
| `TransformationOfficialForm.jsx` | Dérogation sanitaire | `QuickInputModal` textarea |

Composant partagé : `src/components/QuickInputModal.jsx` (basé sur `BaseModal`).

---

## 2. Dette documentée (legacy)

| Fichier | Statut |
|---------|--------|
| `BpWizard.jsx` | Orphelin — commentaire en tête de fichier ; entrée BP via Objectifs + Investissements |
| `StockLossFinanceBridge.jsx` | Non monté dans `AchatsStockRecoveredModule` — corrigé pour cohérence si réactivé |

---

## 3. Vérification

```bash
# Aucun window.prompt dans src/
rg "window\.prompt" src/

node --test tests/unit/transversalPromptsAudit.test.js
npm run build
```

---

## 4. Modules impactés

- **Commercial** — livraisons + relances planifiées
- **Activité & suivi** — commentaires alertes (via AlertesCenterV3)
- **Achats & stock** — flux stock legacy (StocksV3/V5)
- **Élevage** — dérogation sanitaire transformation
- **Gestion système** — validation workflow qualité

Checklist : ligne « Écarts transverses prompts » → ✅
