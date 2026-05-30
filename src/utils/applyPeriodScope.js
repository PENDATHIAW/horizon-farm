import { filterRowsByPeriodScope, isAllTimeScope, normalizePeriodScope } from './periodScope';
import { periodFilterCacheKey, readCachedFilteredRows, writeCachedFilteredRows } from './periodFilterCache';

const arr = (value) => (Array.isArray(value) ? value : []);

function scopeKeyOf(scope = {}) {
  return JSON.stringify(normalizePeriodScope(scope));
}

function filterRowsCached(rows = [], scope = {}, label = '', cacheGeneration = '') {
  if (isAllTimeScope(scope)) return rows;
  const list = arr(rows);
  if (!list.length) return list;
  const scopeKey = scopeKeyOf(scope);
  const cacheKey = periodFilterCacheKey(list, scopeKey, cacheGeneration, label);
  const cached = readCachedFilteredRows(cacheKey);
  if (cached) return cached;
  const filtered = filterRowsByPeriodScope(list, scope);
  writeCachedFilteredRows(cacheKey, filtered);
  return filtered;
}

/** Données de référence non filtrées par période (objectifs annuels, comparaisons). */
export const PERIOD_UNFILTERED_PROP_KEYS = new Set([
  'salesOrdersAll',
  'paymentsAll',
  'transactionsAll',
  'businessEventsAll',
  'auditLogsAll',
]);

/** Clés de props contenant des enregistrements datés — filtrées globalement. */
export const PERIOD_FILTER_PROP_KEYS = new Set([
  'rows',
  'salesOrders',
  'sales_orders',
  'payments',
  'paymentsList',
  'transactions',
  'finances',
  'productionLogs',
  'production_oeufs_logs',
  'alimentationLogs',
  'alimentation_logs',
  'documents',
  'invoices',
  'invoicesList',
  'deliveries',
  'deliveriesList',
  'orderItems',
  'businessEvents',
  'business_events',
  'tracabilite',
  'auditLogs',
  'audit_logs',
  'whatsappLogs',
  'rapports',
  'reports',
  'opportunities',
  'investissements',
  'sante',
  'vaccins',
  'events',
  'data',
  'reportData',
]);

/** Clés dans dataMap / objets imbriqués. */
export const PERIOD_FILTER_DATA_MAP_KEYS = new Set([
  'sales_orders',
  'payments',
  'finances',
  'production_oeufs_logs',
  'alimentation_logs',
  'documents',
  'business_events',
  'tracabilite',
  'audit_logs',
  'whatsapp_logs',
  'sales_opportunities',
  'investissements',
  'sante',
  'deliveries',
  'invoices',
  'sales_order_items',
  'rapports',
]);

function filterValue(value, scope, label, cacheGeneration) {
  if (isAllTimeScope(scope)) return value;
  if (Array.isArray(value)) return filterRowsCached(value, scope, label, cacheGeneration);
  if (value && typeof value === 'object') {
    const next = { ...value };
    Object.keys(next).forEach((key) => {
      if (PERIOD_FILTER_DATA_MAP_KEYS.has(key) && Array.isArray(next[key])) {
        next[key] = filterRowsCached(next[key], scope, `${label}.${key}`, cacheGeneration);
      }
    });
    return next;
  }
  return value;
}

export function applyPeriodScopeToProps(props = {}, scope = {}, options = {}) {
  const cacheGeneration = options.cacheGeneration || '';
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') {
    return { ...props, periodScope: normalized, periodFiltered: false };
  }

  const next = { ...props, periodScope: normalized, periodFiltered: true };
  Object.keys(next).forEach((key) => {
    if (PERIOD_UNFILTERED_PROP_KEYS.has(key)) return;
    if (!PERIOD_FILTER_PROP_KEYS.has(key)) return;
    next[key] = filterValue(next[key], normalized, key, cacheGeneration);
  });

  if (next.dataMap && typeof next.dataMap === 'object') {
    next.dataMap = filterValue(next.dataMap, normalized, 'dataMap', cacheGeneration);
  }
  if (next.data && typeof next.data === 'object' && !Array.isArray(next.data)) {
    next.data = filterValue(next.data, normalized, 'data', cacheGeneration);
  }

  return next;
}

export function applyPeriodScopeToDataMap(dataMap = {}, scope = {}, cacheGeneration = '') {
  if (isAllTimeScope(scope)) return dataMap;
  const next = { ...dataMap };
  PERIOD_FILTER_DATA_MAP_KEYS.forEach((key) => {
    if (Array.isArray(next[key])) {
      next[key] = filterRowsCached(next[key], scope, `dataMap.${key}`, cacheGeneration);
    }
  });
  return next;
}
