import { supabase } from '../lib/supabase.js';
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

function normalizeFarm(row = {}) {
  if (!row?.id) return null;
  return {
    ...row,
    activity_type: Array.isArray(row.activity_type) ? row.activity_type : ['mixte'],
    settings: row.settings || {},
  };
}

export function getDefaultFarmRecord(farms = []) {
  const list = Array.isArray(farms) ? farms : [];
  return list.find((farm) => farm.is_default) || list[0] || DEFAULT_FARM;
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
      const cached = readCachedAccessibleFarms();
      return cached.length ? cached : [DEFAULT_FARM];
    }

    const farms = data.map(normalizeFarm).filter(Boolean);
    return writeCachedAccessibleFarms(farms);
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

  getCachedAccessibleFarms() {
    return readCachedAccessibleFarms();
  },

  getDefaultFarm() {
    return getDefaultFarmRecord(readCachedAccessibleFarms());
  },
};

export { DEFAULT_FARM, DEFAULT_FARM_ID };
