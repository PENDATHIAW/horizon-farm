import toast from 'react-hot-toast';
import {
  isAllFarmsScope,
  isFarmScopeFilteringEnabled,
  normalizeFarmScope,
  selectedFarmId,
} from './farmScope.js';

/** Modules CRUD recevant farm_id à la création (Phase 2 P0). */
export const FARM_SCOPED_CREATE_MODULES = new Set([
  'animaux',
  'avicole',
  'stock',
  'sales_orders',
  'finances',
  'cultures',
  'business_events',
  'alimentation_logs',
  'production_oeufs_logs',
  'sante',
]);

export const CREATE_REQUIRES_FARM_ERROR = 'CREATE_REQUIRES_FARM';

const arr = (value) => (Array.isArray(value) ? value : []);

export function resolveCreateFarmId(farmScope = {}, accessibleFarms = [], payload = {}) {
  const explicit = payload.farm_id || payload.farmId || null;
  if (explicit) return explicit;

  const normalized = normalizeFarmScope(farmScope, accessibleFarms);
  if (normalized.mode === 'all') return null;
  return selectedFarmId(normalized, accessibleFarms);
}

export function validateCreateFarmContext(moduleKey, payload = {}, farmContext = {}) {
  if (!FARM_SCOPED_CREATE_MODULES.has(moduleKey)) {
    return { ok: true, payload, farmId: null };
  }
  if (!isFarmScopeFilteringEnabled(farmContext)) {
    return { ok: true, payload, farmId: null };
  }

  const { scope = {}, accessibleFarms = [] } = farmContext;
  const farmId = resolveCreateFarmId(scope, accessibleFarms, payload);

  if (isAllFarmsScope(scope) && !farmId) {
    return {
      ok: false,
      error: CREATE_REQUIRES_FARM_ERROR,
      message: 'Choisissez une ferme active avant de créer cette donnée.',
    };
  }

  if (!farmId) {
    return { ok: true, payload, farmId: null };
  }

  return {
    ok: true,
    farmId,
    payload: { ...payload, farm_id: farmId },
  };
}

export function enrichPayloadWithFarmId(moduleKey, payload = {}, farmContext = {}) {
  const result = validateCreateFarmContext(moduleKey, payload, farmContext);
  if (!result.ok) return result;
  return result;
}

export function wrapCreateWithFarmScope(createFn, moduleKey, farmContext = {}) {
  if (typeof createFn !== 'function') return createFn;
  return async (payload = {}, ...rest) => {
    const result = enrichPayloadWithFarmId(moduleKey, payload, farmContext);
    if (!result.ok) {
      toast.error(result.message || 'Sélectionnez une ferme avant de créer.');
      throw new Error(result.error || CREATE_REQUIRES_FARM_ERROR);
    }
    return createFn(result.payload, ...rest);
  };
}

export function wrapCrudCreatesWithFarmScope(crudModule = {}, moduleKey, farmContext = {}) {
  if (!crudModule?.create) return crudModule;
  return {
    ...crudModule,
    create: wrapCreateWithFarmScope(crudModule.create, moduleKey, farmContext),
  };
}

export function buildFarmScopeCreateContext(farmScope = {}, accessibleFarms = [], activeFarm = null) {
  return {
    scope: normalizeFarmScope(farmScope, accessibleFarms),
    accessibleFarms: arr(accessibleFarms),
    activeFarm,
    filteringEnabled: isFarmScopeFilteringEnabled(),
  };
}
