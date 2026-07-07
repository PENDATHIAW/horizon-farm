# Audit module Accueil (`dashboard`)

**Date :** 2026-06-18  
**État :** vue unique **Carnet Horizon** (pas d’onglets rendus)

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `AccueilRefinedEntry.jsx` | Entry point lazy (`moduleEntryPoints.js`) | **Oui** |
| `DashboardV2.jsx` | Orchestration données + pilotage | **Oui** (via AccueilRefinedEntry) |
| `CarnetHorizon.jsx` | UI Carnet dirigeant | **Oui** |
| `carnetHorizon.js` | Agrégation domaines, journal, conseil, projections | **Oui** |
| `dashboardMetrics.js` | `buildDashboardSummary` | Service |
| `dashboardPilotage.js` | Priorités, investisseur, score exploitation | Service |
| `DashboardDataModeBanner.jsx` | Bannière données réelles / simulées | **Oui** |
| `AccueilCommercialCard.jsx` | Raccourcis pilotage sous le carnet | **Oui** |
| `DashboardShell.jsx` | Ancien shell (priorités, investisseur, vente rapide) | **Non monté** |

---

## 2. Données entrantes depuis `App.jsx`

| Prop | Avant | Après audit |
|------|-------|-------------|
| `deliveries` | Absent | **Ajouté** — journal terrain + livraisons |
| `bpRecurringCosts` | Absent | **Ajouté** — projection trésorerie |
| `businessPlans`, `investissements` | Présents | Utilisés pour score investisseur |
| CRUD ventes, stock, élevage, cultures… | Présents | Inchangés |

---

## 3. Onglets et navigation

### Canon (`horizonVision.config.js`)

```
Carnet Horizon
```

### Alias legacy (`commercialNavigation.js`)

`Résumé`, `Graphiques` → `Carnet Horizon` (deep-links annexe / Vision conservés).

L’UI ne rend pas de `ModuleTabsBar` : une seule vue plein écran.

---

## 4. Écarts corrigés

| Priorité | Écart | Correction |
|----------|-------|------------|
| Critique | Priorités calculées mais invisibles | Bloc **Mes priorités** cliquable dans `CarnetHorizon.jsx` |
| Critique | Score investisseur absent du live path | `buildDashboardInvestorReadiness` branché + bandeau dossier financeur |
| Haute | Journal « du jour » affichait tout l’historique | Filtre `isTimestampToday` avec repli « récents » + libellé adapté |
| Haute | Conseil Horizon sans navigation | `navigate` sur chaque branche + carte cliquable |
| Haute | Config onglets `Résumé/Graphiques` obsolète | Aligné sur `Carnet Horizon` |
| Moyenne | Projection œufs → onglet `Avicole` | → `Lots & bandes` |
| Moyenne | `AccueilCommercialCard` redondant | Remplacé par **Raccourcis pilotage** (Commercial, Centre, Investisseurs) |

---

## 5. Interconnexions vérifiées

| Action Accueil | Module cible |
|----------------|--------------|
| Carte domaine Élevage | `elevage` → Lots & bandes |
| Carte Finances | `finance_pilotage` → Résumé |
| Priorité créances | `commercial` → Clients & créances |
| Priorité dettes | `finance_pilotage` → Créances & dettes |
| Conseil stock aliment | `achats_stock` → Inventaire |
| Préparation investisseur | `investisseurs_forums` → Résumé |
| Journal « Voir tout » | `sync_activity` |
| Raccourci Centre | `centre_ia` → Urgences & risques |

---

## 6. Tests

- `tests/unit/carnetHorizon.test.js` — journal du jour, conseil navigate, projections œufs, priorités/investisseur
- `tests/unit/moduleEntryPoints.test.js` — entry `AccueilRefinedEntry.jsx`

---

## 7. Reste ouvert (basse priorité)

- `DashboardShell.jsx` (~788 lignes) : candidat suppression ou fusion future si plus aucune référence
- Onglet `Graphiques` Accueil : non réintroduit (décision produit — graphiques via modules métier / Centre)
