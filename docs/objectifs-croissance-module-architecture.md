# Module Objectifs & Croissance — Architecture décisionnelle

## Vue d'ensemble

Le module **Objectifs & Croissance** croise automatiquement les données des modules Élevage, Commercial, Finances/Achats et les flux marché pour piloter :

- performances zootechniques (date pivot + référentiel `Code_Souche`) ;
- objectifs de CA et marge brute par atelier ;
- tarification dynamique (plancher, saisonnalité, marché local).

```
┌─────────────────────────────────────────────────────────────────┐
│                    ObjectifsDecisionModule (UI)                    │
│  Onglet 1: Objectifs & Écarts │ Onglet 2: Capacités │ Onglet 3: G1-G7 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    buildObjectifsDecisionPlan()
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 datePivotEngine      dynamicPricingEngine    breedStockReferential
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
              composeDecisionDataMap (App.jsx)
                                │
   lots · production_oeufs · alimentation · sante · ventes · BP · marché
```

## Ateliers couverts

| Atelier | Statut | Activité ERP | Code souche par défaut |
|---------|--------|--------------|------------------------|
| Pondeuses | Actif | `oeufs` | `PONDEUSE_RHODE` |
| Poulets de chair | Actif | `poulets_chair` | `CHAIR_COBB` |
| Embouche bovine | Actif | `bovins` | `BOVIN_ZEBU_EMBOUCHE` |
| Maraîchage | Futur (sandbox) | `cultures` | — |

## 1. Moteur Date Pivot & liaison souche

**Fichiers :** `src/services/objectifsDecision/datePivotEngine.js`, `breedStockReferential.js`

- **Date Pivot (J-0)** : `date_pivot` → fallback `date_debut` / `date_entree`.
- **Âge actuel** : `Âge = Date_du_jour − Date_Pivot` (jours).
- **Standard théorique** : interpolation linéaire sur la courbe du `Code_Souche` à l'âge courant.
- **Objectifs financiers** : grilles CA/marge mensuelles par atelier depuis `HORIZON_FARM_OFFICIAL_BP` + `growth_settings`.

Chaque lot doit porter `code_souche` ou `breed_code` ; sinon inférence depuis le type (pondeuse, chair, bovin).

## 2. Moteur tarification dynamique

**Fichier :** `src/services/objectifsDecision/dynamicPricingEngine.js`

| Étape | Formule |
|-------|---------|
| Prix Plancher | `Coût_revient × (1 + Marge_min%)` |
| Coefficient saisonnalité | Ratio ventes du mois / moyenne annuelle (borné 0,85–1,25) ou calendrier commercial |
| Prix marché local | Table `market_prices` ou `price_catalog` filtrée par localité |
| **Prix Recommandé ERP** | `MAX(Prix_Plancher ; Prix_Marché × Saisonnalité)` |

**Alerte rouge** si `Prix_Plancher > Prix_Marché × Saisonnalité` → *Risque de mévente*.

## 3. Onglet Objectifs & Écarts

**Fichier :** `src/modules/objectifs/ObjectifsEcartsTab.jsx`

### Zootechnique
- **Taux de ponte réel** = `(Œufs collectés / Poules vivantes) × 100` sur fenêtre glissante.
- **GMQ réel** : poids / âge (chair) ou `summarizeAnimalCosts` (bovins).
- Alertes orange/rouge selon écart au standard souche (±5–10 %).
- Surcoût alimentaire estimé en cas de retard.
- Baisse ponte > 3 % sur 48 h → corrélation livraisons aliment + fiches véto (5 jours).

### Financier & prix
- CA réel vs objectif mensuel par atelier.
- Marge brute réelle vs objectif.
- Prix Recommandé ERP par activité.

## 4. Onglet Croissance économique & Capacités

**Fichier :** `src/modules/objectifs/CroissanceCapacitesTab.jsx`

- **Seuil de rentabilité** (calculé le 28 du mois) :
  - `Seuil_CA = (Charges_fixes_m + Charges_variables_m) / Taux_marge_brute`
  - `CA_cible_net = (Fixes + Variables) / (Marge_brute% − Marge_nette_cible%)`
- **Vide sanitaire** : alerte bloquante si intervalle < **10 jours** entre deux lots dans un même bâtiment.
- **Sandbox Maraîchage** : simulation charges, rendement, Marché A vs B.

## 5. Tableau de bord graphique (G1–G7)

**Fichier :** `src/modules/objectifs/ObjectifsGraphiquesTab.jsx`

| Graphique | Contenu |
|-----------|---------|
| G1 | Taux ponte théorique vs réel (âge) |
| G2 | Écarts poids chair (réel vs souche) |
| G3 | CA réel 12 mois vs seuil rentabilité |
| G4 | Occupation bâtiments (Gantt simplifié) |
| G5 | Marges objectif vs réelle par atelier |
| G6 | Jauge progression CA annuel |
| G7 | Coût revient / Marché / Prix pratiqué |

## Scripts SQL (vues analytiques)

Voir `sql/objectifs_decisionnel_views.sql` pour les vues PostgreSQL/Supabase équivalentes aux calculs JS.

## Données requises dans `dataMap`

| Clé | Source module |
|-----|---------------|
| `avicole` / `lots` | Élevage |
| `production_oeufs_logs` | Élevage / Production |
| `alimentation_logs` | Élevage / Alimentation |
| `sante` | Élevage / Santé |
| `sales_orders` | Commercial |
| `finances`, `payments` | Finances |
| `market_prices`, `price_catalog` | Commercial / Achats |
| `growth_settings` | Paramètres exploitation |

## Point d'entrée

```javascript
import { buildObjectifsDecisionPlan } from './services/objectifsDecision/objectifsDecisionEngine.js';

const plan = buildObjectifsDecisionPlan(dataMap);
// plan.zootechnical, plan.financial, plan.breakEven, plan.chartData, ...
```
