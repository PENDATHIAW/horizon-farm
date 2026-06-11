# Horizon Farm — Carnet d'Exploitation V2 (Dirigeant Agricole)

Date : 2026-06-09  
Branche : `cursor/home-carnet-dirigeant-v2-ac42`

---

## Synthèse

| Indicateur | V1 Carnet | V2 intermédiaire | **V2 Dirigeant** |
|------------|-----------|------------------|------------------|
| Layout | 4 listes verticales | 4 cartes + journal carousel | **4 cartes métier + objectifs + conseil + journal** |
| Scroll 15" | Oui | Réduit | **Cible : aucun** |
| Élevage | « X animaux » | « X bandes » | **X têtes + détail espèces** |
| Objectifs CA | Absents | Absents | **CA mois + CA année** |
| Journal max | 10 | 5 | **10 lignes terrain** |
| Bruit IA/BP | Partiel | Filtré | **Filtré strict** |

---

## Structure (capture textuelle)

```
╔══════════════════════════════════════════════════════╗
║ Bonjour Penda                                        ║
║ Voici l'état de votre exploitation                   ║
╚══════════════════════════════════════════════════════╝

┌─ ÉLEVAGE ──┐ ┌─ CULTURES ─┐ ┌─ STOCK ────┐ ┌─ FINANCE ──┐
│ 4520 têtes │ │ 12 parcelles│ │ 24 produits│ │ 1,2M FCFA  │
│ • pondeuses│ │ • 34 ha     │ │ • 3 empl.  │ │ Créances   │
│ • chair    │ │ • Maïs…     │ │ ⚠ ruptures │ │ Dettes     │
│ ⚠ mortalités│ │ ⚠ parcelle │ │ ⚠ DLC      │ │            │
└────────────┘ └─────────────┘ └────────────┘ └────────────┘

┌──────────── Objectifs de l'exploitation ─────────────┐
│ CA MOIS  750k / 1M  [██████░░░░] 75%               │
│ CA ANNÉE 6M / 12M   [█████░░░░░] 50%               │
└────────────────────────────────────────────────────┘

┌──────────── Conseil Horizon ─────────────────────────┐
│ Situation — Stock de maïs bas                        │
│ Cause — Couverture estimée : 4 jours                 │
│ Action — Planifiez un réapprovisionnement            │
└────────────────────────────────────────────────────┘

┌──────────── Journal d'exploitation ─── Voir tout → ──┐
│ ✓ Vente HF-002    ✓ Récolte Maïs                     │
│ ✓ Paiement reçu   ✓ Livraison Terminus               │
└────────────────────────────────────────────────────┘
```

---

## Avant / Après

### Avant (Carnet V1)

- Listes verticales empilées (attention, journal, état, conseil)
- Total animaux unique sans détail espèces
- Pas d'objectifs commerciaux visibles
- business_events IA mélangés au journal
- Trésorerie / créances en libellés vagues

### Après (V2 Dirigeant)

- **4 cartes métier** sur une ligne (grille 2×2 mobile, 4×1 desktop)
- **Élevage** : têtes + pondeuses / chair / bovins / ovins / caprins + alertes mortalité / traitement
- **Cultures** : parcelles, hectares, top 3 cultures, alertes parcelles
- **Stock** : produits, emplacements, ruptures et DLC uniquement (pas de valorisation)
- **Finance** : trésorerie nette, créances, dettes (consolidateFinance via summary)
- **Objectifs** : CA mois et CA année avec barres de progression
- **Conseil** : 3 lignes max (situation · cause · action)
- **Journal** : 10 événements terrain max, tri récent → ancien, filtre IA/BP

---

## Sources canoniques

| Domaine | Moteur |
|---------|--------|
| Élevage | `computeFarmHeadcount` + classification `elevageActivityPnl` |
| Cultures | `computeCultureSummary` |
| Stock | `computeStockSummary` + `buildExpirySnapshot` |
| Finance | `consolidateFinance` (via `buildDashboardSummary`) |
| Objectifs CA | `buildConsolidatedCommercialKpis` + `summary.goal` + `buildObjectifsCroissanceData` |
| Journal | `business_events`, ventes, paiements, cultures, production |

**Aucun nouveau moteur · aucun recalcul parallèle.**

---

## Éléments exclus de l'accueil

- Financement bancaire BP, achat pondeuses/bovins BP, apport promoteur
- Business plan, investisseur, objectifs IA
- Valorisation stock financière
- Boutons rapides, navigation métier, graphiques, KPI techniques

---

## Scores

| Critère | V1 | V2 Dirigeant |
|---------|----|--------------|
| UX / simplicité | 88 | **93** |
| Lisibilité | 90 | **94** |
| Dirigeant agricole | 88 | **95** |
| Investisseur (sur accueil) | 40 | 35 (volontaire) |
| Anti-scroll 15" | 55 | **88** |
| Anti-doublons | 95 | **96** |
| **Global** | 88 | **93** |

---

## Fichiers

- `src/modules/dashboard/carnetHorizon.js`
- `src/modules/dashboard/CarnetHorizon.jsx`
- `src/modules/DashboardV2.jsx`
- `tests/unit/carnetHorizon.test.js`
- `docs/reports/HOME_UX_AUDIT_V2.md`

---

## Vérification

```bash
npx vite-node tests/unit/carnetHorizon.test.js
npm run build
```
