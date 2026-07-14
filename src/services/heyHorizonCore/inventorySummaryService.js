import { computeStockSummary } from '../../modules/dashboard/dashboardMetrics.js';
import {  low, metaBase, money, pickRows } from './coreUtils.js';

const stockQty = (row = {}) => Number(row.quantite ?? row.quantity ?? row.stock ?? 0) || 0;
const stockThreshold = (row = {}) => Number(row.seuil ?? row.threshold ?? row.stock_min ?? row.minimum_stock ?? 0) || 0;

/**
 * Synthèse stock & achats - quantités, valeur, alertes seuil.
 */
export function getInventorySummary(dataMap = {}) {
  const stocks = pickRows(dataMap, 'stocks', 'stock');
  const fournisseurs = pickRows(dataMap, 'fournisseurs');
  const summary = computeStockSummary(stocks);

  const feedProducts = stocks.filter((row) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(
    low(`${row.produit || row.name || row.nom || ''} ${row.categorie || row.category || ''}`),
  ));

  const feedQty = feedProducts.reduce((sum, row) => sum + stockQty(row), 0);
  const lowStockItems = stocks
    .filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row))
    .slice(0, 10)
    .map((row) => ({
      id: row.id || null,
      designation: row.produit || row.name || row.nom || 'Non renseigné',
      quantite: stockQty(row),
      seuil: stockThreshold(row),
      valeur: stockQty(row) * money(row),
    }));

  return {
    ...metaBase({ module: 'achats_stock' }),
    stock: {
      produits_total: summary.totalProducts,
      produits_disponibles: summary.availableProducts,
      sous_seuil: summary.lowStockCount,
      valeur_estimee: summary.stockValue,
      intrants_alimentaires_quantite: feedQty,
    },
    fournisseurs: {
      count: fournisseurs.length,
      avec_dette: fournisseurs.filter((row) => money(row.dettes ?? row.dette ?? row.solde) > 0).length,
    },
    alertes_sous_seuil: lowStockItems,
  };
}

export default getInventorySummary;
