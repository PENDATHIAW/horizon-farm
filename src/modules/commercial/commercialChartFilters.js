import { detectRevenueActivity } from '../../services/financialPlanService.js';
const ACTIVITY_LABELS = {
  oeufs: 'Œufs / tablettes',
  poulets_chair: 'Poulets chair',
  bovins: 'Bovins / embouche',
  fumier_pondeuses: 'Fumier pondeuses',
  fumier_chair: 'Fumier chair',
};


const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();

export function clientFilterKey(order = {}) {
  const id = clean(order.client_id);
  if (id) return id;
  const label = lower(order.client_nom || order.client_name || order.client_label || 'passage');
  return `walkin:${label}`;
}

export function clientFilterLabel(order = {}, clients = []) {
  const id = clean(order.client_id);
  if (id) {
    const hit = arr(clients).find((c) => String(c.id) === id);
    return hit?.nom || hit?.name || order.client_nom || order.client_name || id;
  }
  return order.client_nom || order.client_name || order.client_label || 'Client passage';
}

/** Options pour les filtres graphiques Commercial. */
export function buildCommercialFilterOptions({ salesOrders = [], clients = [] } = {}) {
  const clientMap = new Map();
  arr(clients).forEach((c) => {
    if (c.id) clientMap.set(String(c.id), c.nom || c.name || c.id);
  });

  arr(salesOrders).forEach((order) => {
    const key = clientFilterKey(order);
    if (!clientMap.has(key)) clientMap.set(key, clientFilterLabel(order, clients));
  });

  const activitySet = new Set();
  const productNames = new Map();
  arr(salesOrders).forEach((order) => {
    activitySet.add(detectRevenueActivity(order, {}));
    const name = clean(order.product_name || order.produit || order.source_label);
    if (name) productNames.set(name, name);
  });

  return {
    clients: [...clientMap.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    activities: [...activitySet].filter(Boolean).map((value) => ({ value, label: ACTIVITY_LABELS[value] || value })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    products: [...productNames.values()].sort((a, b) => a.localeCompare(b, 'fr')).map((value) => ({ value, label: value })),
  };
}

/** Filtre ventes pour graphiques — client, activité, produit (période = filtre ERP global). */
export function filterCommercialChartRows(rows = [], filters = {}) {
  const { clientId = '', activityKey = '', productName = '' } = filters;
  if (!clientId && !activityKey && !productName) return arr(rows);

  return arr(rows).filter((order) => {
    if (clientId && clientFilterKey(order) !== clientId) return false;
    if (activityKey && detectRevenueActivity(order, {}) !== activityKey) return false;
    if (productName) {
      const name = clean(order.product_name || order.produit || order.source_label);
      if (name !== productName) return false;
    }
    return true;
  });
}

export function applyCommercialChartFilters(props = {}, filters = {}) {
  const baseRows = arr(props.rows || props.salesOrders);
  const filtered = filterCommercialChartRows(baseRows, filters);
  return { ...props, rows: filtered, salesOrders: filtered };
}

export default applyCommercialChartFilters;
