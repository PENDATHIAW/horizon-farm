# Horizon Farm — Accueil Carnet d'Exploitation V1

Date : 2026-06-09  
Branche : `cursor/home-carnet-v1-ac42`  
Mission : REFONTE ACCUEIL V1 — transformer le dashboard ERP en **Carnet Horizon** (lecture seule, 4 blocs).

**Principe directeur** : l'accueil sert à **comprendre** sa ferme ; les modules servent à **travailler**.

---

## Synthèse

| Indicateur | Avant | Après |
|------------|-------|-------|
| Onglets Accueil | 2 (Résumé, Graphiques) | **0** (page unique) |
| Sections visibles | 12+ panneaux repliables | **4** sections carnet |
| KPI cartes premier écran | 6–14 | **0** |
| Graphiques / courbes | Onglet dédié + dynamique | **0** |
| Boutons rapides (création) | 4–15 | **0** |
| Score charge cognitive (estimé) | 63/100 | **88/100** |

---

## Phase 1 — Audit Accueil (éléments identifiés)

| Élément | Utilité | Existe ailleurs | Décision |
|---------|---------|---------------|----------|
| Onglet Résumé (dashboard expert) | Synthèse ERP dense | Centre décisionnel, modules Résumé | **MASQUER** → remplacé par Carnet |
| Onglet Graphiques | Courbes CA, trésorerie, production | Commercial Graphiques, Finance, Vision | **MASQUER** |
| EssentialKpiGrid (6 KPI) | Trésorerie, CA, créances, stock… | Finance, Commercial, Stock | **MASQUER** |
| SecondaryKpiGrid | Ventes ouvertes, encaissé, résultat… | Modules métiers | **MASQUER** |
| DashboardPremiumBriefPanel | Brief dirigeant vocal | Centre IA, Assistant | **MASQUER** |
| DashboardPrioritiesPanel (cliquable) | Priorités dirigeant | Centre décisionnel | **DÉPLACER** → liste attention lecture seule |
| DashboardQuickActions | Nouvelle vente, trésorerie… | Commercial, Finance | **MASQUER** (anti-doublons) |
| DashboardAdaptedQuickActions | Actions contextuelles ferme | Modules | **MASQUER** |
| DashboardExploitationScoreCompact/Panel | Score ERP exploitation | Centre décisionnel, Vision | **MASQUER** |
| DashboardInvestorCompactStrip/Strip | KPI investisseur | Investisseurs & Forums | **MASQUER** |
| DashboardDynamicsScorePanel | Dynamique / tendance | Vision Performance | **MASQUER** |
| DashboardTemporalComparisonPanel | Comparaisons temporelles | Finance, Commercial | **MASQUER** |
| DashboardAdaptedAlertsPanel | Alertes détaillées | Activité & Suivi | **MASQUER** |
| DashboardHeyHorizonQuickAskStrip | Questions assistant | Assistant ERP | **MASQUER** |
| DashboardHeyHorizonStrip | Suggestions pilotage | Centre IA | **MASQUER** |
| DashboardNarrativePanel | Narratif période | Vision | **MASQUER** |
| DashboardFarmOverviewPanel | Vue agricole détaillée | Élevage, Cultures | **MASQUER** |
| DashboardActivityKpiStrip | KPI activité ferme | Élevage Résumé | **MASQUER** |
| DashboardWeatherStrip | Météo | AppLayout header | **MASQUER** |
| DashboardGoalsHero | Objectifs croissance | Objectifs & Croissance | **MASQUER** |
| DashboardHealthStrip | Santé ERP findings | Centre décisionnel | **MASQUER** |
| DashboardModuleNav | Raccourcis 7 modules | Menu principal | **MASQUER** |
| DashboardStartupPanel | Parcours lancement | Onboarding modules | **CONSERVER** logique → conseil démarrage |
| DashboardTodoRow (actions jour) | À traiter cliquable | Activité, modules | **DÉPLACER** → attention + journal |
| CollapsibleAdvancedSection (×6) | Analyse, investisseur, Hey Horizon… | Modules dédiés | **MASQUER** |
| FarmDemoModeBanner | Mode démo | Gestion système | **MASQUER** |
| DashboardPresentationOverlay | Mode présentation | Investisseurs | **MASQUER** |
| Santé ERP badge header | Score 0–100 | Centre décisionnel | **MASQUER** |
| Bouton Vision / Expert toggle | Navigation secondaire | Préférences UI | **MASQUER** |
| ModuleGraphiquesTab | Histogrammes dashboard | Vision Graphiques | **MASQUER** |
| **Carnet — Attention** | Priorités exploitant | Agrégation priorités existantes | **CONSERVER** (nouveau format) |
| **Carnet — Aujourd'hui** | Journal exploitation | business_events, logs | **CONSERVER** (nouveau format) |
| **Carnet — État** | 4 domaines | Moteurs canoniques | **CONSERVER** (nouveau format) |
| **Carnet — Conseil** | 1 recommandation | Priorités + stock aliment | **CONSERVER** (nouveau format) |

---

## Composants masqués (liste)

- `EssentialKpiGrid`, `SecondaryKpiGrid`
- `DashboardPremiumBriefPanel`, `DashboardPresentationOverlay`
- `DashboardPrioritiesPanel` (version interactive)
- `DashboardQuickActions`, `DashboardAdaptedQuickActions`
- `DashboardExploitationScoreCompact`, `DashboardExploitationScorePanel`
- `DashboardInvestorCompactStrip`, `DashboardInvestorStrip`
- `DashboardDynamicsScorePanel`, `DashboardTemporalComparisonPanel`
- `DashboardAdaptedAlertsPanel`
- `DashboardHeyHorizonQuickAskStrip`, `DashboardHeyHorizonStrip`
- `DashboardNarrativePanel`, `DashboardFarmOverviewPanel`, `DashboardActivityKpiStrip`
- `DashboardWeatherStrip`, `DashboardGoalsHero`, `DashboardHealthStrip`
- `DashboardModuleNav`, `DashboardStartupPanel` (UI)
- `CollapsibleAdvancedSection` et contenus repliables
- `FarmDemoModeBanner`
- `DashboardModuleHeader` (onglets, badges ERP, boutons action)
- `GraphiquesSection` / `ModuleGraphiquesTab`
- Tous les `onClick` / navigation depuis l'accueil

---

## Composants conservés (Accueil)

| Composant | Rôle |
|-----------|------|
| `DashboardV2.jsx` | Point d'entrée route `dashboard` |
| `CarnetHorizon.jsx` | UI carnet (4 sections) |
| `carnetHorizon.js` | Agrégation lecture seule |
| `CarnetHorizonHeader` | En-tête carnet (salutation, date, lieu) |
| `buildDashboardSummary` | Données exploitation |
| `buildDashboardPriorities` | Priorités attention |
| `dashboardGreeting` | Salutation |

---

## Sources canoniques utilisées

| Domaine | Source | Usage Carnet |
|---------|--------|--------------|
| Finance | `consolidateFinance` via `buildDashboardSummary` | Trésorerie, créances, état finances |
| Commercial | `buildConsolidatedCommercialKpis` | Factures impayées (attention) |
| Élevage | `computeFarmHeadcount` via `buildDashboardSummary` | Effectifs, santé (vaccins retard) |
| Cultures | `computeCultureSummary` + fiches cultures | Parcelles, récoltes |
| Stock | `computeStockSummary` via `buildDashboardSummary` | Seuils, conseil aliment |
| Journal | `business_events`, `production_oeufs_logs`, `payments` | Section Aujourd'hui |
| Priorités | `buildDashboardPriorities`, `buildDashboardTodayActions` | Section Attention |

**Interdictions respectées** : aucun nouveau moteur KPI · aucun recalcul parallèle de CA/trésorerie · modules métiers non modifiés.

---

## Avant / Après — expérience

### Avant
- Dashboard ERP : 2 onglets, 6–14 KPI, scores, graphiques, 15+ boutons, sections repliables ouvertes au scroll.
- L'exploitant devait filtrer le bruit investisseur / IA / technique pour comprendre sa ferme.

### Après
- **Carnet Horizon** : papier léger (`#fffdf8`), cartes discrètes, 4 blocs fixes.
- Compréhension cible **< 15 secondes** : attention → journal → état → conseil.
- **Lecture seule** : aucune création vente/lot/facture/culture depuis l'accueil.

---

## Scores qualitatifs

| Critère | Avant | Après | Commentaire |
|---------|-------|-------|-------------|
| Simplicité | 45/100 | **92/100** | 4 blocs vs 12+ panneaux |
| Lisibilité | 55/100 | **90/100** | Texte liste vs grilles KPI |
| Expérience agriculteur | 50/100 | **88/100** | Langage terrain, pas cockpit |
| Investisseur | 70/100 | 40/100 | Volontairement retiré de l'accueil |
| Anti-doublons | 40/100 | **95/100** | Plus de quick actions / graphiques dupliqués |
| **Global** | **52/100** | **88/100** | Aligné mission carnet d'exploitation |

---

## Fichiers modifiés

- `src/modules/DashboardV2.jsx` — refonte carnet
- `src/modules/dashboard/carnetHorizon.js` — **nouveau**
- `src/modules/dashboard/CarnetHorizon.jsx` — **nouveau**
- `tests/unit/carnetHorizon.test.js` — **nouveau**
- `docs/reports/HOME_CARNET_AUDIT_V1.md` — **nouveau**

**Non modifiés** : Finance, Commercial, Élevage, Cultures, Stock, Centre décisionnel, routes, permissions, moteurs canoniques.

---

## Vérification

```bash
node --test tests/unit/carnetHorizon.test.js
node --test tests/unit/dashboardAccueilUx.test.js
```
