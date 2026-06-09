# Audit ultra-détaillé — Onglet Cycles (Module Élevage)

**Date :** 9 juin 2026  
**Type :** Audit lecture seule — **aucune implémentation, aucune correction**  
**Méthodologie :** Alignée sur l’audit Reproduction (16 axes, matrices, score /100, architecture cible, plan V1)  
**Périmètre :** Onglet **Cycles** d’Élevage + composants cycles montés ou orphelins dans le codebase

---

## Synthèse exécutive

| Indicateur | Valeur |
|------------|--------|
| **Score actuel** | **24 / 100** |
| Hypothèse utilisateur | **Confirmée** — partiellement implémenté, peu connecté, fortement dupliqué |
| Rupture majeure | Split **stratégique** (`VisionCyclesTab`) vs **opérationnel** (`ElevageCyclesPanel` orphelin) |
| Entité métier « cycle » | **Absente** — cycles = calculs dérivés lots/animaux (`date_entree` + J+40/J+90/J+510) |
| Deep-link `productionQuestion` | **Cassé** depuis navigation `elevage` via `App.jsx` (listener absent sur l’onglet monté) |

L’onglet Cycles d’Élevage affiche aujourd’hui une vue **« QUAND LANCER »** (marché, BFR, vide sanitaire, ITH) dont la moitié des blocs est **vide** car `strategicPlan` n’est pas injecté. La vue **opérationnelle** (échéances J+40/J+90, actions rapides, questions production) existe dans `ElevageCyclesPanel.jsx` mais **n’est pas montée** — documentée orpheline dans `docs/ELEVAGE_LEGACY_NOTES.md`.

---

## 0. Cartographie technique

### Montage réel

```
App.jsx (elevage)
  → ElevageModule.jsx → ElevageRecoveredModule.jsx
    tab === 'Cycles' → VisionCyclesTab.jsx
      ├── KPIs strategicPlan (vide si non alimenté)
      ├── StrategicDecisionCard + SanitaryVacuumPanel (handlers absents en Élevage)
      └── <details> → ProductionCycleDecisionPanel (calendrier J+40/J+90/J+510)

CentreDecisionModule.jsx (centre_ia, tab Cycles)
  → VisionCyclesTab.jsx (identique + strategicPlan + onCreateTask/onCreateAlert)
```

### Fichiers clés

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `src/modules/vision/VisionCyclesTab.jsx` | UI stratégique « QUAND LANCER » | Élevage + Centre IA |
| `src/modules/elevage/ElevageCyclesPanel.jsx` | UI opérationnelle complète | **Non** (orphelin) |
| `src/modules/elevage/cycleSummary.js` | Agrégation KPI échéances | Orphelin (via panel) |
| `src/services/productionCycleDates.js` | J+40 chair, J+90 bovins, J+510 pondeuses | Utilisé partout |
| `src/services/productionCyclePlanService.js` | Plans BP + décisions règles | Panel décisionnel |
| `src/services/productionStrategicAnswers.js` | 6 questions « quand lancer » | `ProductionQuestionsPanel` |
| `src/modules/ProductionCycleDecisionPanel.jsx` | Calendrier chair/bovins/pondeuses | Details VisionCyclesTab |
| `src/components/ProductionQuestionsPanel.jsx` | Questions production + listener event | **Orphelin** (panel Élevage) |
| `src/modules/AvicoleCycleHealthPanel.jsx` | Doublon cycles avicole | AvicoleV10 |
| `src/modules/AnimalCycleHealthPanel.jsx` | Doublon cycles bovins | AnimauxV2 |
| `src/modules/ProductionCyclePlanPanel.jsx` | Plan cycles BP détaillé | **Non monté** |
| `src/modules/ActivityCycleGoalsPanel.jsx` | Objectifs BP vs cycles | **Non monté** |
| `src/modules/objectifs/RentabiliteLotCycleTab.jsx` | Rentabilité lot/cycle | Objectifs (pas Cycles) |
| `src/utils/productionNavigation.js` | `launchProductionQuestion` | Services navigation |
| `src/modules/AlertesCenterV2.jsx` | Alertes auto J+40/J+90 | Module Alertes |

### Absence de persistance « cycle »

Aucune table `cycles` / `production_cycles` dans le schéma ERP applicatif. Un « cycle » est une **projection** :

- **Chair** : `date_entree` / `date_debut` du lot + 40 jours
- **Bovins** : date d’entrée animal + 90 jours
- **Pondeuses** : date d’entrée + 510 jours (surveillance réforme)

Source : `buildCalculatedCycleDates` dans `productionCycleDates.js`.

---

## 1. Score actuel : 24 / 100

| Axe | Score /10 | Commentaire |
|-----|-----------|-------------|
| Boutons & actions | 2 | Panel opérationnel orphelin ; boutons stratégiques sans handlers en Élevage |
| Formulaires | 1 | Pas de formulaire « cycle » ; création via lot/animal |
| Workflow métier | 2 | Calculs OK ; clôture / planification / entrée animaux non centralisés |
| Interconnexions | 3 | Navigation partielle ; deep-links cassés ; pas de retour Cycles |
| Doublons | 2 | 4+ surfaces cycles (Avicole, Animaux, Alertes, Dashboard) |
| KPI | 3 | Stratégiques vides ; opérationnels non visibles en Élevage |
| IA | 3 | Règles BP + réponses questions ; pas d’intents voix cycles |
| Voix | 1 | Création lot → Avicole, pas Cycles |
| Caméra | 0 | Aucun usage cycle |
| Documents | 1 | Pas de dossier cycle ; docs lot/animal dispersés |
| Alertes | 4 | Auto dans AlertesCenter ; pas dans onglet Cycles Élevage |
| Notifications | 2 | ERP alertes seulement ; pas WhatsApp/SMS cycles |
| Permissions | 2 | Module `elevage` ; pas granularité cycle |
| Investisseur | 1 | Export Élevage sans section cycles |
| Mobile terrain | 2 | Pas toolbar Cycles ; panel orphelin mieux outillé |
| Design / digestibilité | 4 | Vision cohérente ; état vide frustrant |

**Total pondéré ≈ 24/100** (aligné Reproduction pré-V1 ~22–26).

---

## 2. Audit des boutons

### 2.1 Boutons montés — `VisionCyclesTab` (Élevage > Cycles)

| Bouton | Action attendue | Action réelle | Écran cible | Workflow | Pertinent ? | Verdict |
|--------|-----------------|---------------|-------------|----------|-------------|---------|
| « Élevage → Cycles » (TabIntro) | — | `onNavigate('elevage', { tab: 'Cycles' })` | Même onglet | Re-navigation | Non si déjà dans Élevage | **Redondant** |
| Cartes `StrategicDecisionCard` — Ouvrir / Tâche / Alerte | Créer tâche/alerte ou ouvrir source | Actions via `StrategicQuickActions` | Centre IA, Avicole, Animaux, Finance… | Tâche/alerte ERP | Oui | **Partiel** — `onCreateTask` / `onCreateAlert` **non passés** depuis `ElevageRecoveredModule` → boutons tâche/alerte **inopérants** en Élevage |
| Section vide (pas de `eventLabel`) | Afficher calendrier marché | Section non rendue | — | — | — | **Absent** si `strategicPlan` vide |
| Bannière BFR bloqué | Suspendre lancement | Affichage message | — | — | Oui | **OK** si plan alimenté ; **invisible** sinon |
| `SanitaryVacuumPanel` | Vide sanitaire | Panel + actions | Santé / tâches | Bloquant lancement | Oui | **Partiel** — handlers absents en Élevage |
| `<details>` calendrier lots | Détail J+40/J+90 | Ouvre `ProductionCycleDecisionPanel` | Inline | Lecture calculs | Oui | **OK** (repliable) |
| `ProductionCycleDecisionPanel` — Avicole / Animaux | Ouvrir fiches | `onNavigate('avicole'/'animaux')` | Modules legacy ou hors Élevage | Navigation | Oui | **Partiel** — depuis Élevage devrait `setTab('Avicole')` |
| `EmptyCycle` — Ajouter côté Avicole | Créer lot | `onNavigate('avicole')` | Route legacy `avicole` | — | Oui | **Cassé partiel** — pas retour Élevage |

### 2.2 Boutons orphelins — `ElevageCyclesPanel` (non monté)

| Bouton | Action réelle | Pertinent ? | Verdict |
|--------|---------------|-------------|---------|
| Centre décisionnel → Cycles | `onNavigate('centre_ia', { tab: 'Cycles' })` | Oui | **Manquant** sur onglet actuel |
| + Lot chair | `emitHorizonForm('avicole', 'lot_create', …)` | Oui | **Manquant** — logique métier correcte |
| + Bande pondeuse | idem `lot_create` pondeuse | Oui | **Manquant** |
| + Bovin / embouche | `emitHorizonForm('animaux', 'animal_create', …)` | Oui | **Manquant** |
| Préparer vente | `onNavigate('ventes')` | Oui | **Manquant** |
| Fiches Avicole / Animaux | `setTab` interne Élevage | Oui | **Manquant** |
| PriorityTable « Ouvrir » | `setTab(Transformation/Production)` | Oui | **Manquant** |
| Mortalité → Transformation / Santé | `setTab` | Oui | **Manquant** |
| `ProductionQuestionsPanel` (6 questions) | Sélection question + réponse | Oui | **Manquant** — listener `horizon-production-question` **ici seulement** |
| Analyser (texte libre) | `detectProductionQuestion` | Oui | **Manquant** |
| Ouvrir Élevage / Hey Horizon | Navigation assistant | Oui | **Manquant** |

### 2.3 Synthèse boutons

| Catégorie | Éléments |
|-----------|----------|
| **Morts** | Tâche/alerte stratégique en Élevage Cycles (props non injectées) |
| **Cassés** | `productionQuestion` depuis `App.navigateModule('elevage', …)` — pas de dispatch event (contrairement à `centre_ia`) |
| **Redondants** | « Élevage → Cycles » dans TabIntro ; doublon Avicole/Animaux cycle panels |
| **Manquants** | Créer bande, échéances prioritaires, lien Centre décisionnel, clôturer cycle, décaler date |

---

## 3. Audit des formulaires

**Il n’existe pas de formulaire « cycle » dédié.** La création passe par :

| Formulaire | Module | Champs cycle-relevant | Branché Cycles ? |
|------------|--------|------------------------|----------------|
| `lot_create` / AvicoleBase | Avicole | `date_debut`, `type`, `initial_count`, `duree_cycle_*`, `date_fin_prevue` (legacy V2–V6) | Via `emitHorizonForm` **orphelin** |
| `animal_create` | Animaux | `date`, `espece`, `date_entree_ferme` | Via panel orphelin |
| `poultry_close` / transform | Transformation | Clôture lot | Hub Transformation, pas Cycles |
| BP Wizard | Business plans | `duree_cycle_mois` | BP, pas onglet Cycles |

### Matrice champs métier vs existant

| Champ métier | Présent ? | Où | Auto / hérité ? | Verdict |
|--------------|-----------|-----|-----------------|---------|
| Date démarrage cycle | Partiel | `date_debut` / `date_entree` lot/animal | Saisie manuelle | **Hérité** depuis entrée — pas entité cycle |
| Date fin prévue | Partiel | `date_fin_prevue` Avicole legacy ; calcul J+N sinon | Calcul auto si date entrée | **Devrait être 100 % auto** |
| Type cycle | Implicite | type lot / espèce | Déduit chair/bovin/pondeuse | **OK** via heuristique texte |
| Bande / lot | Oui | lot avicole | — | Source de vérité Avicole |
| Lot (lien) | Oui | id lot | — | OK |
| Espèce | Oui | animaux | — | OK |
| Capacité bâtiment | Non | — | — | **Absent** |
| Objectif production | Partiel | BP `productionCyclePlanService` | Pas lié fiche cycle | **Absent** terrain |
| Destination commerciale | Non | — | Opportunités ventes | **Absent** sur cycle |
| Bâtiment / atelier | Partiel | Avicole champs atelier | — | Pas dans Cycles |
| Statut cycle (planifié/actif/clôturé) | Non | statut lot/animal | — | **Absent** |

### Champs inutiles / à supprimer (vision cible)

- Saisie manuelle `date_fin_prevue` si `date_entree` + règle J+N existe (doublon Avicole V2–V6).
- KPI « Décisions IA » sans action (panel orphelin) si non relié à tâche.

### Validations

- Pas de validation « cycle » ; validations lot (effectif > 0, date début requise) dans AvicoleBase.
- Mortalité > seuil : alerte amber dans `cycleSummary` (4 %) — pas bloquant création.

---

## 4. Audit métier — Workflow

### Workflow cible

```
Planification (marché, BFR, vide sanitaire)
    ↓
Création cycle / bande (lot ou animal + date entrée)
    ↓
Entrée animaux (effectif, pesée, achat sujets)
    ↓
Suivi croissance (alimentation, pesée, mortalité)
    ↓
Production (œufs / ponte / prêt vente chair)
    ↓
Transformation ou vente
    ↓
Clôture cycle
```

### Workflow actuel

```
Planification stratégique → Centre IA Cycles (strategicPlan) OU questions BP (orphelin)
    ↓
Création → Avicole/Animaux (hors onglet Cycles monté)
    ↓
Calcul dates → productionCycleDates (lecture seule dans details)
    ↓
Suivi → Avicole/Animaux/Alimentation/Santé (dispersé)
    ↓
Production → Hub Production (œufs)
    ↓
Vente → Commercial / Transformation
    ↓
Clôture → workflows transform / poultry_close (pas depuis Cycles)
```

### Ruptures identifiées

| # | Rupture | Gravité |
|---|---------|---------|
| R1 | Pas de centre opérationnel monté en Élevage | Critique |
| R2 | Planification stratégique vide en Élevage | Critique |
| R3 | Pas de lien « date pivot marché » → création lot datée | Haute |
| R4 | Clôture cycle non accessible depuis Cycles | Haute |
| R5 | Pas de décalage date / replanification | Haute |
| R6 | Entrée animaux post-création bande non guidée | Moyenne |
| R7 | Objectif production non suivi vs réalisé dans Cycles | Moyenne |

---

## 5. Audit interconnexions

| Flux | Source → Destination | Statut | Ressaisie ? |
|------|----------------------|--------|-------------|
| Lot chair → vente J+40 | Avicole date_entree → Cycles calcul → Alertes / Commercial | **Partiel** | Non si date OK |
| Bovin → vente J+90 | Animaux → calcul → Alertes | **Partiel** | Idem |
| Pondeuse → réforme | Avicole + production logs → plan ponte | **Partiel** | Ponte saisie Avicole/Production |
| Cycles → créer lot | ElevageCyclesPanel → form lot | **Absent** (panel orphelin) | — |
| Dashboard → question bande | `launchPilotageSuggestion` + event manual | **Partiel** | Event OK si dashboard ; App elevage non |
| Assistant → Cycles | `heyHorizonAssistantService` redirect | **Partiel** | `lot_profitability` → elevage Cycles |
| Cycles → Alimentation | Liens panel orphelin / Avicole | **Absent** onglet monté | — |
| Cycles → Santé | SanitaryVacuumPanel | **Partiel** Centre IA seulement | — |
| Cycles → Production | PriorityTable → Production | **Absent** onglet monté | — |
| Cycles → Transformation | Panel orphelin | **Absent** onglet monté | — |
| Cycles → Commercial | ventes navigate | **Absent** onglet monté | — |
| Cycles → Finance | BFR strategicPlan | **Partiel** Centre IA | — |
| Cycles → Documents | — | **Absent** | — |
| Cycles → Assistant | ProductionQuestionsPanel | **Absent** onglet monté | — |
| Multi-fermes | `farm_id` sur logs | **Partiel** | Filtre ferme global module ; pas UI cycle |
| Centre IA ↔ Élevage | VisionCyclesTab partagé | **OK** contenu ; **split** expérience | — |

---

## 6. Audit doublons

| Donnée / fonction | Où aussi | Conserver | Déplacer | Supprimer |
|-------------------|----------|-----------|----------|-----------|
| Échéances J+40/J+90 | AvicoleCycleHealthPanel, AnimalCycleHealthPanel, AlertesCenter, ElevageCyclesPanel | **1 source** `productionCycleDates` | Vue unifiée **Cycles Élevage** | Panels santé cycle en Avicole/Animaux → lien Cycles |
| KPI lots actifs / retard | Panel orphelin, Avicole panel | Cycles opérationnel | — | Doublon tables Avicole/Animaux |
| Questions « quand lancer » | ProductionQuestionsPanel, strategic answers | Cycles + Centre IA | — | — |
| Plan BP cycles | productionCyclePlanService, ProductionCyclePlanPanel (orphelin), ActivityCycleGoalsPanel (orphelin) | Service + 1 UI | Objectifs ou Cycles | Panels orphelins non montés |
| Rentabilité lot/cycle | RentabiliteLotCycleTab (Objectifs) | Objectifs | Lien depuis Cycles | — |
| Calendrier marché / fêtes | VisionCyclesTab, Centre IA | Centre IA stratégique | Synthèse 1 ligne Cycles | — |
| Lifecycle historique | Avicole/Animaux collapsible | Animaux/Avicole | — | Pas dupliquer dans Cycles |

**Source de vérité cible :**

- **Dates opérationnelles** : `productionCycleDates.js` + fiches lot/animal
- **Planification stratégique** : `strategicDecisionEngine` → Centre IA (+ synthèse Élevage)
- **UI opérationnelle** : onglet Cycles Élevage (panel fusionné)

---

## 7. Audit KPI

### KPI actuels visibles (Élevage > Cycles monté)

| KPI | Utile ? | Fiable ? | Terrain ? | Verdict |
|-----|---------|----------|-----------|---------|
| Dates pivot marché (count) | Oui | Si strategicPlan | Avancé | **OK** Centre IA ; vide Élevage |
| ITH actuel | Oui | Météo | Oui | **OK** si météo |
| Couverture BFR | Oui | Finance | Direction | **OK** si plan |
| Blocages vide sanitaire | Oui | Règles | Oui | **OK** si plan |
| (details) Chair / bovins / pondeuses | Oui | Calcul dates | Oui | **OK** mais replié |

### KPI orphelins (`ElevageCyclesPanel`)

| KPI | Verdict |
|-----|---------|
| Lots actifs, animaux actifs | Utile — **manquant** monté |
| Échéances ≤10 j, En retard | **Critique terrain** — manquant |
| Prochaine échéance | Manquant |
| Pondeuses actives | Doublon Avicole |
| Décisions IA (count) | Peu actionnable sans lien tâche |

### KPI définitifs proposés (max 6 visibles)

1. **Échéances ≤ 10 j** (chair + bovins + réforme)
2. **Cycles en retard** (count + plus ancien)
3. **Prochaine sortie** (date + filière)
4. **Lots actifs / effectif** (chair + pondeuses)
5. **Taux ponte 7 j** (pondeuses — lien production)
6. **Blocage lancement** (BFR ou vide sanitaire — 1 indicateur agrégé)

**Repliables :** ITH, dates pivot marché détail, décisions BP, MCA lot, palmarès fournisseurs.

### Faux KPI / risques

- « Dates pivot marché » = count décisions avec `eventLabel` — incompréhensible sans libellé fête.
- J+510 réforme pondeuse = **surveillance** pas échéance vente — peut être lu comme « vente ».

---

## 8. Audit IA

| Usage | Entrée | Sortie | Valeur | Existant |
|-------|--------|--------|--------|----------|
| Prévision fin cycle | date_entree, type | targetDate J+N | Haute | **Calcul** (pas ML) |
| Retard croissance | pesées, age | alerte prêt vente Avicole | Moyenne | AvicoleBase, pas Cycles |
| Prévision vente | cycles + BP | ramp chair/bovins | Haute | `productionCyclePlanService` |
| Risque sanitaire | historique lot + vide sanitaire | blocking sanitary | Haute | strategicPlan |
| Recommandation chargement bâtiment | capacité | — | Haute | **Absent** |
| Prévision rentabilité | coûts unifiés | marge lot | Haute | Objectifs / P&L, pas Cycles |
| Réforme pondeuse | ponte 14 j | reformRule | Haute | plan pondeuses |
| Rupture œufs | production + objectif | egg_gap answer | Haute | `productionStrategicAnswers` |
| Autonomie aliment | stocks + logs | feed_autonomy | Moyenne | idem |

**Principe :** L’IA conseille via règles + BP — **pas de validation automatique** de création lot (correct).

**Manques :** intents voix cycles ; pas de score confiance unifié sur onglet monté.

---

## 9. Audit voix

| Commande terrain | Action ERP attendue | Existant |
|------------------|---------------------|----------|
| « Créer un nouveau cycle chair » | Ouvrir Cycles + draft lot chair daté | `poultry_lot_creation` → **Avicole**, pas Cycles |
| « Décaler le cycle 3 de deux semaines » | Modifier date entrée / replanifier | **Absent** |
| « Prévoir la sortie du lot 15 » | Afficher échéance + tâche commercial | **Absent** |
| « Afficher les cycles en retard » | Filtre Cycles retard | **Absent** |
| « Quand lancer une bande pondeuse ? » | productionQuestion `new_layer_band` | Dashboard dispatch event ; **Élevage App.jsx non** |
| « Quand réformer le lot ? » | `reform_lot` | Assistant redirect partiel |

---

## 10. Audit caméra

| Usage | Utilité | Gain terrain | Module | Existant |
|-------|---------|--------------|--------|----------|
| Scan bâtiment | Identifier atelier capacité | Moyen | Avicole / SmartFarm | **Absent** Cycles |
| Scan lot / QR bande | Ouvrir fiche lot + échéance | Élevé | Avicole | QR animal repro seulement |
| Scan QR cycle | — | — | — | **Absent** (pas d’entité) |
| Photo état bâtiment | Preuve vide sanitaire | Moyen | Documents | **Absent** lien Cycles |

---

## 11. Audit documents

| Type | Stockage | Visible Cycles ? | Lié ? |
|------|----------|------------------|-------|
| Plan de bande | Documents module | Non | Lot si upload manuel |
| Rapport technique cycle | — | Non | **Absent** |
| Contrat commercial sortie | Commercial / Documents | Non | Partiel ventes |
| Dossier investisseur | `elevageExport` PDF | Résumé sans cycles | **Absent** section cycles |
| Certificat sanitaire clôture | Santé / Documents | Non | Transformation |

---

## 12. Audit alertes

### Existantes (hors onglet Cycles)

| Alerte | Déclencheur | Priorité | Destination |
|--------|-------------|----------|-------------|
| Lot chair prêt vendre | J+40 ±2j | warning/critique | AlertesCenter auto |
| Bovin prêt vendre | J+90 ±2j | idem | AlertesCenter |
| Pondeuses surveiller | J+510 ±2j | warning | AlertesCenter |
| BFR bloqué lancement | strategicPlan | haute | Centre IA sync |
| Vide sanitaire bloquant | sanitary.blocking | critique | Centre IA |

### Manquantes (devrait exister)

| Alerte | Déclencheur | Priorité | Destination |
|--------|-------------|----------|-------------|
| Cycle en retard > N j | targetDate < today | critique | Cycles + Alertes |
| Bâtiment surchargé | effectif > capacité | haute | Cycles |
| Mortalité excessive cycle | mortalité ≥ 8 % | haute | Cycles → Santé |
| Objectif production non atteint | ponte vs BP | moyenne | Cycles |
| Sortie prévue J+3 | échéance | moyenne | Cycles + WhatsApp ? |
| Contrat à honorer | commande + date cycle | haute | Commercial → Cycles |

**Onglet Cycles Élevage :** aucune alerte native affichée.

---

## 13. Audit notifications

| Canal | Existant cycles | Manquant |
|-------|-----------------|----------|
| ERP Alertes | Auto J+40/J+90 via AlertesCenter | Badge onglet Cycles Élevage |
| ERP Tâches | Via StrategicQuickActions (Centre IA) | Élevage Cycles |
| WhatsApp | — | Échéances sortie, retard |
| Email | — | Synthèse hebdo cycles |
| SMS | — | Urgences mortalité / retard |
| Assistant ERP | Redirect + questions | Listener productionQuestion Élevage |

---

## 14. Audit permissions

Matrice actuelle (granularité **module**, `ROLE_PERMISSIONS` — pas d’action « cycle »).

| Action | Lecteur (visiteur) | Opérateur (employé) | Resp. élevage (manager) | Admin |
|--------|-------------------|---------------------|-------------------------|-------|
| Voir Cycles Élevage | Non (pas elevage) | Non | Oui | Oui |
| Créer lot/animal (≈ cycle) | Non | Avicole/Animaux si modules | Oui | Oui |
| Modifier date entrée | — | Oui si CRUD | Oui | Oui |
| Clôturer cycle | — | Transform workflows | Oui | Oui |
| Annuler cycle | — | Non explicite | Oui | Oui |
| Changer objectif BP | — | Non | Objectifs | Oui |
| Créer alerte/tâche cycle | — | Non Cycles Élevage | Centre IA | Oui |

**Écart :** pas de permission « cycles » dédiée ; veterinaire/comptable sans Élevage ne voient pas Cycles.

---

## 15. Audit investisseur

| Question investisseur | Compréhensible ? | Source actuelle |
|-----------------------|------------------|-----------------|
| Nombre de cycles | Non | Pas de compteur « cycles » |
| Performance cycles | Partiel | Objectifs, P&L activité |
| Rentabilité cycles | Partiel | RentabiliteLotCycleTab |
| Respect planning | Faible | Calcul dates vs ventes réelles non consolidé |
| Prévisions production | Partiel | BP + plan service |

**Indicateurs absents :** pipeline sorties 90 j, taux respect J+40/J+90, marge par cycle terminé, export PDF section Cycles.

---

## 16. Audit mobile terrain

| Critère | Élevage Cycles monté | Panel orphelin |
|---------|---------------------|----------------|
| Taille boutons | TabIntro seul | Action cards ≥ 44px |
| Ergonomie tactile | Details summary petit | Grille actions OK |
| Rapidité saisie | Pas d’actions création | emitHorizonForm direct |
| Visibilité terrain | KPI stratégiques abstraits | Échéances tableau |

**Corrections proposées :** monter actions rapides ; KPI retard en premier ; `ElevageMobileToolbar` sans entrée Cycles.

---

## 17. Design et digestibilité

| Critère | Évaluation |
|---------|------------|
| Surcharge visuelle | Modérée si plan vide → sections vides frustrantes |
| Longueur écran | Long si tout strategicPlan rempli ; details repliable OK |
| Lisibilité | Palette Dashboard V3 / Élevage cohérente |
| Cohérence Dashboard V3 | VisionKpi aligné |
| Cohérence Élevage V1 | Split avec hubs opérationnels (Production, Reproduction V1) — **Cycles en retard** |

### Architecture cible UI (validée audit)

```
Élevage > Cycles
├── Bandeau 6 KPI (opérationnel)
├── Alerte synthèse (retard, mortalité, blocage)
├── Actions rapides (créer bande, bovin, vente)
├── Échéances 30 j (tableau prioritaire)
├── Bloc stratégique repliable (marché, BFR, vide sanitaire) — lien Centre IA
├── Questions production (6 + texte libre)
└── Calendrier détaillé (ProductionCycleDecisionPanel)
```

---

## 18. Risques critiques

| ID | Risque | Impact |
|----|--------|--------|
| C1 | Panel opérationnel orphelin | Terrain sans échéances ni création bande depuis Cycles |
| C2 | `strategicPlan` vide en Élevage | Onglet « vide » pour utilisateur standard |
| C3 | `productionQuestion` cassé via App elevage | Dashboard / navigation incohérente |
| C4 | 4 surfaces cycles divergentes | KPI différents Avicole vs Cycles vs Alertes |
| C5 | Pas de clôture cycle centralisée | Lots « actifs » fantômes, dates retard |
| C6 | Investisseur sans vision pipeline | Décision finance sans export cycles |

---

## 19. Architecture cible validée (figée — pré développement)

### Principes

1. **Pas de table `cycles` en V1** — cycle = lot/animal + règles J+N + statut workflow.
2. **Une UI Élevage** — fusion `ElevageCyclesPanel` + synthèse `VisionCyclesTab`.
3. **Stratégique complet** — Centre IA ; Élevage affiche synthèse + lien « Ouvrir Centre décisionnel ».
4. **Listener** `horizon-production-question` au niveau `ElevageRecoveredModule` (comme reproduction `horizon-open-form`).
5. **App.jsx** — dispatch `productionQuestion` aussi pour `elevage`.
6. **Réduire doublons** — Avicole/Animaux cycle panels → lien « Voir dans Cycles ».
7. **Alertes** — badge onglet + synthèse ; sync existante AlertesCenter conservée.

### Composants cibles

| Composant | Rôle |
|-----------|------|
| `ElevageCyclesPanel` (étendu) | Shell onglet Cycles Élevage |
| `productionCycleDates.js` | Source dates opérationnelles |
| `strategicDecisionEngine` | Plan stratégique (Centre IA) |
| `productionStrategicAnswers.js` | Questions production |
| `cycleSummary.js` | KPI agrégés |

---

## 20. Plan V1 Cycles (15 actions — sans implémentation)

| ID | Action | Priorité |
|----|--------|----------|
| V1-01 | Monter `ElevageCyclesPanel` (ou fusion) comme contenu onglet Cycles Élevage | P0 |
| V1-02 | Injecter synthèse stratégique (4 KPI + lien Centre IA) — pas full strategicPlan | P0 |
| V1-03 | Passer `onCreateTask`, `onCreateAlert`, handlers depuis `ElevageRecoveredModule` | P0 |
| V1-04 | Listener `horizon-production-question` parent Élevage | P0 |
| V1-05 | `App.jsx` : dispatch `productionQuestion` pour `elevage` | P0 |
| V1-06 | Tableau échéances 30 j visible par défaut (pas seulement details) | P0 |
| V1-07 | Actions rapides : lot chair, pondeuse, bovin, vente | P0 |
| V1-08 | Badge onglet Cycles (retard + échéances) | P1 |
| V1-09 | Section export investisseur « Pipeline cycles » dans `elevageExport` | P1 |
| V1-10 | Intents voix : cycles retard, question bande, prévoir sortie | P1 |
| V1-11 | Avicole/Animaux : remplacer cycle health panel par lien Cycles | P2 |
| V1-12 | Lien date pivot marché → `emitHorizonForm` lot daté | P2 |
| V1-13 | Workflow clôture depuis ligne échéance (transform) | P2 |
| V1-14 | Tests unitaires `cycleSummary` + navigation productionQuestion | P1 |
| V1-15 | Documenter règle J+510 vs réforme ponte réelle (UX) | P2 |

---

## 21. Matrices consolidées (référence rapide)

### Interconnexions — statut global

| Module | OK | Partiel | Absent | Doublon |
|--------|-----|---------|--------|---------|
| Animaux | 1 | 2 | 2 | 1 |
| Avicole | 1 | 2 | 1 | 1 |
| Alimentation | 0 | 1 | 2 | 0 |
| Santé | 0 | 2 | 1 | 0 |
| Production | 0 | 2 | 1 | 1 |
| Transformation | 0 | 1 | 2 | 0 |
| Commercial | 0 | 2 | 1 | 0 |
| Finance | 0 | 2 | 1 | 0 |
| Documents | 0 | 0 | 3 | 0 |
| Assistant ERP | 0 | 3 | 1 | 0 |
| Multi-fermes | 0 | 2 | 1 | 0 |

### Verdict hypothèses utilisateur

| Hypothèse | Verdict |
|-----------|---------|
| Partiellement implémenté | **Confirmé** — calculs OK, UI opérationnelle orpheline |
| Peu connecté ERP | **Confirmé** — handlers, events, clôture absents |
| Doublon Animaux/Production/Commercial | **Confirmé** — panels + alertes + objectifs |
| Doublon Reproduction | **Non** — reproduction = événements ; cycles = temporalité lot |
| Doublon Dashboard | **Partiel** — liens OK, question production fragile |

---

## 22. Fichiers à ne pas étendre sans migration canonique

- `ElevageCyclesPanel.jsx` — étendre **après** montage officiel, pas en parallèle de VisionCyclesTab
- `VisionCyclesTab.jsx` — fusionner ou réduire à bloc stratégique repliable
- `AvicoleV2`–`V9` — ne pas ajouter champs cycle legacy

---

## 23. Références code

Montage onglet Cycles Élevage (sans handlers stratégiques) :

```505:512:src/modules/ElevageRecoveredModule.jsx
  const content = tab === 'Cycles' ? (
    <VisionCyclesTab
      dataMap={{ ...props.dataMap, animaux: animals, lots, production_oeufs_logs: productionLogs, alimentation_logs: feedLogs, stock: stocks }}
      lots={lots}
      animaux={animals}
      productionLogs={productionLogs}
      onNavigate={props.onNavigate}
    />
```

Navigation `elevage` sans `productionQuestion` :

```72:76:src/App.jsx
    if (resolved === 'elevage') {
      setElevageTab(resolveElevageTab(tab || defaultTabForLegacyModule(moduleId) || 'Résumé'));
      trackNavOpen('elevage');
      setActiveState('elevage');
      return;
```

Listener questions production (panel orphelin uniquement) :

```33:40:src/components/ProductionQuestionsPanel.jsx
  useEffect(() => {
    const handler = (event) => {
      const id = event.detail?.questionId;
      if (id) setSelectedId(id);
    };
    window.addEventListener('horizon-production-question', handler);
    return () => window.removeEventListener('horizon-production-question', handler);
  }, []);
```

Orphelin documenté :

```30:30:docs/ELEVAGE_LEGACY_NOTES.md
| `ElevageCyclesPanel.jsx` | Orphelin | `VisionCyclesTab` |
```

---

**Fin du livrable audit — aucune modification applicative requise pour ce document.**
