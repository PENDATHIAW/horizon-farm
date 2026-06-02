export const BUILTIN_FEEDING_DEFAULTS = {
  bovin: { dailyKg: 4.5, days: 90, label: 'Bovin', minDailyKg: 3, maxDailyKg: 6 },
  ovin: { dailyKg: 0.75, days: 90, label: 'Ovin', minDailyKg: 0.5, maxDailyKg: 1 },
  caprin: { dailyKg: 0.6, days: 90, label: 'Caprin', minDailyKg: 0.4, maxDailyKg: 0.8 },
  chair: { dailyKg: 0.1, days: 45, label: 'Poulet chair', sacsPer100: 7, sacKg: 50 },
  ponte: { dailyKg: 0.135, days: 30, label: 'Pondeuse', minDailyKg: 0.12, maxDailyKg: 0.15 },
};

export const FARM_COST_SETTINGS_KEY = 'horizon_farm_cost_settings_v1';

export const DEFAULT_FARM_COST_SETTINGS = {
  feedingDefaults: { ...BUILTIN_FEEDING_DEFAULTS },
  defaultFeedPricePerKg: 0,
  defaultTargetMarginPct: 30,
  broilerCrateSize: 50,
  broilerCratePrice: 32000,
  layerAmortizationDays: 540,
  eggsPerTablet: 30,
  broilerPriceByWeight: {
    below1_5: 2500,
    at1_5: 3000,
    at1_7: 3500,
    at2_0: 4000,
  },
  updatedAt: null,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function normalizeFarmCostSettings(raw = {}) {
  const base = clone(DEFAULT_FARM_COST_SETTINGS);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    feedingDefaults: {
      ...base.feedingDefaults,
      ...(raw.feedingDefaults || {}),
      bovin: { ...base.feedingDefaults.bovin, ...(raw.feedingDefaults?.bovin || {}) },
      ovin: { ...base.feedingDefaults.ovin, ...(raw.feedingDefaults?.ovin || {}) },
      caprin: { ...base.feedingDefaults.caprin, ...(raw.feedingDefaults?.caprin || {}) },
      chair: { ...base.feedingDefaults.chair, ...(raw.feedingDefaults?.chair || {}) },
      ponte: { ...base.feedingDefaults.ponte, ...(raw.feedingDefaults?.ponte || {}) },
    },
    broilerPriceByWeight: {
      ...base.broilerPriceByWeight,
      ...(raw.broilerPriceByWeight || {}),
    },
  };
}

export function getFarmCostSettings() {
  if (typeof window === 'undefined') return normalizeFarmCostSettings();
  try {
    const raw = window.localStorage.getItem(FARM_COST_SETTINGS_KEY);
    if (!raw) return normalizeFarmCostSettings();
    return normalizeFarmCostSettings(JSON.parse(raw));
  } catch {
    return normalizeFarmCostSettings();
  }
}

export function saveFarmCostSettings(next = {}) {
  const normalized = normalizeFarmCostSettings({ ...next, updatedAt: new Date().toISOString() });
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FARM_COST_SETTINGS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('horizon-farm-cost-settings-changed', { detail: normalized }));
  }
  return normalized;
}

export function getFeedingDefaults() {
  return getFarmCostSettings().feedingDefaults;
}

export function resetFarmCostSettings() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(FARM_COST_SETTINGS_KEY);
  return normalizeFarmCostSettings();
}
