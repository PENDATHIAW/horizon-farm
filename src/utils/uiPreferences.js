export const UI_SETTINGS_KEY = 'horizon_farm_ui_settings';
export const SIMULATED_DATA_MODE_KEY = 'horizon_farm_show_simulated_data';
export const DEMO_MODE_KEY = 'horizon_farm_show_demo_data'; // legacy compatibility

export const DEFAULT_UI_SETTINGS = {
  density: 'comfortable',
  theme: 'system',
  homeModule: 'dashboard',
  complexity: 'simple',
  showWeather: true,
  confirmSensitiveActions: true,
  compactKpis: false,
};

export function readUiSettings() {
  if (typeof window === 'undefined') return DEFAULT_UI_SETTINGS;
  try {
    return { ...DEFAULT_UI_SETTINGS, ...JSON.parse(window.localStorage.getItem(UI_SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

export function writeUiSettings(settings = {}) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_UI_SETTINGS, ...settings }));
}

export function isSimulatedDataModeEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search || '');
  if (params.get('simulated') === '1' || params.get('demo') === '1') {
    window.localStorage.setItem(SIMULATED_DATA_MODE_KEY, '1');
    window.localStorage.setItem(DEMO_MODE_KEY, '1');
    return true;
  }
  if (params.get('simulated') === '0' || params.get('demo') === '0') {
    window.localStorage.removeItem(SIMULATED_DATA_MODE_KEY);
    window.localStorage.removeItem(DEMO_MODE_KEY);
    return false;
  }
  return window.localStorage.getItem(SIMULATED_DATA_MODE_KEY) === '1' || window.localStorage.getItem(DEMO_MODE_KEY) === '1';
}

export function setSimulatedDataMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(SIMULATED_DATA_MODE_KEY, '1');
    window.localStorage.setItem(DEMO_MODE_KEY, '1');
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
  document.documentElement.dataset.horizonDensity = settings.density || DEFAULT_UI_SETTINGS.density;
  document.documentElement.dataset.horizonTheme = settings.theme || DEFAULT_UI_SETTINGS.theme;
  document.documentElement.dataset.horizonComplexity = settings.complexity || DEFAULT_UI_SETTINGS.complexity;
}
