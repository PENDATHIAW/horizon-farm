# Audit module Cultures (`cultures`)

**Date :** 2026-06-18  
**État :** structure **3 onglets** (refonte V1 juin 2026) + sections repliables

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `CulturesRecoveredModule.jsx` | Orchestrateur (~350 lignes) | **Racine** |
| `cultures/CulturesPilotageHub.jsx` | KPI pilotage terrain | Oui (Parcelles) |
| `cultures/CulturesParcellesHub.jsx` | Registre parcelles / cultures | Oui (Parcelles) |
| `cultures/CulturesIntrantsHub.jsx` | Intrants & météo | Oui (repliable) |
| `cultures/CulturesSanteHub.jsx` | Santé & pertes | Oui (repliable) |
| `cultures/CulturesCyclesHub.jsx` | Cycles & campagnes | Oui (repliable) |
| `cultures/CulturesAnnexeTab.jsx` | Documents cultures | Oui (repliable) |
| `cultures/CulturesRecoltesHub.jsx` | Centre récoltes | Oui (Récoltes) |
| `cultures/CulturesHarvestPanel.jsx` | Formulaire récolte canonique | Oui |
| `cultures/CulturesTransformationHub.jsx` | Transformation | Oui (repliable) |
| `cultures/CulturesTransformationPanel.jsx` | Workflow transformation | Oui |
| `cultures/CulturesEconomieHub.jsx` | Économie circulaire / Greenpreneurs | Oui |
| `CulturesV3.jsx` | CRUD parcelles (embedded) | Oui (via hubs) |
| `CulturesWorkflowBridge.jsx` | Événements assistant | Oui |
| `CulturesTabActionsBridge.jsx` | Intrants / pertes (modes) | Oui |
| `culturesWorkflow.js` | Moteur commits métier | Service |
| `cultureSideEffects.js` | Side-effects récolte / intrants | Service |

**Legacy non montés :** `CulturesV2.jsx`, `CulturesV4.jsx`, `CulturesV5.jsx`, `CultureHarvestStockBridge.jsx` — voir `docs/CULTURES_LEGACY_NOTES.md`.

---

## 2. Données entrantes depuis `App.jsx`

| Prop | Source | Usage |
|------|--------|-------|
| `initialTab` / `onTabChange` | `culturesTab` (alias brut conservé) | 3 onglets + sections repliables |
| `rows` / cultures CRUD | `cultures` | Parcelles, récoltes, KPI |
| `stocks`, `stockMovements` | CRUD | Intrants, récolte → stock |
| `opportunities` | `sales_opportunities` | Vente récolte |
| `businessEvents` | CRUD | Traçabilité récolte |
| `transactions`, `salesOrders`, `payments` | CRUD | P&L, ventes cultures |
| `documents`, `clients` | CRUD | Annexe, vente stock |
| `onNavigate`, `meteo` | navigation / météo live | Liens inter-modules |

**Fallback interne :** `useCrudModule` si props CRUD absentes.

---

## 3. Onglets et routes

### Canon (`horizonVision.config.js`)

```
Parcelles & campagnes | Récoltes | Économie circulaire
```

### Sections repliables (alias legacy → ouverture auto)

| Alias | Onglet canonique | Section |
|-------|------------------|---------|
| Intrants & Météo | Parcelles & campagnes | Intrants |
| Santé & Protection | Parcelles & campagnes | Santé |
| Cycles, Campagnes | Parcelles & campagnes | Cycles |
| Annexe | Parcelles & campagnes | Documents |
| Transformation | Récoltes | Transformation |
| Graphiques | Économie circulaire | Graphiques |

---

## 4. Formulaires audités

| Action | Fichier | Validation | Interconnexions |
|--------|---------|------------|-----------------|
| Récolte terrain | `CulturesHarvestPanel` | `validateCultureHarvestForm` | stock, opportunité, `business_events`, finance |
| Transformation | `CulturesTransformationPanel` | `validateCultureTransformationForm` | stock produit fini, events |
| Intrants | `CulturesTabActionsBridge` (mode input) | select culture + stock | `runCultureInputSideEffects` |
| Pertes | `CulturesTabActionsBridge` (mode loss) | select culture | finance + events |
| CRUD parcelle | `CulturesV3` embedded | champs récolte readonly | pas de double saisie récolte |
| Vente récolte | `commitCultureStockSale` | client + stock select | commande, paiement, facture |

Pas de `window.prompt` sur flux métier critiques.

---

## 5. Interconnexions ERP vérifiées

| Flux | Cible |
|------|-------|
| `commitCultureHarvest` | culture MAJ, stock vendable, opportunité, `business_events`, finance |
| `commitCultureStockSale` | `sales_orders`, `payments`, `finances`, stock ↓, culture revenu |
| `commitCultureTransformation` | stock consommé + produit fini, events |
| `runCultureHarvestSideEffects` | sync fiche culture (création / MAJ) |
| Pilotage → liens | Achats & Stock, Commercial, Finance, Smart Farm |
| Greenpreneurs | `CulturesEconomieHub` + métriques circulaires |

---

## 6. Incohérences identifiées

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| C1 | **Haute** | `moduleProjections` lien `Récoltes & stock` (onglet inexistant) | **Corrigé** |
| C2 | **Haute** | `App.jsx` résolvait `culturesTab` trop tôt → perte alias section (Intrants, Transformation…) | **Corrigé** |
| C3 | Haute | Deep-links section sans ouverture `<details>` | **Corrigé** (`resolveCulturesSectionIntent` + refs) |
| C4 | Haute | `annexeNavigation` — parcelle/cultures → Élevage au lieu de Cultures | **Corrigé** |
| C5 | Moyenne | Pas de `navigateCulturesTab` / `navigationOptionsForFinding` cultures | **Corrigé** |
| C6 | Moyenne | Recherche ERP table `cultures` sans cible explicite | **Corrigé** |
| C7 | Basse | Doublon prop `transactions` dans `sharedV3Props` | Documenté (cosmétique) |
| C8 | Info | `culturesTabControl.test.js` requiert JSX loader (hors `node --test`) | Couvert par `culturesV1` + audit nav |

---

## 7. Correctifs appliqués

1. Alias `Récoltes & stock` → `Récoltes` + lien projections corrigé
2. `App.jsx` — conserve l’onglet brut pour navigation externe
3. `CulturesRecoveredModule` — auto-ouverture sections repliables (pattern Achats & Stock)
4. `navigateCulturesTab` + `resolveCulturesSectionIntent` dans `culturesNavigation.js`
5. `navigationOptionsForFinding` / `navigateForIaFinding` — module cultures
6. `annexeNavigation` — cultures/parcelle → module Cultures
7. `SEARCH_KEY_TO_MODULE.cultures` pour recherche ERP

---

## Vérification

```bash
node --test tests/unit/culturesNavigationAudit.test.js
node --test tests/unit/culturesWorkflow.test.js tests/unit/culturesV1.test.js tests/unit/modulesThreeTabs.test.js
```

---

## 8. Passe complète financeur (2026-06-18)

| Contrôle checklist | Résultat |
|--------------------|----------|
| Navigation 3 onglets | ✅ |
| Alias legacy | ✅ |
| Deep-links sections | ✅ |
| Formulaire récolte unique | ✅ |
| Interconnexions stock / commercial / finance | ✅ |
| Pas de prompt métier | ✅ |
