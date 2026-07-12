import { supabase } from '../lib/supabase';
import { RH_DEFAULT_PEOPLE, RH_STORAGE_KEY, RH_TEAMS } from '../utils/rhDirectory.js';

const SETTINGS_ROW_ID = 'default';
const storageKey = (farmId = SETTINGS_ROW_ID) => `${RH_STORAGE_KEY}:${farmId}`;

function normalizeDirectory(raw = {}) {
  const people = Array.isArray(raw.people) && raw.people.length ? raw.people : RH_DEFAULT_PEOPLE;
  const mergedPeople = [...people, ...RH_DEFAULT_PEOPLE.filter((demo) => !people.some((p) => p.id === demo.id))];
  return {
    people: mergedPeople,
    teams: Array.isArray(raw.teams) && raw.teams.length ? raw.teams : RH_TEAMS,
    absences: Array.isArray(raw.absences) ? raw.absences : [],
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

function writeLocal(directory, farmId = SETTINGS_ROW_ID) {
  if (typeof window === 'undefined') return directory;
  window.localStorage.setItem(storageKey(farmId), JSON.stringify(directory));
  window.dispatchEvent(new CustomEvent('horizon-farm-rh-updated', { detail: directory }));
  return directory;
}

function readLocal(farmId = SETTINGS_ROW_ID) {
  if (typeof window === 'undefined') return normalizeDirectory({});
  try {
    const raw = window.localStorage.getItem(storageKey(farmId)) || window.localStorage.getItem(RH_STORAGE_KEY);
    if (!raw) return normalizeDirectory({});
    return normalizeDirectory(JSON.parse(raw));
  } catch {
    return normalizeDirectory({});
  }
}

export const rhDirectoryService = {
  async load({ farmId = SETTINGS_ROW_ID } = {}) {
    const { data, error } = await supabase
      .from('farm_rh_directory')
      .select('directory, updated_at')
      .eq('id', farmId)
      .maybeSingle();

    if (error || !data?.directory) {
      return readLocal(farmId);
    }

    return writeLocal(normalizeDirectory({
      ...data.directory,
      updated_at: data.updated_at || data.directory?.updated_at,
    }), farmId);
  },

  async save(directory = {}, { farmId = SETTINGS_ROW_ID } = {}) {
    const normalized = normalizeDirectory({
      ...directory,
      updated_at: new Date().toISOString(),
    });
    writeLocal(normalized, farmId);

    const { data, error } = await supabase
      .from('farm_rh_directory')
      .upsert(
        {
          id: farmId,
          farm_id: farmId,
          directory: { people: normalized.people, teams: normalized.teams, absences: normalized.absences },
          updated_at: normalized.updated_at,
        },
        { onConflict: 'id' },
      )
      .select('directory, updated_at')
      .single();

    if (error) return normalized;

    return writeLocal(normalizeDirectory({
      ...(data?.directory || normalized),
      updated_at: data?.updated_at || normalized.updated_at,
    }), farmId);
  },

  getCached({ farmId = SETTINGS_ROW_ID } = {}) {
    return readLocal(farmId);
  },
};
