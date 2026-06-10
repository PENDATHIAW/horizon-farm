# Horizon Farm — Audit Commercial V1 (C0–C1)

Date : 2026-06-09  
Branche : `cursor/commercial-v1-ac42`  
Périmètre : Commercial, Finance & Pilotage (lecture), Stock, Cultures, Élevage, Centre décisionnel, Hey Horizon.

## Score initial (avant correctifs)

| Domaine | Score /100 | Commentaire |
|---------|------------|-------------|
| Pipeline vente canonique | 72 | Devis→Commande→Facture→Livraison→Encaissement présent ; écarts finance détectables |
| Créance canonique | 78 | `financeIds.receivable(orderId)` — garde idempotence OK |
| Stock canonique | 85 | Décrément à validation vente (`applySourceImpactFromSaleLines`) ; pas sur livraison |
| Traçabilité | 80 | `syncSaleTraceFromOrder` dans erpInterconnectionEngine |
| Idempotence | 70 | Finance paid/receivable idempotents ; lignes `source_impact_applied` |
| Opportunités | 55 | Matching client existant ; pas de moteur auto stock/cultures/élevage |
| Hey Horizon Commercial | 40 | Presets navigation seulement (`commercialHeyHorizon.js`) |
| Pilotage investisseur | 60 | Export PDF ; pas de synthèse 3 lignes ni objectifs temps réel |
| Relances IA | 50 | Relances structurées ; pas de plan J+2/J+7/J+15 multi-canal |
| Segmentation clients | 65 | `clientSegmentationEngine` ; pas de détection « silencieux » |

**Score global avant : 68/100**

## Exploration C0 — Composants et moteurs

### Module Commercial (actif)
- `CommercialRecoveredModule.jsx` — shell principal
- Panels : Ventes, Clients, Livraisons, Relances, Opportunités, Pilotage, Graphiques
- KPI canonique : `commercialKpiConsolidated.js` + `commercialMetrics.js`

### Doublons / risques (non supprimés — coexistence justifiée)
- `CommercialModule.jsx` vs `CommercialRecoveredModule` — recovered = production
- `commercialHeyHorizon.js` (presets) — étendu par Hey Horizon Commercial SCA (pas supprimé)

### Calculs concurrents identifiés
- Marges graphiques : `summarizeSalesMargins` (OK — aligné Finance Rentabilité)
- CA dashboard : `buildConsolidatedCommercialKpis` — source unique module Commercial

### Points de rupture métier
1. Paiement sans ligne finance → `buildCommercialReconciliationRows`
2. Vente sans lignes → `buildCommercialSaleGapRows`
3. Stock non décrémenté → repair panel + idempotence lignes

## Audit métier C1

### Vente canonique
Pipeline : Devis (`commercialQuoteWorkflow`) → Commande → Facture → Livraison → Encaissement → Réconciliation.

Une vente = une commande `sales_orders` ; side-effects via `runNewSaleSideEffects`.

### Créance canonique
`buildReceivableFinanceRow` → id `financeIds.receivable(orderId)`  
Solde via `syncReceivableAfterPayment` + `remainingForOrder`.

### Stock canonique
Décrément : `applySourceImpactFromSale` / `applySourceImpactFromSaleLines` à validation vente.  
Garde : `movementAlreadyExists`, `source_impact_applied` par ligne.  
Livraison : pas de second décrément stock (`commercialDeliveries.js`).

### Traçabilité
`syncSaleTraceFromOrder` après vente ; lien order_id sur paiements, finance, livraisons.

### Idempotence testée
- Double encaissement → même `financeIds.paid`
- Double créance → même `financeIds.receivable`
- Double impact stock → skip si `source_impact_applied`
- Double mouvement → `dedupe_key` stock-mvt

## Anomalies détectées (liste)

| ID | Anomalie | Sévérité |
|----|----------|----------|
| A1 | Pas de moteur opportunités automatique stock/cultures/élevage | Haute |
| A2 | Hey Horizon sans format SITUATION/CAUSE/ACTION commercial | Haute |
| A3 | Relances sans plan J+2/J+7/J+15 WhatsApp/SMS/Email | Moyenne |
| A4 | Segmentation sans détection clients silencieux | Moyenne |
| A5 | Graphiques sans traducteur dirigeant | Moyenne |
| A6 | Pilotage sans objectifs/produits rentables/clients stratégiques | Moyenne |
| A7 | Démo investisseur Hôtel Terminus absente | Faible |
| A8 | Merge opportunités manuel/auto pouvait dupliquer par clé id | Faible |

## Vérités canoniques — non modifiées

- Trésorerie / créances Finance : `consolidateFinance` (Finance P0)
- CA commercial module : `buildConsolidatedCommercialKpis`
- Marge produit : `summarizeSalesMargins` (pas de moteur marge parallèle)
- Stock : décrément vente uniquement
