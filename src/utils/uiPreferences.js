export const UI_SETTINGS_KEY = 'horizon_farm_ui_settings';
export const DEMO_MODE_KEY = 'horizon_farm_show_demo_data';

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

export function isDemoModeEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search || '');
  if (params.get('demo') === '1') {
    window.localStorage.setItem(DEMO_MODE_KEY, '1');
    return true;
  }
  if (params.get('demo') === '0') {
    window.localStorage.removeItem(DEMO_MODE_KEY);
    return false;
  }
  return window.localStorage.getItem(DEMO_MODE_KEY) === '1';
}

export function setDemoMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(DEMO_MODE_KEY, '1');
  else window.localStorage.removeItem(DEMO_MODE_KEY);
}

export function applyUiSettingsToDocument(settings = readUiSettings()) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.horizonDensity = settings.density || DEFAULT_UI_SETTINGS.density;
  document.documentElement.dataset.horizonTheme = settings.theme || DEFAULT_UI_SETTINGS.theme;
  document.documentElement.dataset.horizonComplexity = settings.complexity || DEFAULT_UI_SETTINGS.complexity;
}
