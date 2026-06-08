import {
  filterRowsByFarmScope,
  isAllFarmsScope,
  isFarmScopeFilteringEnabled,
  normalizeFarmScope,
} from './farmScope.js';

/** Clés CRUD / dataMap avec farm_id Phase 2 (P0). */
export const FARM_FILTER_DATA_MAP_KEYS = new Set([
  'animaux',
  'avicole',
  'stock',
  'sales_orders',
  'finances',
  'cultures',
  'business_events',
]);

/** Clés props miroir des modules — filtrage futur Phase 5. */
export const FARM_FILTER_PROP_KEYS = new Set([
  'rows',
  'animaux',
  'lots',
  'avicole',
  'stocks',
  'stock',
  'salesOrders',
  'sales_orders',
  'transactions',
  'finances',
  'cultures',
  'businessEvents',
  'business_events',
]);

function shouldApplyFilter(scope = {}, options = {}) {
  if (isAllFarmsScope(scope)) return false;
  return isFarmScopeFilteringEnabled(options);
}

function filterValue(value, scope, accessibleFarms, options) {
  if (!shouldApplyFilter(scope, options)) return value;
  if (Array.isArray(value)) return filterRowsByFarmScope(value, scope, accessibleFarms);
  if (value && typeof value === 'object') {
    const next = { ...value };
    Object.keys(next).forEach((key) => {
      if (FARM_FILTER_DATA_MAP_KEYS.has(key) && Array.isArray(next[key])) {
        next[key] = filterRowsByFarmScope(next[key], scope, accessibleFarms);
      }
    });
    return next;
  }
  return value;
}

export function applyFarmScopeToProps(props = {}, scope = {}, options = {}) {
  const accessibleFarms = options.accessibleFarms || [];
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const filtering = shouldApplyFilter(normalized, options);

  const next = {
    ...props,
    farmScope: normalized,
    farmFiltered: filtering,
    activeFarm: options.activeFarm || null,
    accessibleFarms,
  };

  if (!filtering) return next;

  Object.keys(next).forEach((key) => {
    if (!FARM_FILTER_PROP_KEYS.has(key)) return;
    next[key] = filterValue(next[key], normalized, accessibleFarms, options);
  });

  if (next.dataMap && typeof next.dataMap === 'object') {
    next.dataMap = applyFarmScopeToDataMap(next.dataMap, normalized, options);
  }

  return next;
}

export function applyFarmScopeToDataMap(dataMap = {}, scope = {}, options = {}) {
  const accessibleFarms = options.accessibleFarms || [];
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (!shouldApplyFilter(normalized, options)) {
    return { ...dataMap, farmScope: normalized, farmFiltered: false };
  }

  const next = { ...dataMap, farmScope: normalized, farmFiltered: true };
  FARM_FILTER_DATA_MAP_KEYS.forEach((key) => {
    if (Array.isArray(next[key])) {
      next[key] = filterRowsByFarmScope(next[key], normalized, accessibleFarms);
    }
  });
  return next;
}
