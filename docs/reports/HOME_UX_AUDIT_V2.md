# Horizon Farm — Accueil UX Audit V2

Date : 2026-06-09  
Branche : `cursor/home-ux-v2-ac42`  
Périmètre : `CarnetHorizon.jsx`, `carnetHorizon.js`, `DashboardV2.jsx` (post Carnet V1)

---

## Phase 1 — Inventaire Accueil V1 (avant V2)

### Sections affichées (V1)

| Section | Type | Problème UX |
|---------|------|-------------|
| En-tête Carnet Horizon | Vertical, date + lieu | Trop de lignes |
| Ce qui demande mon attention | Liste verticale (8 max) | Scroll, doublons priorités ERP |
| Aujourd'hui | Liste verticale (10 max) | Scroll, bruit business_events |
| État de l'exploitation | Liste verticale 4 domaines | Redondant avec KPI implicites |
| Conseil Horizon | Bloc 2 lignes | OK mais trop bas dans la page |

### Sources de données

| Donnée | Source | Moteur |
|--------|--------|--------|
| Effectifs | `buildDashboardSummary` | `computeFarmHeadcount` |
| Cultures | `buildDashboardSummary` | `computeCultureSummary` |
| Stock | `buildDashboardSummary` | `computeStockSummary` |
| Trésorerie / créances | `buildDashboardSummary` | `consolidateFinance` |
| Factures impayées | `carnetHorizon` | `buildConsolidatedCommercialKpis` |
| Priorités | `buildDashboardPriorities` | règles pilotage |
| Actions jour | `buildDashboardTodayActions` | `dashboardWorkflows` |
| Journal | `business_events`, logs, paiements, cultures, tâches | filtrage partiel |

### Tâches IA / BP identifiées (bruit)

Provenant de `business_events`, `taches`, `priorities`, `summary.actions` :

- Financement bancaire BP
- Achat 4000 pondeuses / bovins BP / caprins BP
- Objectif mensuel atteint à X %
- Paiements à rapprocher (sync ERP)
- Transactions sans justificatif
- Alertes Smart Farm / météo
- Recommandations Hey Horizon / investisseur

### Compteurs problématiques

| Compteur V1 | Exemple | Problème |
|-------------|---------|----------|
| `headcount.total` | « 4520 animaux » | Somme avicole + bovins — illisible pour le dirigeant |
| `stock.totalProducts` | « 47 produit(s) suivis » | Métrique ERP, pas exploitation |
| `financePeriods` détail | Trésorerie FCFA brute | KPI financier complexe sur accueil |

### business_events affichés (V1)

Tous les événements du jour sans filtre investisseur/BP — titres longs, jargon ERP, scroll vertical.

---

## Diagnostic V1

| Critère | Score | Commentaire |
|---------|-------|-------------|
| Scroll vertical | 40/100 | 4 sections empilées |
| Design | 50/100 | Papier correct mais monotone |
| Pertinence agriculteur | 55/100 | Bruit IA/BP |
| Compréhension < 15 s | 60/100 | Trop de listes |
| Anti-doublons modules | 85/100 | Déjà lecture seule |

---

## Décisions V2

| Élément | Décision |
|---------|----------|
| Liste attention verticale | **SUPPRIMER** → alertes dans cartes domaine |
| Journal 10 lignes | **RÉDUIRE** → 5 cartes horizontales |
| Total animaux brut | **REMPLACER** → bandes / espèces |
| Priorités goal-late, orphan, docs | **FILTRER** |
| business_events BP/investisseur | **FILTRER** |
| Conseil 2 lignes | **UNIFIER** → 1 phrase |
| Layout | **HORIZONTAL** anti-scroll |
