# Audit complémentaire — Cycles multi-fermes

**Date :** 9 juin 2026  
**Type :** Lecture seule — aucune implémentation  
**Périmètre :** Comportement de l’onglet Cycles et services cycles sous `farmScope` global

---

## 1. Filtrage des cycles par `farmScope`

Les composants Cycles **ne filtrent jamais eux-mêmes** par ferme. Ils consomment les tableaux `lots`, `animaux`, `productionLogs` déjà passés en props.

### Chaîne de filtrage (amont)

| Couche | Mécanisme |
|--------|-----------|
| `App.jsx` | `applyFarmScopeToProps(moduleProps, farmScope, …)` sur le module actif |
| `applyFarmScope.js` | Filtre `lots`/`avicole`, `animaux`, logs liés (`alimentation_logs`, `production_oeufs_logs` via `lot_id`), `sante` via `animal_id` |
| `productionCycleDates.js` / `cycleSummary.js` | Aucune notion de `farm_id` — calcul sur les lots/animaux fournis |
| `VisionCyclesTab` / `ElevageCyclesPanel` | Aucun filtre local |

### Conditions d’activation du filtre

- **Mode « Toutes les fermes »** (`scope.mode === 'all'`) : **aucun filtrage** — toutes les lignes sont conservées → cycles **consolidés groupe**.
- **Mode ferme unique** : filtrage **uniquement si** `isFarmScopeFilteringEnabled()` est vrai (`VITE_ENABLE_FARM_FILTER=true` ou `forceFilter` en tests). **Par défaut en prod, le filtre est désactivé** : le sélecteur ferme peut afficher une ferme, mais les données Cycles restent **toutes fermes**.
- **Lignes sans `farm_id`** : en mode ferme unique avec filtre actif, `isRowInFarmScope` retourne `true` → données **legacy rattachées à toutes les fermes** (fuite cross-ferme).
- **Logs sans `farm_id`** : filtrés via parent `lot_id` / `animal_id` ; si le parent n’a pas `farm_id`, la ligne peut être **exclue** (`filterLotLinkedRows` → `false`).

**Verdict :** pas de `farmScope` natif dans Cycles ; dépendance totale sur `applyFarmScope`, souvent inactive ; risque **UI ferme ≠ données affichées**.

---

## 2. KPI Cycles — par ferme, consolidés ou mixtes ?

| Contexte `farmScope` | Filtrage actif ? | KPI Cycles (monté + orphelin) |
|----------------------|------------------|-------------------------------|
| Ferme A sélectionnée | Non (défaut) | **Consolidé** toutes fermes — **mixte trompeur** |
| Ferme A sélectionnée | Oui | **Par ferme A** (lots/animaux filtrés) |
| Toutes les fermes | — | **Consolidé** — sommes/agrégats **sans ventilation** |
| Centre IA Cycles | Idem selon props | Stratégique (BFR, ITH) sur dataMap **non ventilée par ferme** dans le moteur |

KPI stratégiques (`VisionCyclesTab`) : count dates pivot, ITH, BFR, vide sanitaire — **pas de label ferme**, pas de breakdown.

KPI opérationnels orphelins (`ElevageCyclesPanel` / `cycleSummary`) : lots actifs, retards, échéances — **agrégats globaux** sur le slice passé, sans colonne ferme.

**Verdict :** **mixtes et incohérents** — consolidés en pratique (mode all + filtre off) ; par ferme seulement si filtre Phase 2 activé + ferme unique ; **jamais « par ferme + consolidé » simultanément dans l’UI Cycles**.

---

## 3. Échéances — filtrage correct ?

Échéances = `buildCalculatedCycleDates({ lots, animaux })` → `targetDate` = entrée + J+40 / J+90 / J+510.

- **Correctement filtrées** si et seulement si `lots` et `animaux` en amont sont filtrés.
- **Non filtrées par défaut** (filtre global off).
- **Mode toutes fermes** : échéances **toutes fermes mélangées** ; libellés = nom lot/animal **sans ferme**.
- **Legacy sans `farm_id`** : inclus dans la ferme sélectionnée quand filtre actif → **pollution**.
- `productionLogs` pour plan pondeuses : filtrage lot-lié si filtre actif ; sinon mélangé.

**Verdict :** filtrage **indirect et fragile** ; pas de garde-fou dans la couche Cycles.

---

## 4. Alertes — filtrage correct ?

### Alertes auto cycles (`AlertesCenterV2.buildPreventiveAlerts`)

- Calculées sur `props.lots` / `props.animaux` du module Alertes (filtrés comme autres modules si `applyFarmScope` actif).
- Titres : « Lot chair prêt à vendre : {label} » — **pas de nom de ferme**.
- `entity_id` = lot/animal ; `module_source` avicole/animaux — pas `farm_id` sur l’alerte auto.

### Alertes stockées (`alertes_center`)

- Filtrées par `farm_id` si présent sur l’alerte et filtre actif.
- Alertes auto générées en mémoire : **pas de `farm_id`** explicite dans le payload cycle.

### Alertes stratégiques Centre IA (`syncStrategicAlertsToCenter`)

- Pas de ventilation ferme dans la signature de sync.

### Onglet Cycles Élevage

- **Aucune alerte affichée** (handlers absents).

**Verdict :** filtrage **partiel** — slice lots/animaux OK si filtre global ON ; alertes cycle **non étiquetées ferme** ; consolidation Alertes en mode all ; **pas d’alertes dans Cycles**.

---

## 5. Exports investisseurs — distinction des fermes ?

`buildElevageInvestorReport` / export PDF Résumé Élevage :

- Paramètre `farmLabel` = `props.activeFarm?.name` (une seule chaîne).
- Contenu : agrégats sur `lots`, `animaux`, logs passés — **pas de section cycles**, **pas de tableau par ferme**.
- Mode all : `farmLabel` peut être absent → libellé « Toutes fermes » mais **données = tout le slice non filtré** si filtre off.

**Verdict :** **non** — pas de ventilation cycles par ferme dans l’export ; label ferme **cosmétique**, pas structural.

---

## 6. Comparaison des cycles entre fermes ?

| Surface | Comparaison cycles ? |
|---------|----------------------|
| Élevage > Cycles | **Non** |
| Centre IA > Cycles | **Non** |
| Dashboard multi-fermes | CA, trésorerie, alertes, scores — **pas d’échéances / retards cycles** |
| Gestion > Fermes | `launchingFarms` = CA/headcount nul — **pas calendrier cycle** |
| `farmConsolidation.js` | `rowsForFarm` pour lots par ferme en interne — **non exposé** comme pipeline cycles |

**Verdict :** **impossible** aujourd’hui de comparer retards J+40, bandes actives ou pipeline sorties entre fermes depuis Cycles ou Dashboard.

---

## 7. Doublons Dashboard multi-fermes / Cycles / Centre décisionnel

| Fonction | Dashboard multi-fermes | Cycles Élevage | Centre décisionnel Cycles |
|----------|------------------------|----------------|---------------------------|
| Consolidation groupe (CA, cash, alertes count) | Oui (`farmConsolidation`) | Non | Non (stratégique global) |
| Lien « lancer bande » | Pilotage → Élevage Cycles | TabIntro redondant | — |
| Calendrier J+40/J+90 | Non | `ProductionCycleDecisionPanel` (details) | Idem (details) |
| Marché / fêtes / BFR / vide sanitaire | Non | Vide si pas `strategicPlan` | Complet |
| Échéances opérationnelles | Non | Orphelin `ElevageCyclesPanel` | Non |
| Alertes cycles J+40/J+90 | Count alertes global ferme | Absent | Sync stratégique |
| `launchingFarms` | Headcount/CA nul | Non | Non |
| Questions production | Dashboard pilotage suggestion | Orphelin | Non |

**Doublons principaux :**

1. **VisionCyclesTab** monté **deux fois** (Élevage + Centre IA) avec **expériences différentes** (plan vide vs complet).
2. **Alertes cycles** (AlertesCenter) vs **KPI retard** (panel orphelin) — même calcul dates, canaux séparés.
3. **Dashboard consolidation** vs **Cycles KPI** — effectifs avicole en consolidation, **pas** échéances — confusion « pilotage groupe » sans calendrier cycles.

---

## 8. Architecture cible multi-fermes (figée — pré développement)

### Principes

1. **Toujours** propager `farmScope` + `farmFiltered` dans Cycles ; afficher badge « Ferme X » ou « Toutes les fermes ».
2. **Activer** le filtrage ferme en production (ou équivalent) pour modules critiques incluant `elevage` et `centre_ia`.
3. **Cycles = couche de présentation** — filtrage amont via `applyFarmScope` ; enrichir les lignes calculées avec `farmId` / `farmName` depuis lot/animal parent.
4. **Mode ferme unique** : KPI et échéances **100 % par ferme** ; création lot stampée `farm_id`.
5. **Mode toutes fermes** : vue **consolidée** + **tableau comparatif par ferme** (retards, échéances ≤10 j, lots actifs) — réutiliser `rowsForFarm` + `buildCalculatedCycleDates` par slice.
6. **Alertes cycle** : inclure `farm_id` et nom ferme ; filtrer comme les autres alertes.
7. **Export investisseur** : section « Pipeline cycles » avec sous-tableaux par ferme ou export multi-PDF.
8. **Centre décisionnel** : stratégique **groupe** ; Élevage Cycles = **opérationnel scoped** + lien « Stratégie groupe → Centre IA ».
9. **Legacy sans `farm_id`** : backfill ou règle explicite (défaut ferme) — ne pas inclure dans toutes les fermes.
10. **Pas de double saisie** Dashboard vs Cycles : Dashboard = synthèse 3 KPI cycles groupe ; détail uniquement dans Cycles.

### Matrice cible

| Mode | KPI | Échéances | Alertes | Export |
|------|-----|-----------|---------|--------|
| Ferme A | Par ferme A | Filtrées A | Tag ferme A | PDF ferme A |
| Toutes fermes | Consolidé + comparatif | Liste groupée par ferme | Consolidé + filtre ferme | Multi-section ou multi-fichier |

---

**Référence audit principal :** `AUDIT_ULTRA_DETAILLE_CYCLES_ELEVAGE_2026-06-09.md`
