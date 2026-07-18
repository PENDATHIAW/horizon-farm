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
  elevageThresholds: {
    mortalityAlertPct: 4,
    mortalityCriticalPct: 8,
    eggBreakAlertPct: 8,
    lowLayingPct: 65,
  },
  /**
   * Prix de vente suggérés élevage, en FCFA par kg de POIDS VIF (poids sur pied),
   * utilisés si la fiche animal n'a pas de prix/kg. Le moteur les multiplie par le
   * poids vif de l'animal : ce sont donc des prix « sur pied » (marché bétail),
   * PAS des prix de viande/carcasse (qui sont ~2 fois plus élevés). Valeurs
   * calées sur le marché sénégalais de l'embouche (bovin ~1 400, ovin/caprin ~2 000).
   */
  animalSalePricePerKg: {
    default: 1500,
    bovin: 1400,
    ovin: 2000,
    caprin: 2000,
  },
  updatedAt: null,
};

const cleanSpecies = (value) => String(value || '').trim().toLowerCase();

/** Mappe type / espèce fiche animal → clé paramètres (bovin, ovin, caprin). */
export function resolveAnimalSpeciesKey(animal = {}) {
  const text = cleanSpecies(animal.type || animal.espece || animal.species || animal.espece_label);
  if (text.includes('bovin') || text.includes('vache') || text.includes('taureau') || text === 'boeuf') return 'bovin';
  if (text.includes('ovin') || text.includes('mouton') || text.includes('brebis')) return 'ovin';
  if (text.includes('caprin') || text.includes('chevre') || text.includes('chèvre') || text.includes('bouc')) return 'caprin';
  return 'default';
}

export function getAnimalSalePricePerKg(speciesKey, settings = getFarmCostSettings()) {
  const map = settings?.animalSalePricePerKg || DEFAULT_FARM_COST_SETTINGS.animalSalePricePerKg;
  const key = speciesKey && map[speciesKey] != null ? speciesKey : 'default';
  return Number(map[key] ?? map.default ?? 0) || 0;
}

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
    animalSalePricePerKg: {
      ...base.animalSalePricePerKg,
      ...(raw.animalSalePricePerKg || {}),
      default: Number(raw.animalSalePricePerKg?.default ?? base.animalSalePricePerKg.default) || base.animalSalePricePerKg.default,
      bovin: Number(raw.animalSalePricePerKg?.bovin ?? base.animalSalePricePerKg.bovin) || base.animalSalePricePerKg.bovin,
      ovin: Number(raw.animalSalePricePerKg?.ovin ?? base.animalSalePricePerKg.ovin) || base.animalSalePricePerKg.ovin,
      caprin: Number(raw.animalSalePricePerKg?.caprin ?? base.animalSalePricePerKg.caprin) || base.animalSalePricePerKg.caprin,
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
