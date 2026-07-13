import { supabase } from '../lib/supabase.js';
import { normalizeErpRole } from '../config/erpRoles.js';
import {
  DEFAULT_FARM,
  DEFAULT_FARM_ID,
  readCachedAccessibleFarms,
  writeCachedAccessibleFarms,
} from '../utils/farmScope.js';

const FARM_SELECT = [
  'id',
  'company_id',
  'owner_user_id',
  'name',
  'legal_name',
  'legal_entity_type',
  'registration_number',
  'location',
  'region',
  'country',
  'latitude',
  'longitude',
  'activity_type',
  'status',
  'is_default',
  'settings',
  'created_at',
  'updated_at',
].join(',');

const ACCESS_SELECT = [
  'id',
  'user_id',
  'farm_id',
  'access_role',
  'modules',
  'created_at',
  'updated_at',
].join(',');

const LOCAL_FARMS_STORE_KEY = 'horizon_farms_local_store';

const arr = (value) => (Array.isArray(value) ? value : []);

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `farm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFarm(row = {}) {
  if (!row?.id) return null;
  return {
    ...row,
    activity_type: Array.isArray(row.activity_type) ? row.activity_type : ['mixte'],
    settings: row.settings || {},
  };
}

function readLocalFarmStore() {
  if (typeof window === 'undefined') return [];
  try {
    return arr(JSON.parse(window.localStorage.getItem(LOCAL_FARMS_STORE_KEY) || '[]'));
  } catch {
    return [];
  }
}

function writeLocalFarmStore(farms = []) {
  if (typeof window === 'undefined') return farms;
  window.localStorage.setItem(LOCAL_FARMS_STORE_KEY, JSON.stringify(farms));
  writeCachedAccessibleFarms(farms.filter((farm) => farm.status !== 'archived'));
  return farms;
}

function mergeFarmLists(primary = [], secondary = []) {
  const map = new Map();
  [...arr(primary), ...arr(secondary)].forEach((farm) => {
    if (farm?.id) map.set(farm.id, normalizeFarm(farm));
  });
  if (!map.has(DEFAULT_FARM_ID)) map.set(DEFAULT_FARM_ID, DEFAULT_FARM);
  return [...map.values()].filter(Boolean);
}

function persistAccessible(farms = []) {
  const active = farms.filter((farm) => farm.status !== 'archived');
  writeCachedAccessibleFarms(active.length ? active : [DEFAULT_FARM]);
  return active.length ? active : [DEFAULT_FARM];
}

export function getDefaultFarmRecord(farms = []) {
  const list = Array.isArray(farms) ? farms : [];
  return list.find((farm) => farm.is_default && farm.status !== 'archived') || list.find((farm) => farm.status !== 'archived') || DEFAULT_FARM;
}

export function canManageFarms(user = {}) {
  const role = normalizeErpRole(user?.role || user?.user_metadata?.role || user?.profile?.role || '', 'visiteur');
  return ['promotrice_direction', 'finance', 'admin_support'].includes(role);
}

export const farmsService = {
  async loadAccessibleFarms(userId) {
    if (!userId) {
      const cached = readCachedAccessibleFarms();
      return cached.length ? cached : [DEFAULT_FARM];
    }

    const { data, error } = await supabase
      .from('farms')
      .select(FARM_SELECT)
      .neq('status', 'archived')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error || !Array.isArray(data) || !data.length) {
      const merged = mergeFarmLists(readCachedAccessibleFarms(), readLocalFarmStore());
      return persistAccessible(merged);
    }

    const farms = mergeFarmLists(data.map(normalizeFarm).filter(Boolean), readLocalFarmStore());
    return persistAccessible(farms);
  },

  async loadAllFarms(userId, { includeArchived = true } = {}) {
    const accessible = await this.loadAccessibleFarms(userId);
    const local = readLocalFarmStore();
    let query = supabase.from('farms').select(FARM_SELECT).order('is_default', { ascending: false }).order('name', { ascending: true });
    if (!includeArchived) query = query.neq('status', 'archived');
    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      const merged = mergeFarmLists(accessible, local);
      return includeArchived ? merged : merged.filter((farm) => farm.status !== 'archived');
    }
    const merged = mergeFarmLists(data.map(normalizeFarm).filter(Boolean), local);
    writeLocalFarmStore(merged);
    return includeArchived ? merged : merged.filter((farm) => farm.status !== 'archived');
  },

  async loadUserFarmAccess(userId) {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('user_farm_access')
      .select(ACCESS_SELECT)
      .eq('user_id', userId);

    if (error || !Array.isArray(data)) return [];
    return data;
  },

  async loadFarmAccess(farmId) {
    if (!farmId) return [];
    const { data, error } = await supabase
      .from('user_farm_access')
      .select(ACCESS_SELECT)
      .eq('farm_id', farmId);
    if (error || !Array.isArray(data)) return [];
    return data;
  },

  async ensureDefaultFarm(userId, companyId) {
    const farms = await this.loadAccessibleFarms(userId);
    if (farms.some((farm) => farm.is_default && farm.id !== DEFAULT_FARM_ID)) {
      return getDefaultFarmRecord(farms);
    }

    if (!companyId) return getDefaultFarmRecord(farms);

    const payload = {
      id: DEFAULT_FARM_ID,
      company_id: companyId,
      owner_user_id: userId,
      name: 'Horizon Farm',
      legal_name: 'Horizon Farm',
      country: 'SN',
      activity_type: ['mixte'],
      status: 'active',
      is_default: true,
      settings: {},
    };

    const { data, error } = await supabase
      .from('farms')
      .upsert(payload, { onConflict: 'id' })
      .select(FARM_SELECT)
      .maybeSingle();

    if (error || !data) return getDefaultFarmRecord(farms);
    const farm = normalizeFarm(data);
    writeCachedAccessibleFarms([farm]);
    return farm;
  },

  async createFarm(payload = {}, userId, companyId) {
    const record = {
      ...payload,
      id: payload.id || generateId(),
      company_id: payload.company_id || companyId,
      owner_user_id: payload.owner_user_id || userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('farms')
      .insert(record)
      .select(FARM_SELECT)
      .maybeSingle();

    let farm = error || !data ? normalizeFarm(record) : normalizeFarm(data);
    const local = mergeFarmLists(readLocalFarmStore(), [farm]);
    writeLocalFarmStore(local);
    persistAccessible(local.filter((entry) => entry.status !== 'archived'));

    if (userId) {
      await this.saveUserFarmAccess(farm.id, [{ user_id: userId, access_role: 'promotrice_direction' }], userId);
    }

    return { farm, error: error?.message || null, localOnly: Boolean(error) };
  },

  async updateFarm(farmId, payload = {}) {
    if (!farmId || farmId === DEFAULT_FARM_ID) {
      const current = mergeFarmLists(readLocalFarmStore(), readCachedAccessibleFarms()).find((farm) => farm.id === farmId) || DEFAULT_FARM;
      const next = normalizeFarm({ ...current, ...payload, id: farmId, updated_at: new Date().toISOString() });
      const local = mergeFarmLists(readLocalFarmStore(), [next]);
      writeLocalFarmStore(local);
      persistAccessible(local.filter((entry) => entry.status !== 'archived'));
      return { farm: next, error: null, localOnly: true };
    }

    const { data, error } = await supabase
      .from('farms')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', farmId)
      .select(FARM_SELECT)
      .maybeSingle();

    let farm = error || !data
      ? normalizeFarm({ ...(readLocalFarmStore().find((entry) => entry.id === farmId) || {}), ...payload, id: farmId })
      : normalizeFarm(data);

    const local = mergeFarmLists(readLocalFarmStore(), [farm]);
    writeLocalFarmStore(local);
    persistAccessible(local.filter((entry) => entry.status !== 'archived'));
    return { farm, error: error?.message || null, localOnly: Boolean(error) };
  },

  async archiveFarm(farmId) {
    if (!farmId || farmId === DEFAULT_FARM_ID) {
      throw new Error('Horizon Farm ne peut pas être archivée.');
    }
    return this.updateFarm(farmId, { status: 'archived', is_default: false });
  },

  async setDefaultFarm(farmId, companyId) {
    if (!farmId) throw new Error('Ferme invalide.');

    if (companyId) {
      await supabase.from('farms').update({ is_default: false }).eq('company_id', companyId);
    }

    const local = readLocalFarmStore().map((farm) => ({
      ...farm,
      is_default: farm.id === farmId,
    }));
    writeLocalFarmStore(local);

    const { data, error } = await supabase
      .from('farms')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', farmId)
      .select(FARM_SELECT)
      .maybeSingle();

    const farm = normalizeFarm(data || local.find((entry) => entry.id === farmId));
    persistAccessible(local.filter((entry) => entry.status !== 'archived'));
    return { farm, error: error?.message || null };
  },

  async saveUserFarmAccess(farmId, assignments = [], creatorUserId = null) {
    if (!farmId) return { rows: [], error: 'Ferme invalide' };
    const rows = arr(assignments).filter((entry) => entry.user_id);

    if (!rows.length && creatorUserId) {
      rows.push({ user_id: creatorUserId, access_role: 'promotrice_direction' });
    }

    const payload = rows.map((entry) => ({
      user_id: entry.user_id,
      farm_id: farmId,
      access_role: normalizeErpRole(entry.access_role, 'terrain'),
      modules: entry.modules || {},
    }));

    const { data, error } = await supabase
      .from('user_farm_access')
      .upsert(payload, { onConflict: 'user_id,farm_id' })
      .select(ACCESS_SELECT);

    return { rows: arr(data), error: error?.message || null, localOnly: Boolean(error) };
  },


  getCachedAccessibleFarms() {
    return readCachedAccessibleFarms();
  },

  getDefaultFarm() {
    return getDefaultFarmRecord(readCachedAccessibleFarms());
  },
};

export { DEFAULT_FARM, DEFAULT_FARM_ID };
