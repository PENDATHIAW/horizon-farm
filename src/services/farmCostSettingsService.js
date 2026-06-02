import { supabase } from '../lib/supabase';
import {
  DEFAULT_FARM_COST_SETTINGS,
  FARM_COST_SETTINGS_KEY,
  normalizeFarmCostSettings,
} from './farmCostSettings.js';

const SETTINGS_ROW_ID = 'default';

function writeLocal(settings) {
  if (typeof window === 'undefined') return settings;
  window.localStorage.setItem(FARM_COST_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('horizon-farm-cost-settings-changed', { detail: settings }));
  return settings;
}

function readLocal() {
  if (typeof window === 'undefined') return normalizeFarmCostSettings();
  try {
    const raw = window.localStorage.getItem(FARM_COST_SETTINGS_KEY);
    if (!raw) return normalizeFarmCostSettings();
    return normalizeFarmCostSettings(JSON.parse(raw));
  } catch {
    return normalizeFarmCostSettings();
  }
}

export const farmCostSettingsService = {
  async load() {
    const { data, error } = await supabase
      .from('farm_cost_settings')
      .select('settings, updated_at')
      .eq('id', SETTINGS_ROW_ID)
      .maybeSingle();

    if (error || !data?.settings) {
      return readLocal();
    }

    const normalized = normalizeFarmCostSettings({
      ...data.settings,
      updatedAt: data.updated_at || data.settings?.updatedAt || null,
    });
    return writeLocal(normalized);
  },

  async save(next = {}) {
    const normalized = normalizeFarmCostSettings({
      ...next,
      updatedAt: new Date().toISOString(),
    });
    writeLocal(normalized);

    const { data, error } = await supabase
      .from('farm_cost_settings')
      .upsert(
        {
          id: SETTINGS_ROW_ID,
          settings: normalized,
          updated_at: normalized.updatedAt,
        },
        { onConflict: 'id' },
      )
      .select('settings, updated_at')
      .single();

    if (error) {
      return normalized;
    }

    const merged = normalizeFarmCostSettings({
      ...(data?.settings || normalized),
      updatedAt: data?.updated_at || normalized.updatedAt,
    });
    return writeLocal(merged);
  },

  getCached() {
    return readLocal();
  },

  reset() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(FARM_COST_SETTINGS_KEY);
    }
    const defaults = normalizeFarmCostSettings();
    writeLocal(defaults);
    return defaults;
  },
};

export { DEFAULT_FARM_COST_SETTINGS };
