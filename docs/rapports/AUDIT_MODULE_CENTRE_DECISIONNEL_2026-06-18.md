# Audit module Centre décisionnel (`centre_ia`)

**Date :** 2026-06-18  
**Périmètre :** `src/modules/centre/**`, onglets Vision montés, props `App.jsx`, moteurs IA, créations CRUD, navigation inter-modules.

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté dans le module ? |
|---------|------|------------------------|
| `CentreIA.jsx` | Point d'entrée lazy (`moduleEntryPoints`) | Oui → délègue à `CentreDecisionModule` |
| `CentreDecisionModule.jsx` | Shell : 7 onglets, moteurs, exports, pilotage | **Oui (racine)** |
| `CentreRecommandationsTab.jsx` | Recommandations marge / demande commerciale | Oui (`Recommandations`) |
| `CentreHistoriqueTab.jsx` | Historique décisions + calendrier commercial | Oui (`Historique`, fallback) |
| `CentreSimpleRecoCard.jsx` | Carte reco légère | Oui (via Recommandations) |
| `StrategicDecisionCard.jsx` | Carte décision stratégique (fêtes, vente, BFR…) | Oui (Cycles, Risques) |
| `StrategicQuickActions.jsx` | Boutons Créer tâche / alerte / navigation | Oui |
| `SanitaryVacuumPanel.jsx` | Vide sanitaire & blocages lancement | Oui (Cycles) |
| `PilotageSettingsPanel.jsx` | Réglages fêtes, VIP, ITH | Oui (bandeau permanent) |
| `PilotageContextStrip.jsx` | Bandeau contexte (usage externe) | Non monté ici |
| `DecisionAnnexeTab.jsx` | Méthode, formules, glossaire | Oui (`Annexe`) |
| `CentreOpportunitesTab.jsx` | Opportunités + cycles (ancien assemblage) | **Non — fichier orphelin** |
| `vision/VisionPrioritiesTab.jsx` | Priorités IA + terrain | Oui (`À traiter`) |
| `vision/VisionCyclesTab.jsx` | QUAND lancer (fêtes, BFR, vide sanitaire) | Oui (`Cycles`) |
| `vision/VisionRisksTab.jsx` | QUAND vendre, audit stock, matrice risques | Oui (`Risques`) |
| `vision/VisionDecisionGraphiquesTab.jsx` | Graphiques croisés | Oui (`Graphiques`) |

**Services / utilitaires liés :**

- `strategicDecisionEngine.js` — plan stratégique (vente urgente, lancement, BFR, sanitaire, ITH…)
- `growthDecisionEngine.js` — `buildDecisionCenterPlan` (reco commerciales / croissance)
- `visionUtils` + `buildVisionData` — agrégation priorités, risques, scores
- `strategicAlertBridge.js` — sync auto alertes critiques
- `heyHorizonRecommendationActions.js` — actions one-click IA (tâche, alerte, navigation)
- `visionPriorityActions.js` — création tâche/alerte depuis priorités
- `centreDecisionExport.js` — export Excel / CSV
- `pilotageSettingsService.js` — paramètres fêtes injectés dans `dataMap`
- `decisionMethodology.js` + `annexeNavigation.js` — annexe méthodologique

---

## 2. Données entrantes depuis `App.jsx`

Props injectées au module `centre_ia` :

| Prop | Source CRUD / donnée | Usage |
|------|----------------------|-------|
| `initialTab` / `onTabChange` | État `centreTab` | Onglet actif + persistance navigation |
| `animaux`, `lots`, `cultures`, `stocks` | CRUD scoped ferme | Moteurs stratégiques & vision |
| `clients`, `opportunities` | clients, sales_opportunities | Reco commerciales, BFR VIP |
| `alertes`, `taches`, `documents` | alertes_center, taches, documents | Priorités, déduplication |
| `salesOrders*`, `payments*`, `transactions*` | ventes / finances | Trésorerie, écarts CA |
| `productionLogs`, `alimentationLogs` | production, alimentation | Cycles, consommation aliment |
| `businessPlans`, `investissements` | BP, investissements | Contexte croissance |
| `marketPrices`, `marketCalendarEvents` | dataMap global | Calendrier fêtes |
| `meteo` | `useLiveWeather()` | ITH, stress thermique |
| `dataMap` | `decisionDataMapRaw` | Composition complète décisionnelle |
| `onNavigate` | `setActive` | Navigation inter-modules |
| `onCreateTask` / `onRefreshTasks` | `c.taches` | Création tâches réelles |
| `onCreateAlert` / `onUpdateAlert` / `onRefreshAlertes` | `c.alertes_center` | Création alertes réelles |
| `onCreateBusinessEvent` | `c.business_events` | Marquage « priorité traitée » |
| `onOpenAssistant` | ouvre `AssistantPanel` | **Reçu mais non utilisé dans le module** |
| `existingTasks`, `existingAlerts` | lignes CRUD | Déduplication |

**Manques volontaires (pas de création directe depuis le Centre) :**

- Pas de `onCreateSale`, `onUpdateStock`, `onCreateDocument` — les ventes/stocks/documents passent par navigation + tâches/alertes, ou `applyOneClickRecommendation`.

---

## 3. Onglets, sous-onglets et routes

### Onglets canoniques (`horizonVision.config.js`)

```
À traiter | Recommandations | Cycles | Risques | Historique | Annexe | Graphiques
```

### Contenu par onglet

| Onglet | Composant | Sous-sections |
|--------|-----------|---------------|
| À traiter | `VisionPrioritiesTab` | KPIs, reco IA one-click, priorités terrain, panneaux moteur |
| Recommandations | `CentreRecommandationsTab` | Reco marge/demande (max 6) |
| Cycles | `VisionCyclesTab` | Calendrier fêtes, vide sanitaire, chaleur/ITH, ciseau, transformation, détail lots |
| Risques | `VisionRisksTab` | Urgences vente, audit stock aliment, BFR, matrice IA, risques opérationnels |
| Historique | `CentreHistoriqueTab` | `DecisionHistoryPanel`, `AnnualCommercialCalendarPanel` |
| Annexe | `DecisionAnnexeTab` | Méthode, formules, liens modules |
| Graphiques | `VisionDecisionGraphiquesTab` | Graphiques multi-sources |

### Deep links externes vers `centre_ia`

| Source | Tab demandé | Résolution (après correctif) |
|--------|-------------|------------------------------|
| Dashboard, Hey Horizon, Annexe | `À traiter` | OK |
| Élevage Cycles | `Cycles` | OK |
| Commercial insight | `Opportunités` | → `Cycles` |
| Finance insight | `Performance` | → `Recommandations` |
| Activité / Achats insight | `Risques` | OK |
| Vision Funding | `Efficacité` | → `À traiter` |
| Accueil pilotage « Rentabilité lots » | ancien tab invalide | → `objectifs_croissance` / Rentabilité Lot & Cycle |
| Accueil pilotage « Flux & stocks » | ancien tab invalide | → `centre_ia` / `Risques` |

---

## 4. Boutons et destinations

| Zone | Bouton | Destination / effet |
|------|--------|---------------------|
| En-tête | Exporter Excel / CSV | Fichier local + toast |
| En-tête | Objectifs & Croissance | `objectifs_croissance` / Rentabilité Lot & Cycle |
| Bandeau | Pousser alertes critiques | `syncStrategicAlertsToCenter` → CRUD alertes |
| `StrategicQuickActions` | Créer tâche | `onCreateTask` → table `taches` |
| | Créer alerte | `onCreateAlert` → `alertes_center` |
| | Ouvrir source | `onNavigate` module métier (elevage, finance, achats_stock…) |
| `VisionPrioritiesTab` | Appliquer (IA) | `applyOneClickRecommendation` |
| | Tâche / Alerte / Traité | CRUD ou `business_events` |
| KPI Créances | Clic | `commercial` / Clients & créances |
| KPI Opportunités | Clic | `commercial` / Opportunités |
| `CentreSimpleRecoCard` | Voir module | `commercial` ou `elevage` |
| `CentreRecommandationsTab` | Liens onglets | `onSwitchTab` → Cycles / Risques / Historique |
| `VisionCyclesTab` | Élevage → Cycles | `elevage` / Cycles |
| `VisionRisksTab` | Centre alertes | `activite_suivi` / Alertes |
| Auto (useEffect) | Sync alertes stratégiques | Création silencieuse si plan change |

---

## 5. Créations réelles (tâche, alerte, vente, stock, finance, document)

| Type | Création directe depuis Centre ? | Mécanisme |
|------|----------------------------------|-----------|
| **Tâche** | Oui | `onCreateTask`, `runPriorityTaskAction`, `buildObjectiveActionTask`, one-click IA |
| **Alerte** | Oui | `onCreateAlert`, `runPriorityAlertAction`, `syncStrategicAlertsToCenter` |
| **Business event** | Oui | `onCreateBusinessEvent` (priorité traitée) |
| **Vente** | Non | Navigation → `commercial` ; tâche de suivi opportunité |
| **Stock** | Non | Navigation → `achats_stock` ; reco IA peut créer tâche |
| **Finance** | Non | Navigation → `finance_pilotage` |
| **Document** | Non | Navigation → `documents_rapports` ; one-click peut créer tâche preuve |

---

## 6. Moteurs IA / services

| Service | Fonction | Alimente |
|---------|----------|----------|
| `buildVisionData` | Priorités, risques, scores santé ERP | À traiter, Risques |
| `buildStrategicDecisionPlan` | sellNow, launch, BFR, sanitary, ITH, scissors, transformation | Cycles, Risques, sync alertes |
| `buildDecisionCenterPlan` | Reco croissance / commerciales filtrées | Recommandations |
| `buildVisionBadges` | Compteurs onglets | Badges ModuleTabsBar |
| `syncStrategicAlertsToCenter` | Push alertes auto dédupliquées | alertes_center |
| `applyOneClickRecommendation` | Action terrain depuis finding IA | Priorités IA |
| `mergePilotageIntoDataMap` | Injection réglages fêtes/VIP | Tous moteurs |
| Hey Horizon routes | `heyHorizonAssistantService`, `heyHorizonStrategicAnswers` | Navigation vers Centre |

---

## 7. Incohérences identifiées

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| I1 | Haute | KPI « Opportunités » appelait `setTab('Opportunités')` sans résolution → affichait Historique (fallback) | **Corrigé** → navigation Commercial |
| I2 | Haute | Liens Finance / Dashboard avec tab `Performance` inexistant sur Centre | **Corrigé** → alias `Recommandations` |
| I3 | Haute | Accueil `dashboardHeyHorizon` : tabs `Rentabilité lots`, `Flux & stocks` invalides | **Corrigé** |
| I4 | Moyenne | `setCentreTab` dans `App.jsx` sans `resolveCentreTab` | **Corrigé** |
| I5 | Moyenne | Pas de `onTabChange` sur `centre_ia` (désync état App vs module) | **Corrigé** |
| I6 | Moyenne | `setTab` interne sans alias dans sous-composants | **Corrigé** (wrapper `resolveCentreTab`) |
| I7 | Moyenne | KPI Créances → tab `Clients` au lieu de `Clients & créances` | **Corrigé** |
| I8 | Basse | `CentreOpportunitesTab.jsx` orphelin (doublon VisionCycles + Commercial) | Documenté — pas supprimé |
| I9 | Basse | `onOpenAssistant` passé mais jamais branché dans l'UI Centre | Ouvert — bouton assistant absent |
| I10 | Basse | Sync auto alertes stratégiques au chargement (peut surprendre l'utilisateur) | Comportement voulu + bouton manuel |

---

## 8. Correctifs appliqués (cette PR)

1. **`src/utils/centreDecisionTabs.js`** — `resolveCentreTab` + alias centralisés
2. **`CentreDecisionModule.jsx`** — `setTab` résolu, `onTabChange` propagé
3. **`App.jsx`** — résolution tab à la navigation + `onTabChange`
4. **`VisionPrioritiesTab.jsx`** — KPIs Créances / Opportunités
5. **`dashboardHeyHorizon.js`** — routes pilotage Accueil
6. **`FinanceInsightPanel.jsx`**, **`FinanceRentabilitePanel.jsx`** — lien Centre
7. **`centreDecisionWorkflow.js`** — tab Clients alias
8. **`tests/unit/centreDecisionTabs.test.js`** — non-régression alias

---

## Vérification

```bash
node --test tests/unit/centreDecisionTabs.test.js tests/unit/centreObjectifsWorkflow.test.js
```
