/**
 * Commercial V1 P0 — backfill idempotent farm_id sur ventes historiques.
 * Ne modifie que les lignes sans farm_id.
 */

import { DEFAULT_FARM_ID } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();

export function resolveDefaultCommercialFarmId(options = {}) {
  const farms = arr(options.accessibleFarms);
  const defaultFarm = farms.find((farm) => farm.is_default) || farms[0];
  return options.defaultFarmId || defaultFarm?.id || DEFAULT_FARM_ID;
}

function stampIfMissing(row = {}, farmId = '') {
  if (!row || !farmId || row.farm_id || row.farmId) return row;
  return { ...row, farm_id: farmId };
}

function orderFarmById(orders = []) {
  const map = new Map();
  arr(orders).forEach((order) => {
    const farmId = clean(order.farm_id || order.farmId);
    if (farmId) map.set(String(order.id), farmId);
  });
  return map;
}

/**
 * Backfill prudent et rejouable sur collections commerciales locales.
 * @returns {{ stats: object, data: object }}
 */
export function backfillCommercialFarmId(data = {}, options = {}) {
  const farmId = resolveDefaultCommercialFarmId(options);
  const stats = {
    sales_orders: 0,
    sales_order_items: 0,
    payments: 0,
    deliveries: 0,
    invoices: 0,
    finances: 0,
    business_events: 0,
  };

  const sales_orders = arr(data.sales_orders).map((row) => {
    const next = stampIfMissing(row, farmId);
    if (next !== row) stats.sales_orders += 1;
    return next;
  });

  const orderFarmMap = orderFarmById(sales_orders);

  const inheritFromOrder = (row = {}) => {
    const own = clean(row.farm_id || row.farmId);
    if (own) return row;
    const orderId = clean(row.order_id || row.sale_id || row.source_record_id || row.linked_sale_id);
    const inherited = orderFarmMap.get(orderId) || farmId;
    return inherited ? { ...row, farm_id: inherited } : row;
  };

  const patchCollection = (rows = [], key, inherit = false) => arr(rows).map((row) => {
    const base = inherit ? inheritFromOrder(row) : stampIfMissing(row, farmId);
    if (base !== row) stats[key] += 1;
    return base;
  });

  const sales_order_items = patchCollection(data.sales_order_items, 'sales_order_items', true);
  const payments = patchCollection(data.payments, 'payments', true);
  const deliveries = patchCollection(data.deliveries, 'deliveries', true);
  const invoices = patchCollection(data.invoices, 'invoices', true);

  const finances = arr(data.finances).map((row) => {
    const own = clean(row.farm_id || row.farmId);
    if (own) return row;
    const orderId = clean(row.order_id || row.sale_id || row.related_id || row.source_record_id || row.vente_id);
    const inherited = orderFarmMap.get(orderId) || farmId;
    const next = inherited ? { ...row, farm_id: inherited } : row;
    if (next !== row) stats.finances += 1;
    return next;
  });

  const business_events = arr(data.business_events).map((row) => {
    const own = clean(row.farm_id || row.farmId);
    if (own) return row;
    const orderId = clean(row.entity_id || row.linked_sale_id || row.source_record_id || row.related_id);
    const inherited = orderFarmMap.get(orderId) || farmId;
    const next = inherited ? { ...row, farm_id: inherited } : row;
    if (next !== row) stats.business_events += 1;
    return next;
  });

  return {
    stats,
    farmId,
    data: {
      ...data,
      sales_orders,
      sales_order_items,
      payments,
      deliveries,
      invoices,
      finances,
      business_events,
    },
  };
}
