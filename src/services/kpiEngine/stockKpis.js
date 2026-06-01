export { computeStockSummary } from '../../modules/dashboard/dashboardMetrics.js';

import { computeStockSummary } from '../../modules/dashboard/dashboardMetrics.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const dailyUse = (r = {}) => n(r.consommation_jour ?? r.daily_use ?? r.usage_daily);

/** Stock actuel — jamais filtré par période. */
export function computeStockKpis(stocks = []) {
  const summary = computeStockSummary(stocks);
  const rows = arr(stocks);
  const ruptureRows = rows.map((row) => {
    const use = dailyUse(row);
    const daysLeft = use > 0 ? Math.floor(qty(row) / use) : null;
    return { id: row.id, name: row.nom || row.name || row.produit, daysLeft, critical: threshold(row) > 0 && qty(row) <= threshold(row) };
  }).filter((row) => row.critical || row.daysLeft != null);

  return {
    ...summary,
    ruptureRows: ruptureRows.slice(0, 20),
    minDaysLeft: ruptureRows.reduce((min, row) => (row.daysLeft != null ? Math.min(min, row.daysLeft) : min), Infinity),
    source: 'stock',
    periodFiltered: false,
  };
}
