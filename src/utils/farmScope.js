import { normalizeErpRole } from '../config/erpRoles.js';

/** Scope ferme global — calqué sur periodScope.js (Phase 2 fondations). */

export const FARM_SCOPE_KEY = 'horizon_farm_scope';
export const FARM_SCOPE_CHANGED = 'horizon-farm-scope-changed';
export const FARMS_CACHE_KEY = 'horizon_farm_accessible_farms';

/** UUID stable — aligné migration 20260606120000_multi_farm_foundations.sql */
export const DEFAULT_FARM_ID = 'a0000000-0000-4000-8000-000000000001';

export const DEFAULT_FARM = Object.freeze({
  id: DEFAULT_FARM_ID,
  company_id: 'a0000000-0000-4000-8000-000000000010',
  name: 'Horizon Farm',
  legal_name: 'Horizon Farm',
  country: 'SN',
  activity_type: ['mixte'],
  status: 'active',
  is_default: true,
  settings: {},
});

export const DEFAULT_FARM_SCOPE = Object.freeze({
  mode: 'single',
  farmId: DEFAULT_FARM_ID,
});

const arr = (value) => (Array.isArray(value) ? value : []);

export function normalizeFarmScope(scope = {}, accessibleFarms = []) {
  const farms = arr(accessibleFarms).length ? accessibleFarms : [DEFAULT_FARM];

  if (scope.mode === 'all') {
    return {
      mode: 'all',
      farmId: null,
      farmIds: farms.map((farm) => farm.id),
    };
  }

  const requestedId = scope.farmId || scope.farm_id || null;
  const defaultFarm = farms.find((farm) => farm.is_default) || farms[0] || DEFAULT_FARM;
  const farmId = requestedId && farms.some((farm) => farm.id === requestedId)
    ? requestedId
    : defaultFarm.id;

  return {
    mode: 'single',
    farmId,
    farmIds: [farmId],
  };
}

export function readFarmScope(accessibleFarms = []) {
  if (typeof window === 'undefined') {
    return normalizeFarmScope(DEFAULT_FARM_SCOPE, accessibleFarms);
  }
  try {
    const raw = JSON.parse(window.localStorage.getItem(FARM_SCOPE_KEY) || '{}');
    return normalizeFarmScope(raw, accessibleFarms);
  } catch {
    return normalizeFarmScope(DEFAULT_FARM_SCOPE, accessibleFarms);
  }
}

export function writeFarmScope(scope = {}, accessibleFarms = []) {
  const next = normalizeFarmScope(scope, accessibleFarms);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FARM_SCOPE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(FARM_SCOPE_CHANGED, { detail: next }));
  }
  return next;
}

export function isAllFarmsScope(scope = readFarmScope()) {
  return normalizeFarmScope(scope).mode === 'all';
}

export function isSingleFarmScope(scope = readFarmScope()) {
  return normalizeFarmScope(scope).mode === 'single';
}

export function selectedFarmId(scope = readFarmScope(), accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (normalized.mode === 'all') return null;
  return normalized.farmId;
}

export function formatFarmScopeLabel(scope = readFarmScope(), accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (normalized.mode === 'all') return 'Toutes les fermes';
  const farm = arr(accessibleFarms).find((entry) => entry.id === normalized.farmId)
    || (normalized.farmId === DEFAULT_FARM_ID ? DEFAULT_FARM : null);
  return farm?.name || 'Horizon Farm';
}

export function shouldShowFarmSelector(accessibleFarms = []) {
  return arr(accessibleFarms).filter((farm) => farm.status !== 'archived').length > 1;
}

/** Filtrage actif uniquement si explicitement activé (Phase 2 — pas de régression mono-ferme). */
export function isFarmScopeFilteringEnabled(options = {}) {
  if (options.forceFilter === true) return true;
  if (options.filteringEnabled === true) return true;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_FARM_FILTER === 'true') {
    return true;
  }
  return false;
}

export function rowFarmId(row = {}) {
  return row.farm_id || row.farmId || null;
}

export function isRowInFarmScope(row = {}, scope = readFarmScope(), accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (normalized.mode === 'all') return true;
  const farmId = rowFarmId(row);
  if (!farmId) return true;
  return farmId === normalized.farmId;
}

export function filterRowsByFarmScope(rows = [], scope = readFarmScope(), accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (normalized.mode === 'all') return arr(rows);
  return arr(rows).filter((row) => isRowInFarmScope(row, normalized, accessibleFarms));
}

export function readCachedAccessibleFarms() {
  if (typeof window === 'undefined') return [DEFAULT_FARM];
  try {
    const raw = JSON.parse(window.localStorage.getItem(FARMS_CACHE_KEY) || '[]');
    return arr(raw).length ? raw : [DEFAULT_FARM];
  } catch {
    return [DEFAULT_FARM];
  }
}

export function writeCachedAccessibleFarms(farms = []) {
  const list = arr(farms).length ? farms : [DEFAULT_FARM];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FARMS_CACHE_KEY, JSON.stringify(list));
  }
  return list;
}

export function resolveFarmContext(scope = {}, accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const farms = arr(accessibleFarms).length ? accessibleFarms : [DEFAULT_FARM];
  const activeFarm = normalized.mode === 'single'
    ? farms.find((farm) => farm.id === normalized.farmId) || DEFAULT_FARM
    : null;
  return {
    scope: normalized,
    activeFarm,
    accessibleFarms: farms,
    multiFarmEnabled: shouldShowFarmSelector(farms),
    filteringEnabled: isFarmScopeFilteringEnabled(),
  };
}

const ALL_FARMS_ROLES = new Set(['promotrice_direction', 'finance', 'admin_support']);

export function canSelectAllFarmsScope(user = {}) {
  const role = normalizeErpRole(user?.role || user?.user_metadata?.role || user?.profile?.role || '', 'visiteur');
  return ALL_FARMS_ROLES.has(role);
}
