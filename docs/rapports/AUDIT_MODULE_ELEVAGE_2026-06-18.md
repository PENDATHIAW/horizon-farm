# Audit module Élevage (`elevage`)

**Date :** 2026-06-18  
**État :** structure **4 onglets** (refonte post-audit juin 2026)

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `ElevageModule.jsx` | Entrée lazy — intent sous-vue Avicole/Animaux | Oui |
| `ElevageRecoveredModule.jsx` | Orchestrateur (~630 lignes) | **Racine** |
| `ElevageLotsBandesTab.jsx` | Onglet 1 — sous-vues Avicole / Animaux | Oui |
| `ElevageCyclesReproductionTab.jsx` | Onglet 2 — cycles + reproduction | Oui |
| `ElevageCyclesPanel.jsx` | Calendrier J+40/J+90, KPIs cycles | Oui (dans Cycles) |
| `ReproductionWorkflowForm.jsx` | Saillie / gestation / mise bas | Oui (dans Cycles) |
| `SanteV8.jsx` | Onglet Santé | Oui |
| `ElevageTransformationTab.jsx` | Onglet Transformation | Oui |
| `ElevageWorkflowPanels.jsx` | Modales aliment / ponte / pesée / mortalité | Oui |
| `ProductionHub.jsx` | Hub production (Lots & bandes) | Oui |
| `AvicoleV10.jsx` / `AnimauxV2.jsx` | Registres lots / animaux | Oui |
| `elevageWorkflow.js` | Moteur commits terrain | Service |
| `elevageVisionHelpers.js` | Score santé, findings IA | Service |
| `elevageIaInsights.js` | Insights coûts / marge | Service |
| `strategicDecisionEngine.js` | Plan cycles marché (Cycles panel) | Service |

**Fichiers legacy non montés** (référence / annexe) : `ElevageSummaryCockpit.jsx`, `ElevageReproductionPanel.jsx` (supprimé), panels Résumé/Graphiques anciens.

---

## 2. Données entrantes depuis `App.jsx`

| Prop | Source | Usage |
|------|--------|-------|
| `initialTab` / `onTabChange` | `elevageTab` | 4 onglets + sous-vue via alias Avicole/Animaux |
| `animaux`, `lots` | CRUD scoped | Registres, cycles, P&L |
| `sante`, `alimentationLogs`, `productionLogs` | CRUD | Santé, workflows |
| `stocks`, `stockMovements` | CRUD | Alimentation, transformation |
| `businessEvents` | CRUD | Traçabilité, reproduction |
| `onNavigate`, `onOpenAssistant` | navigation / Hey Horizon | Liens inter-modules |
| `onCreateTask`, `onCreateAlert` | taches / alertes_center | Workflows |
| `onCreateAlimentation`, `onUpdateStock`, `onCreateStockMovement` | CRUD | Alimentation terrain |
| `onCreateBusinessEvent` | business_events | Événements |

**Fallback interne** : le module utilise `useCrudModule` si props CRUD absentes (`onCreateAnimal`, `onCreateLot`, `onCreateHealth`, `onCreateProduction`, `onCreateDocument`, `onCreateFinanceTransaction`).

---

## 3. Onglets et routes

### Canon (`horizonVision.config.js`)

```
Lots & bandes | Cycles & Reproduction | Santé | Transformation
```

### Sous-vues Lots & bandes

- `Avicole` → sous-onglet avicole (lots, ponte, aliment)
- `Animaux` → sous-onglet bovins/ovins/caprins

Alias legacy (`ELEVAGE_TAB_ALIASES`) : Résumé, Avicole, Animaux, Alimentation, Production, Cycles, Reproduction, Graphiques, Annexe → mappés vers les 4 onglets.

---

## 4. Boutons et destinations (principaux)

| Zone | Action | Destination |
|------|--------|---------------|
| Lots & bandes | Aliment / Ponte / Pesée | Modales `ElevageWorkflowPanels` |
| | Santé | Onglet Santé |
| | Vente | `commercial` → Ventes |
| Cycles | Ouvrir transformation | Onglet Transformation |
| | Centre décisionnel | `centre_ia` → Saisons & marchés |
| | Créer bande (questions) | Formulaire avicole via `emitHorizonForm` |
| Reproduction | Saillie / Gestation / Mise bas | `ReproductionWorkflowForm` |
| Transformation | Abattage / vente | `TransformationOfficialForm` + stock |
| Mobile toolbar | Workflows terrain | Modales |
| Hey Horizon | Questions rapides | Assistant + navigation |

---

## 5. Créations réelles

| Type | Depuis Élevage ? | Mécanisme |
|------|------------------|-----------|
| **Tâche** | Oui | `onCreateTask` / handlers santé |
| **Alerte** | Oui | `onCreateAlert` / santé / cycles |
| **Alimentation** | Oui | `commitElevageFeeding` → `alimentation_logs` + stock |
| **Production œufs** | Oui | `commitElevageEggProduction` → logs + stock |
| **Santé** | Oui | `sante` CRUD |
| **Stock / mouvement** | Oui | `stock`, `stock_movements` |
| **Finance** | Oui | `finances` via workflows |
| **Document** | Oui | transformation / reproduction |
| **Business event** | Oui | mortalité, transformation, reproduction |
| **Vente** | Non direct | Navigation → Commercial (+ garde sanitaire) |
| **Animal / lot** | Oui | `animaux` / `avicole` CRUD |

---

## 6. Moteurs IA / services

| Service | Rôle |
|---------|------|
| `buildElevageHealthSnapshot` | Score santé module, findings |
| `buildElevageCostAwareInsights` | Recos coûts / IC |
| `buildElevageActivityPnl` | P&L par activité |
| `buildProductionHubSnapshot` | Hub production |
| `buildStrategicDecisionPlan` | Fêtes / lancement (Cycles panel) |
| `buildCycleV1Kpis` / `buildCycleOverview` | KPIs cycles |
| `elevageWorkflow.js` | Commits métier (aliment, œufs, pesée, mortalité) |
| `evaluateElevageHealthBlocks` | Blocages sanitaires |
| `blockSanitaryAction` | Garde vente si retrait sanitaire |

---

## 7. Incohérences identifiées

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| E1 | **Critique** | `commitElevageEggProduction` utilisé sans import → crash ramassage œufs | **Corrigé** |
| E2 | Haute | `App.jsx` résolvait `elevageTab` trop tôt → perte sous-vue Avicole/Animaux | **Corrigé** |
| E3 | Moyenne | Liens externes `Cycles` / `Production œufs` / `Alimentation` sans alias explicite | **Corrigé** (alias + liens clés) |
| E4 | Basse | Nombreux liens legacy (`Avicole`, `Résumé`…) dans Vision/Objectifs | OK via `ELEVAGE_TAB_ALIASES` |
| E5 | Basse | `sessionStorage` sous-vue (`horizon:elevage-subview-intent`) peu utilisé | Documenté |
| E6 | Info | Props `onCreateAnimal`/`onCreateLot` absentes de App.jsx | OK — fallback `useCrudModule` |

---

## 8. Correctifs appliqués

1. Import `commitElevageEggProduction` dans `ElevageRecoveredModule.jsx`
2. `App.jsx` — conserve le tab brut pour la navigation externe
3. `navigateElevageTab` dans `commercialNavigation.js`
4. Navigation IA / production / Hey Horizon / carnet / Activité → onglets canoniques
5. Tests `elevageDecisionTabs.test.js` étendus

---

## Vérification

```bash
node --test tests/unit/elevageDecisionTabs.test.js tests/unit/elevageProductionHub.test.js tests/unit/elevageVisionV1.test.js
```
