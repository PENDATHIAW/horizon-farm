import { filterRowsByPeriodScope, isAllTimeScope, normalizePeriodScope } from './periodScope';

const arr = (value) => (Array.isArray(value) ? value : []);

/** Données de référence non filtrées par période (objectifs annuels, comparaisons). */
export const PERIOD_UNFILTERED_PROP_KEYS = new Set([
  'salesOrdersAll',
  'paymentsAll',
  'transactionsAll',
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

function filterValue(value, scope) {
  if (isAllTimeScope(scope)) return value;
  if (Array.isArray(value)) return filterRowsByPeriodScope(value, scope);
  if (value && typeof value === 'object') {
    const next = { ...value };
    Object.keys(next).forEach((key) => {
      if (PERIOD_FILTER_DATA_MAP_KEYS.has(key) && Array.isArray(next[key])) {
        next[key] = filterRowsByPeriodScope(next[key], scope);
      }
    });
    return next;
  }
  return value;
}

export function applyPeriodScopeToProps(props = {}, scope = {}) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') {
    return { ...props, periodScope: normalized, periodFiltered: false };
  }

  const next = { ...props, periodScope: normalized, periodFiltered: true };
  Object.keys(next).forEach((key) => {
    if (PERIOD_UNFILTERED_PROP_KEYS.has(key)) return;
    if (!PERIOD_FILTER_PROP_KEYS.has(key)) return;
    next[key] = filterValue(next[key], normalized);
  });

  if (next.dataMap && typeof next.dataMap === 'object') {
    next.dataMap = filterValue(next.dataMap, normalized);
  }
  if (next.data && typeof next.data === 'object' && !Array.isArray(next.data)) {
    next.data = filterValue(next.data, normalized);
  }

  return next;
}

export function applyPeriodScopeToDataMap(dataMap = {}, scope = {}) {
  if (isAllTimeScope(scope)) return dataMap;
  const next = { ...dataMap };
  PERIOD_FILTER_DATA_MAP_KEYS.forEach((key) => {
    if (Array.isArray(next[key])) next[key] = filterRowsByPeriodScope(next[key], scope);
  });
  return next;
}
