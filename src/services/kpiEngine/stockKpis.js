export { computeStockSummary } from '../../modules/dashboard/dashboardMetrics.js';

import { computeStockSummary } from '../../modules/dashboard/dashboardMetrics.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const number = (value = 0) => Number(value || 0);
const quantity = (row = {}) => number(row.quantite ?? row.quantity ?? row.stock);
const threshold = (row = {}) => number(row.seuil ?? row.threshold ?? row.stock_min ?? row.minimum_stock);
const dailyUse = (row = {}) => number(row.consommation_jour ?? row.daily_use ?? row.usage_daily);

export function computeStockKpis(stocks = []) {
  const summary = computeStockSummary(stocks);
  const ruptureRows = arr(stocks).map((row) => {
    const use = dailyUse(row);
    const daysLeft = use > 0 ? Math.floor(quantity(row) / use) : null;
    return { id: row.id, name: row.nom || row.name || row.produit, daysLeft, critical: threshold(row) > 0 && quantity(row) <= threshold(row) };
  }).filter((row) => row.critical || row.daysLeft != null);
  const finiteDaysLeft = ruptureRows
    .map((row) => row.daysLeft)
    .filter((days) => days != null && Number.isFinite(days));
  return {
    ...summary,
    ruptureRows: ruptureRows.slice(0, 20),
    // null (et non Infinity) quand aucune ligne n'a d'autonomie chiffrable :
    // sinon la valeur remonte telle quelle et s'affiche « Infinity ».
    minDaysLeft: finiteDaysLeft.length ? Math.min(...finiteDaysLeft) : null,
    source: 'stock',
    periodFiltered: false,
  };
}
