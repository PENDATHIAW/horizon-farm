# Audit v2 — Module Accueil (Carnet Horizon)

**Date :** 2026-06-09  
**Branche :** `cursor/erp-audit-kpi-alignment-ac42`  
**Périmètre :** module `dashboard` — vue Carnet Horizon (`DashboardV2.jsx`)

---

## 1. Structure réelle vs cible

| Élément | Config cible (`MODULE_TARGET_TABS`) | Implémentation actuelle | Statut |
|---------|-------------------------------------|-------------------------|--------|
| Onglets Accueil | Résumé, Graphiques | **Aucun onglet** — Carnet Horizon plein écran | Écart documenté |
| Sections Carnet | 4 cartes domaine + objectifs + conseil + journal | Conforme | OK |
| Navigation domaines | Vers modules métier | **Corrigé** — cartes cliquables | OK |
| Badges périmètre KPI | Période vs Cumul | **Corrigé** sur cartes + objectifs CA | OK |

**Décision :** conserver le Carnet Horizon comme vue unique Accueil (plus lisible pour le dirigeant). Les onglets « Résumé / Graphiques » restent dans la config vision pour audit futur, pas réintroduits sans validation produit.

---

## 2. Parcours audité

### 2.1 En-tête
- **Bonjour {nom}** — issu du profil utilisateur / ferme
- **Badge période** — `PeriodScopeBadge` via `periodLabel` (filtre global ERP)
- **Localisation** — quartier, ville, pays depuis profil ferme / météo

### 2.2 Cartes domaine (4)

| Carte | KPI principal | Périmètre | Navigation |
|-------|---------------|-----------|------------|
| Élevage | Effectif têtes (avicole + bovins/ovins/caprins) | Cumul | `elevage` → Lots & bandes |
| Cultures | Parcelles actives | Cumul | `cultures` → Parcelles & campagnes |
| Stock | Nombre de produits | Cumul | `achats_stock` → Inventaire |
| Finance | Trésorerie nette | Cumul | `finance_pilotage` → Résumé |

Alertes terrain affichées sous chaque carte (mortalités, ruptures, DLC, parcelles à surveiller).

### 2.3 Objectifs CA
- **CA mois** — filtré sur la période active (`periodRealized` / objectif période) — badge **Période** — lien Commercial → Pilotage
- **CA année** — cumul annuel — badge **Cumul** — lien Objectifs → Suivi du Business Plan

### 2.4 Conseil Horizon
- Règles métier : stock aliment bas, créances, trésorerie négative, mode lancement
- Pas de bruit IA / BP / investisseur

### 2.5 Journal d'exploitation
- Max 10 événements terrain récents
- Filtre anti-bruit (`isHomeNoiseText`, `isAgriculturalHomeEvent`)
- Lien « Voir tout » → `sync_activity`

---

## 3. Sources de données & cohérence chiffres

| KPI | Moteur | Périmètre |
|-----|--------|-----------|
| CA mois Carnet | `buildConsolidatedCommercialKpis` + `goal.periodRealized` | Période active |
| Trésorerie / créances / dettes | `consolidateFinance` via `buildDashboardSummary` | Cumul ferme |
| Effectifs | `computeFarmHeadcount` | Cumul |
| Stock produits | `summarizeStockValuation` / inventaire | Cumul |
| Journal | `businessEvents`, commandes, livraisons, paiements, récoltes | Récent → ancien |

---

## 4. Anomalies corrigées (cette session)

1. **Cartes domaine non cliquables** → boutons avec `CARNET_DOMAIN_NAVIGATION`
2. **Liens navigation legacy** (`Résumé`, `Stock`, `Cycles`, `À traiter`, `Performance`, `Financeurs`) → onglets canoniques dans `DASHBOARD_MODULES`, `dashboardPilotage.js`, `dashboardNavigation.js`, `DashboardShell.jsx`
3. **Absence de badge périmètre** → badges Période / Cumul sur cartes Finance et blocs objectifs CA
4. **Objectifs CA sans lien** → navigation Commercial Pilotage (mois) et Objectifs BP (année)

---

## 5. Anomalies ouvertes (hors scope immédiat)

| # | Anomalie | Priorité |
|---|----------|----------|
| A1 | Onglets Résumé/Graphiques absents de l'UI Accueil | Basse — décision produit |
| A2 | `DashboardShell.jsx` (composants legacy) peu utilisés par V2 mais encore importés ailleurs | Moyenne |
| A3 | Pas de lien direct Conseil → module concerné | Basse |
| A4 | Mode données simulées : pas d'indicateur visuel dédié sur le Carnet (badge global Paramètres) | Moyenne |
| A5 | Journal : pas de filtre « aujourd'hui » strict (affiche le récent global) | Basse |

---

## 6. Fichiers modifiés

- `src/modules/dashboard/carnetHorizon.js`
- `src/modules/dashboard/CarnetHorizon.jsx`
- `src/modules/dashboard/dashboardMetrics.js`
- `src/modules/dashboard/dashboardNavigation.js`
- `src/modules/dashboard/dashboardPilotage.js`
- `src/modules/dashboard/DashboardShell.jsx`
- `tests/unit/carnetHorizon.test.js`

---

## 7. Vérification

```bash
npm run build
npx vite-node tests/unit/carnetHorizon.test.js
```

---

## 8. Prochaine étape audit v2

Module **Commercial** (6 onglets : Ventes, Opportunités, Clients & créances, Livraisons, Abonnements, Pilotage).
