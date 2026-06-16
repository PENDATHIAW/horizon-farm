import { supabase } from '../lib/supabase';
import { RH_DEFAULT_PEOPLE, RH_STORAGE_KEY, RH_TEAMS } from '../utils/rhDirectory.js';

const SETTINGS_ROW_ID = 'default';

function normalizeDirectory(raw = {}) {
  const people = Array.isArray(raw.people) && raw.people.length ? raw.people : RH_DEFAULT_PEOPLE;
  const mergedPeople = [...people, ...RH_DEFAULT_PEOPLE.filter((demo) => !people.some((p) => p.id === demo.id))];
  return {
    people: mergedPeople,
    teams: Array.isArray(raw.teams) && raw.teams.length ? raw.teams : RH_TEAMS,
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

function writeLocal(directory) {
  if (typeof window === 'undefined') return directory;
  window.localStorage.setItem(RH_STORAGE_KEY, JSON.stringify(directory));
  window.dispatchEvent(new CustomEvent('horizon-farm-rh-updated', { detail: directory }));
  return directory;
}

function readLocal() {
  if (typeof window === 'undefined') return normalizeDirectory({});
  try {
    const raw = window.localStorage.getItem(RH_STORAGE_KEY);
    if (!raw) return normalizeDirectory({});
    return normalizeDirectory(JSON.parse(raw));
  } catch {
    return normalizeDirectory({});
  }
}

export const rhDirectoryService = {
  async load() {
    const { data, error } = await supabase
      .from('farm_rh_directory')
      .select('directory, updated_at')
      .eq('id', SETTINGS_ROW_ID)
      .maybeSingle();

    if (error || !data?.directory) {
      return readLocal();
    }

    return writeLocal(normalizeDirectory({
      ...data.directory,
      updated_at: data.updated_at || data.directory?.updated_at,
    }));
  },

  async save(directory = {}) {
    const normalized = normalizeDirectory({
      ...directory,
      updated_at: new Date().toISOString(),
    });
    writeLocal(normalized);

    const { data, error } = await supabase
      .from('farm_rh_directory')
      .upsert(
        {
          id: SETTINGS_ROW_ID,
          directory: { people: normalized.people, teams: normalized.teams },
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
    }));
  },

  getCached() {
    return readLocal();
  },
};
