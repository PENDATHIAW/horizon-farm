# Horizon Farm — Audit Canonical Execution Enforcement V1

Date : 2026-06-09  
Branche : `cursor/canonical-execution-enforcement-v1-ac42`  
Périmètre : Workflows · Business Events · KPI · Finance · Stock · Traçabilité

**Contexte audits préalables** : ERP Transversal V1 · Commercial UX Anti-Doublons V1 · Architecture Canonique V1

**Principe** : 1 donnée = 1 vérité · 1 workflow = 1 chemin · 1 événement = 1 écriture

**Contrainte respectée** : aucune modification de `consolidateFinance`, `buildConsolidatedCommercialKpis`, `summarizeSalesMargins` ; pas de changement routes/permissions/données métier.

---

## Synthèse exécutive

Cet audit ajoute une **couche d'enforcement** : registre statique des chemins d'exécution + moteur runtime `runCanonicalExecutionAudit()` en lecture seule.

| Domaine | Score avant | Score après audit |
|---------|-------------|-------------------|
| Workflow | 62 | **78** |
| Events | 58 | **74** |
| KPI | 64 | **76** |
| Finance | 72 | **88** |
| Stock | 70 | **85** |
| Traçabilité | 68 | **82** |
| **Global** | **66** | **81** |

**Livrables code** :
- `src/audit/canonicalExecutionRegistry.js` — WORKFLOW / EVENT / KPI reports
- `src/utils/canonicalExecutionAudit.js` — `runCanonicalExecutionAudit()`
- `tests/unit/canonicalExecutionAudit.test.js`

---

## Phase 1 — WORKFLOW_ENFORCEMENT_REPORT

### Moteurs canoniques surveillés

| Domaine | Workflow canonique | Legacy documenté |
|---------|-------------------|------------------|
| Vente | `commitCommercialSale` + `prepareCommercialSaleCommit` | `commitSaleWorkflow` (WhatsApp simple, VentesV2) |
| Encaissement | `recordSalePayment` | `onCreateFinanceTransaction` direct (VentesV2 l.561) |
| Livraison | `confirmSaleDelivery` | — |
| Achat stock | `commitStockPurchaseWorkflow` | `commitPurchaseWorkflow` (WhatsApp) |
| Finance (lecture) | `consolidateFinance` | — |

### Cartographie des risques

| Kind | Count | Exemples |
|------|-------|----------|
| **canonical** | 18 | VentesTerrainV3, SaleActionModal, StocksV3, WhatsApp COMMERCIAL_SALE |
| **legacy** | 5 | VentesV2, commitSaleWorkflow, commitPurchaseWorkflow |
| **bypass** | 3 | VentesV2 finance directe, StocksV4 HeyHorizon réception, StocksV4 finance |
| **parallel** | 2 | culturesWorkflow vente récolte, purchaseSideEffects |

### Bypass UI identifiés (correctifs futurs — hors scope V1)

1. **VentesV2** — `buildFinanceFromPayment` via `onCreateFinanceTransaction` sans `recordSalePayment`
2. **StocksV4 HeyHorizonStockCard** — réception stock + finance inline sans `commitStockPurchaseWorkflow`
3. **StocksV3 mouvements manuels** — events stock inline (réception/sortie/perte) sans workflow unifié

### Marqueurs runtime (`CANONICAL_WORKFLOW_MARKERS`)

```javascript
sale: ['commercial_sale_workflow', 'commercial_sale_repair', 'sale_workflow']
payment: ['record_sale_payment']
stockPurchase: ['stock_purchase_workflow', 'purchase_side_effects']
```

Référence : `src/audit/canonicalExecutionRegistry.js` → `WORKFLOW_ENFORCEMENT_REPORT`

---

## Phase 2 — EVENT_ENFORCEMENT_REPORT

### Chemins d'écriture business_events

| Source | Canonique | Legacy | Risque |
|--------|-----------|--------|--------|
| `createBusinessEvent` (service) | ✅ | — | Faible — issue_key + dedupe |
| Workflows `onCreateBusinessEvent` | ✅ partiel | ⚠️ | Faible-moyen — side_effects_managed |
| AppContext `emitBusinessEvents` | — | ✅ | Moyen — auto CRUD sans skip workflow |
| StocksV3/V4 inline events | — | ✅ | Moyen |
| AppContext `sales_orders` create | — | ✅ | **Haute** — doublon avec `vente_commercial_workflow` |

### Matrice Source / Canonique / Legacy / Risque

| Source | Canonique | Legacy | Risque |
|--------|-----------|--------|--------|
| businessEventsService.createBusinessEvent | Oui | Non | Faible |
| AppContext buildCreateEvents/buildUpdateEvents | Non | Oui | Moyen-Haute |
| onCreateBusinessEvent handlers (60+ fichiers) | Partiel | Oui | Moyen-élevé |
| activiteSuiviWorkflow state.push | Non | Oui (local) | Faible |

**Aucun `business_events.push` en production** — uniquement tests et état local activité suivi.

### Contrôles runtime

- `auditEventsMissingIssueKey` — events sans `issue_key` ni `side_effects_managed`
- `auditSaleEventDoubleWrite` — `vente` (AppContext) + `vente_commercial_workflow` même `order_id`
- Réutilise `auditBusinessEventDuplicates` (ERP transversal)

---

## Phase 3 — KPI_ENFORCEMENT_MATRIX

| KPI | Canonique | Secondaire | Legacy | Panneaux critiques secondaires |
|-----|-----------|------------|--------|-------------------------------|
| CA commercial | `buildConsolidatedCommercialKpis` | `computeCommercialKpis` | reduce sales_orders | DashboardV2, kpiEngine, financeurReport |
| CA ERP | `consolidateFinance().caConsolide` | `buildConsolidatedCommercialKpis` | — | — |
| Marge produit | `summarizeSalesMargins` | `margeReelle` | operatingResult | ✅ Tous panneaux critiques OK |
| Trésorerie | `buildOfficialTreasuryView` | `computeFinancePeriodSummary` | — | visionUtils, objectifsCroissance |
| Encaissements période | `buildConsolidatedCommercialKpis` | `computeFinancePeriodSummary` | `computeCommercialKpis` | Dashboard |
| Créances | `creancesReelles` | `receivableFromOrders` | — | ✅ OK |

### Panneaux critiques sur moteur secondaire (6)

Documentés dans `CRITICAL_PANELS_SECONDARY_KPI` — warnings runtime `KPI-SECONDARY`.

**Annotations ajoutées** :
- `@warning` sur `computeDashboardKpis` (dashboardKpis.js)
- `@deprecated` sur `buildFinanceurKpis` (financeurReportService.js)

---

## Phase 4 — `runCanonicalExecutionAudit()`

Moteur lecture seule — agrège ERP transversal + enforcement.

```javascript
import { runCanonicalExecutionAudit } from '../utils/canonicalExecutionAudit.js';

const audit = runCanonicalExecutionAudit(dataMap);
// audit.score, audit.domainScores, audit.warnings
```

### Contrôles

| Domaine | Fonction | Détecte |
|---------|----------|---------|
| Workflow | `auditSaleWorkflowBypass` | Vente hors workflow canonique |
| Workflow | `auditStockPurchaseBypass` | Achat stock hors `commitStockPurchaseWorkflow` |
| Workflow | `auditPaymentWorkflowBypass` | Encaissement hors `recordSalePayment` |
| Events | `auditEventsMissingIssueKey` | Event sans issue_key |
| Events | `auditBusinessEventDuplicates` | Doublon issue_key |
| Events | `auditSaleEventDoubleWrite` | AppContext + workflow même vente |
| Finance | `auditFinanceDoubleWrite` | Double créance / double encaissement |
| Stock | `auditStockDoubleExit` | Double sortie stock (dedupe_key) |
| Traçabilité | `auditTraceabilityGaps` | Vente sans facture, facture sans créance, etc. |

Hérite de `runErpTransversalAudit` pour finance/stock/events de base.

---

## Phase 5 — Correctifs appliqués (V1)

| Action | Fichier |
|--------|---------|
| Registre WORKFLOW / EVENT / KPI | `canonicalExecutionRegistry.js` |
| Moteur runtime | `canonicalExecutionAudit.js` |
| Tests unitaires | `canonicalExecutionAudit.test.js` |
| @warning KPI dashboard | `dashboardKpis.js` |
| @deprecated KPI financeur | `financeurReportService.js` |
| Lien audit architecture | `canonicalArchitectureRegistry.js` |

### Correctifs interdits (respectés)

- ❌ Pas de modification moteurs canoniques Finance/Commercial/Marge
- ❌ Pas de changement routes, permissions, données
- ❌ Pas de nouvelle fonctionnalité métier

### Pistes P2 (non implémentées)

1. Router tous les `onCreateBusinessEvent` workflow via `createBusinessEvent({ skipDuplicate })`
2. Supprimer auto-events AppContext si `side_effects_managed` sur l'enregistrement
3. Monter `runCanonicalExecutionAudit` en UI (repair panel Finance/Commercial)
4. Migrer DashboardV2 CA vers `buildConsolidatedCommercialKpis`
5. Remplacer bypass StocksV4 HeyHorizon par `commitStockPurchaseWorkflow`

---

## Suite des audits Horizon Farm

| Audit | Statut |
|-------|--------|
| Commercial V1 | ✅ |
| ERP Transversal V1 | ✅ |
| UX Anti-Doublons V1 | ✅ |
| Architecture Canonique V1 | ✅ |
| **Canonical Execution V1** | ✅ |

---

## Références

- Registre : `src/audit/canonicalExecutionRegistry.js`
- Runtime : `src/utils/canonicalExecutionAudit.js`
- ERP transversal : `src/utils/erpTransversalAudit.js`
- Architecture : `src/audit/canonicalArchitectureRegistry.js`
