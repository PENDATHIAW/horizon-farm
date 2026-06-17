import { resetSimulatedModeCache } from '../utils/simulatedModeStorage.js';
import { clearSimulatedSeedTombstones } from '../utils/deletedRecords.js';

export const UI_SETTINGS_KEY = 'horizon_farm_ui_settings';
export const SIMULATED_DATA_MODE_KEY = 'horizon_farm_show_simulated_data';
export const DEMO_MODE_KEY = 'horizon_farm_show_demo_data'; // legacy compatibility

export const DEFAULT_UI_SETTINGS = {
  density: 'comfortable',
  theme: 'light',
  homeModule: 'dashboard',
  complexity: 'simple',
  showWeather: true,
  confirmSensitiveActions: true,
  compactKpis: false,
};

function normalizeUiSettings(settings = {}) {
  return { ...DEFAULT_UI_SETTINGS, ...settings, theme: 'light' };
}

export function readUiSettings() {
  if (typeof window === 'undefined') return DEFAULT_UI_SETTINGS;
  try {
    return normalizeUiSettings(JSON.parse(window.localStorage.getItem(UI_SETTINGS_KEY) || '{}'));
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

export function writeUiSettings(settings = {}) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(normalizeUiSettings(settings)));
}

export function isSimulatedDataModeEnabled() {
  const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
  if (!storage) return false;
  const params = typeof window !== 'undefined' && window.location
    ? new URLSearchParams(window.location.search || '')
    : null;
  if (params?.get('simulated') === '1' || params?.get('demo') === '1') {
    const wasOff = storage.getItem(SIMULATED_DATA_MODE_KEY) !== '1';
    storage.setItem(SIMULATED_DATA_MODE_KEY, '1');
    storage.setItem(DEMO_MODE_KEY, '1');
    if (wasOff) {
      resetSimulatedModeCache();
      clearSimulatedSeedTombstones();
    }
    return true;
  }
  if (params?.get('simulated') === '0' || params?.get('demo') === '0') {
    storage.removeItem(SIMULATED_DATA_MODE_KEY);
    storage.removeItem(DEMO_MODE_KEY);
    return false;
  }
  return storage.getItem(SIMULATED_DATA_MODE_KEY) === '1' || storage.getItem(DEMO_MODE_KEY) === '1';
}

export function setSimulatedDataMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(SIMULATED_DATA_MODE_KEY, '1');
    window.localStorage.setItem(DEMO_MODE_KEY, '1');
    resetSimulatedModeCache();
    clearSimulatedSeedTombstones();
  } else {
    window.localStorage.removeItem(SIMULATED_DATA_MODE_KEY);
    window.localStorage.removeItem(DEMO_MODE_KEY);
  }
  window.dispatchEvent(new CustomEvent('horizon-farm-data-mode-changed', { detail: { simulated: Boolean(enabled) } }));
}

export function isDemoModeEnabled() {
  return isSimulatedDataModeEnabled();
}

export function setDemoMode(enabled) {
  setSimulatedDataMode(enabled);
}

export function applyUiSettingsToDocument(settings = readUiSettings()) {
  if (typeof document === 'undefined') return;
  const next = normalizeUiSettings(settings);
  document.documentElement.dataset.horizonDensity = next.density;
  document.documentElement.dataset.horizonTheme = 'light';
  document.documentElement.dataset.horizonComplexity = next.complexity;
}
