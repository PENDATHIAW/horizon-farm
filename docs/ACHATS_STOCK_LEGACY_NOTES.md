# Achats & Stock — notes legacy (V3)

Document technique pour gel phase Achats & Stock V3. Ne pas supprimer brutalement les fichiers historiques listés ci-dessous.

## Panels branchés (V2/V3)

| Composant | Onglet | Statut | Note |
|-----------|--------|--------|------|
| `AchatsStockPurchasesPanel` | Achats | branché | Remplace hub inline V1 |
| `AchatsStockMovementsPanel` | Mouvements | branché | Ledger `stock_movements` |
| `AchatsStockInsightPanel` | Résumé | branché | Analyses IA + cohérence (repliable V3) |
| `AchatsStockLowStockPanel` | Résumé / Achats | branché | Compact en Résumé |
| `AchatsStockSupplierDebtsPanel` | Résumé | branché | Doublon partiel Fournisseurs — compact Résumé |
| `AchatsStockExpiryPanel` | Résumé | branché | Péremption / DLC |
| `AchatsStockTransferPanel` | Stock | branché | Transferts inter-fermes |
| `StockProductionSourcesPanel` | Stock | branché | Sources production |
| `StockFeedingElevageHint` | Stock | branché | Renvoi Élevage |
| `AchatsStockDataQualityPanel` | Résumé | branché V3 | Qualité données |
| `StocksV5` | Stock | actif | UI stock principale — ne pas supprimer V2–V5 |

## Doublons volontaires (digestibilité V3)

- **Résumé** : KPI essentiels + actions rapides ; détails (seuil, dettes, péremption, IA) repliables.
- **Stock** : `StocksV5` en premier ; transferts / sources / hint Élevage repliables.
- **Fournisseurs** : version complète dettes ; Résumé n’affiche qu’un aperçu compact.

## Gaps consommation documentés

Voir `CONSUMPTION_GAPS` dans `src/utils/stockConsumptionBridge.js` :

- Santé sans `stock_id` → message utilisateur, pas de mouvement inventé.
- Emballages œufs sans `packaging_stock_id` → production non bloquée, recommandation affichée.

## Migration production obligatoire

Fichier : `supabase/migrations/20260604120000_stock_movements_farm_scope.sql`

Colonnes : `farm_id`, `dedupe_key`, `movement_ref`, `metadata` sur `stock_movements`.

**Impact si non appliquée** : idempotence ledger incomplète, scope multi-fermes sur mouvements non persisté en prod.
