# Audit complet ERP — Modules, interconnexions et moteurs centralisés

Document de référence pour l’audit Horizon Farm ERP. Complète `docs/audit-results/current/audit-roadmap.md` et `docs/audit-interconnexions-modules-riches.md`.

## État d’implémentation (2026-05-31)

| Chantier | Fichiers | Statut |
| -------- | -------- | ------ |
| Sources officielles de vérité | `src/services/dataSourcesOfTruth.js` | Livré |
| Règles période globale | `src/services/modulePeriodRules.js` | Livré |
| Couverture données modules enrichis | `src/services/moduleDataCoverageAudit.js` | Livré |
| Moteur KPI central | `src/services/kpiEngine/*` | Livré |
| Audit inter-modules | `src/services/erpAuditEngine.js` | Livré |
| Regroupement risques `issue_key` | `src/services/riskEngine.js`, `src/services/issueKey.js` | Livré |
| Workflows métier | `src/services/workflows/*` | Livré |
| Prêt vente → opportunité auto | `poultryWorkflowService.js` + `AvicoleBase.jsx` | Livré |
| Intégration Centre / Objectifs | `visionUtils.jsx`, `erpHealthEngine.js` | Livré |
| Tests unitaires | `tests/unit/*.test.js` | Livré |

## 1. Règle générale — sources officielles

Chaque type de donnée a **une seule source de saisie**. Les modules enrichis (Accueil, Centre décisionnel, Objectifs, Commercial, Finance, Rapports, Hey Horizon) **consomment** via `runKpiEngine()` et **n’additionnent pas** ventes + paiements + finances.

| Domaine | Source officielle | Consommateurs |
| ------- | ----------------- | ------------- |
| Vente / CA | `sales_orders` | Commercial, Accueil, Centre, Objectifs |
| Encaissement | `payments` | Commercial, Finance, Clients |
| Comptabilité / cash | `finances` | Finance, Comptabilité, Rapports |
| Ponte | `production_oeufs_logs` | Élevage, Avicole, Accueil |
| Stock actuel | `stock` (non filtré période) | Achats, Commercial, Accueil |
| Alerte / tâche | `alertes_center` / `taches` | Activité, Centre (regroupés par `issue_key`) |
| Opportunité | `sales_opportunities` | Commercial, Centre, Objectifs |

Voir `DATA_SOURCES_OF_TRUTH` dans `src/services/dataSourcesOfTruth.js`.

## 2. Moteurs centralisés

```txt
src/services/kpiEngine/
  commercialKpis.js   → CA, encaissements, créances
  financeKpis.js      → encaissements période, charges, preuves
  stockKpis.js        → stock actuel, rupture
  livestockKpis.js    → effectifs, ponte
  documentKpis.js     → conformité preuves
  growthKpis.js       → objectifs stratégiques
  dashboardKpis.js    → Accueil
  index.js            → runKpiEngine()

src/services/erpAuditEngine.js  → audit inter-modules + issue_key
src/services/riskEngine.js        → regroupement alertes/tâches/findings/IA
src/services/workflows/           → ventes, achats, stock, santé, volaille, documents
```

**Usage recommandé :**

```js
import { runKpiEngine } from './services/kpiEngine/index.js';
import { runErpAuditEngine } from './services/erpAuditEngine.js';
import { runRiskEngine } from './services/riskEngine.js';

const kpis = runKpiEngine(dataMap, { module: 'centre_ia', periodScope });
const audit = runErpAuditEngine(dataMap);
const risks = runRiskEngine({ ...dataMap, auditReport: audit });
```

## 3. Règle période

Voir `MODULE_PERIOD_RULES` dans `src/services/modulePeriodRules.js`.

- **Filtré période :** ventes, encaissements, dépenses, production œufs du mois
- **Global :** stock actuel, clients, fournisseurs, alertes ouvertes, fiches animaux/lots

## 4. Centre décisionnel vs Objectifs & Croissance

| Module | Question | Horizon |
| ------ | -------- | ------- |
| Centre décisionnel | Qu’est-ce qui demande une décision **maintenant** ? | `runRiskEngine` → priorités groupées par `issue_key` |
| Objectifs & Croissance | Où va l’exploitation **stratégiquement** ? | `computeGrowthKpis` → objectif vs réalisé, BP |

## 5. Interconnexions critiques

### Vente → Stock → Paiement → Finance → Facture → Document

Workflow : `src/services/workflows/salesWorkflowService.js`  
Audit : `erpAuditEngine` détecte vente payée sans paiement, paiement orphelin, facture sans document.

### Prêt vente → Opportunité commerciale

Workflow : `src/services/workflows/poultryWorkflowService.js`  
Déclenchement : confirmation `pret_vente_confirme` dans `AvicoleBase.jsx` → création opportunité si absente.

### Alimentation → Stock → Lot

Source officielle consommation : `alimentation_logs` (voir règles élevage audit §2.5–2.7).

## 6. Champs de liaison standards

À normaliser progressivement sur toutes les tables :

```txt
source_module, source_record_id, related_module, related_record_id
issue_key, origin_type, workflow_id
```

Valeurs `origin_type` : `manual`, `automatic`, `imported`, `ia_suggestion`, `workflow`, `system`.

## 7. Priorités restantes (post-moteurs)

1. Rapprochement banque/caisse (Finance)
2. Exports PDF financeur depuis KPI officiels + preuves liées
3. RBAC serveur (Paramètres)
4. E2E Playwright : vente soldée, client sans relance
5. Cultures : récolte → stock → vente (pattern volaille)
6. Normalisation champs `issue_key` en base Supabase (alertes, tâches, ai_recommendations)

## 8. Checklist module (10 points)

Pour chaque module UI :

1. Source officielle identifiée ?
2. Module créateur vs afficheur ?
3. Doublon de saisie ailleurs ?
4. Liens créés à chaque action ?
5. Filtrage période correct ?
6. Données globales visibles si requis ?
7. KPI via `kpiEngine` ?
8. Déduplication alerte/tâche/IA (`issue_key`) ?
9. Documents/preuves liés ?
10. Traçabilité `business_events` ?

---

Ce document est le canevas opérationnel. Le détail module par module (Accueil, Hey Horizon, Élevage, Commercial, etc.) est dans la spécification produit associée au chantier audit ERP 2026.
