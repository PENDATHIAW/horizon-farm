const STORAGE_KEY = 'horizon_farm_pilotage_settings_v1';

export const DEFAULT_PILOTAGE_SETTINGS = {
  festival_dates: {
    tabaski: '',
    korite: '',
    magal: '',
    fin_annee: '',
    ramadan: '',
  },
  sanitary_min_days: 10,
  mortality_threshold_pct: 5,
  extra_vacuum_days: 7,
  next_band_size: 5000,
  bfr_min_coverage_pct: 50,
  ith_stress_threshold: 29,
  vip_client_ids: [],
};

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizePilotageSettings(raw = {}) {
  const festival = { ...DEFAULT_PILOTAGE_SETTINGS.festival_dates, ...(raw.festival_dates || {}) };
  return {
    ...DEFAULT_PILOTAGE_SETTINGS,
    ...raw,
    festival_dates: festival,
    sanitary_min_days: num(raw.sanitary_min_days, DEFAULT_PILOTAGE_SETTINGS.sanitary_min_days),
    mortality_threshold_pct: num(raw.mortality_threshold_pct, DEFAULT_PILOTAGE_SETTINGS.mortality_threshold_pct),
    extra_vacuum_days: num(raw.extra_vacuum_days, DEFAULT_PILOTAGE_SETTINGS.extra_vacuum_days),
    next_band_size: num(raw.next_band_size, DEFAULT_PILOTAGE_SETTINGS.next_band_size),
    bfr_min_coverage_pct: num(raw.bfr_min_coverage_pct, DEFAULT_PILOTAGE_SETTINGS.bfr_min_coverage_pct),
    ith_stress_threshold: num(raw.ith_stress_threshold, DEFAULT_PILOTAGE_SETTINGS.ith_stress_threshold),
    vip_client_ids: Array.isArray(raw.vip_client_ids) ? raw.vip_client_ids.map(String) : [],
  };
}

export function loadPilotageSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PILOTAGE_SETTINGS };
    return normalizePilotageSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PILOTAGE_SETTINGS };
  }
}

export function savePilotageSettings(settings = {}) {
  const normalized = normalizePilotageSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

/** Fusionne les paramètres pilotage locaux dans growth_settings pour les moteurs. */
export function mergePilotageIntoDataMap(dataMap = {}) {
  const pilotage = loadPilotageSettings();
  return {
    ...dataMap,
    growth_settings: {
      ...(dataMap.growth_settings || {}),
      ...pilotage,
      festival_dates: pilotage.festival_dates,
      next_band_size: pilotage.next_band_size,
    },
  };
}

export default loadPilotageSettings;
