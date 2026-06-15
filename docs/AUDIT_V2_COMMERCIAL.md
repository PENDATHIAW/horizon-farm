# Audit v2 — Module Commercial

**Date :** 2026-06-09  
**Branche :** `cursor/erp-audit-kpi-alignment-ac42`  
**Périmètre :** module `commercial` — 6 onglets consolidés

---

## 1. Structure réelle (6 onglets)

| Onglet | Composants principaux | Rôle |
|--------|----------------------|------|
| **Ventes** | `VentesV5` → wizard terrain, quick actions | CRUD commandes, devis, encaissements |
| **Opportunités** | `CommercialOpportunitiesPanel`, auto-opportunités stock/culture/lot | Conversion → vente préremplie |
| **Clients & créances** | `ClientsReadable`, segments, prospects, relances planifiées | Fiches clients + relances (ex-Relances) |
| **Livraisons** | `CommercialDeliveriesPanel` | File livraisons, preuves |
| **Abonnements** | `CommercialSubscriptionsPanel` | Abonnements récurrents |
| **Pilotage** | Summary KPI, pilotage marge, glossaire, annexe graphiques | Tableau de bord dirigeant (ex-Résumé + Graphiques + Annexe) |

**Alias legacy** (`commercialNavigation.js`) : `Résumé` → Pilotage, `Clients`/`Relances` → Clients & créances, `Graphiques`/`Annexe` → Ventes ou Pilotage selon contexte.

---

## 2. Parcours audité par onglet

### Ventes
- Formulaire : `source_type` + `source_id` (lot avicole, animal, stock, culture) — pas de `lot_id` séparé
- Workflow : `commercialSaleWorkflow` → paiements via `recordSalePayment`
- Sync paiements : panneau audit (phase B PR)

### Opportunités
- Matching stock/culture/lot/animal
- Conversion : `buildSaleFormFromOpportunity` → onglet Ventes

### Clients & créances
- Créances agrégées, segments, relances WhatsApp planifiées
- Panneau relances (ex-onglet Relances dédié)

### Livraisons
- Queue livraisons, statuts, lien commandes

### Abonnements
- Préparation commandes récurrentes

### Pilotage
- KPI tiles (CA, encaissé, créances…) — **période** quand filtre actif
- Objectifs commercial, produits rentables, clients stratégiques
- `MarginGlossaryPanel`
- Annexe repliable : documents + `ModuleGraphiquesTab`

---

## 3. Cohérence chiffres (Période vs Cumul)

| Élément | Périmètre filtre actif | Périmètre sans filtre |
|---------|------------------------|------------------------|
| KPI tiles Summary | Période (`headlineKpis`) | Cumul |
| Badge header créances | Période (aligné tiles) | Cumul |
| Badges onglets (commandes ouvertes, dettes) | Cumul | Cumul |
| Pilotage objectifs / marges | Période si filtre actif | Cumul |
| Top clients Summary | Période | Période (commandes filtrées) |

---

## 4. Anomalies corrigées (cette session)

| # | Problème | Correction |
|---|----------|------------|
| C1 | Objectifs Pilotage toujours à 0 (`buildMonthlyTargetAttainment` retourne un tableau, pas `{ month }`) | `buildAttainmentKpis` dans `commercialPilotageMetrics.js` |
| C2 | Clic KPI CA/Encaissé/Panier → onglet Graphiques (alias → Ventes) | Clic → **Pilotage** |
| C3 | Clic créances → `Clients` (alias) | Clic → **Clients & créances** |
| C4 | Copy « onglet Relances / Résumé » obsolète | Textes mis à jour |
| C5 | Hey Horizon / startup journey : onglets legacy | Onglets canoniques |
| C6 | Opportunités : historique ventes sur période seule | `ordersAll` pour matching |
| C7 | Pilotage ignorait filtre période | `periodFiltered` propagé |
| C8 | Tests `commercialUxAntiDuplication` — modèle 10 onglets | Alignés sur 6 onglets |
| C9 | `App.jsx` default `commercialTab` = Résumé | **Pilotage** |

---

## 5. Anomalies ouvertes

| # | Anomalie | Priorité |
|---|----------|----------|
| O1 | Devis + réconciliation encore dans Summary Pilotage (cible : Ventes / lien Finance) | Moyenne |
| O2 | Badges onglets (commandes ouvertes) restent en cumul même avec filtre période | Basse |
| O3 | `resolveCommercialTab('reconciliation')` → Ventes (redirect Finance uniquement via `App.navigateModule`) | Basse — documenté |
| O4 | Rapport HTML `AUDIT_MODULE_COMMERCIAL_2026-06-09.html` — 10 onglets obsolètes | Basse |

---

## 6. Fichiers modifiés

- `src/utils/commercialPilotageMetrics.js`
- `src/modules/CommercialRecoveredModule.jsx`
- `src/modules/commercial/CommercialPilotagePanel.jsx`
- `src/modules/commercial/CommercialShell.jsx`
- `src/modules/commercial/CommercialRelancesTeaser.jsx`
- `src/utils/commercialHeyHorizon.js`
- `src/utils/commercialStartup.js`
- `src/App.jsx`
- `tests/unit/commercialUxAntiDuplication.test.js`
- `tests/unit/commercialAudit.test.js`

---

## 7. Vérification

```bash
npm run build
npx vite-node tests/unit/commercialAudit.test.js
npx vite-node tests/unit/commercialUxAntiDuplication.test.js
npx vite-node tests/unit/commercialModuleTabsRegression.test.js
```

---

## 8. Prochaine étape audit v2

Module **Finance** (5 onglets + sous-vues Trésorerie / Pilotage).
