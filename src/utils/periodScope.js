export const PERIOD_SCOPE_KEY = 'horizon_farm_period_scope';
export const PERIOD_SCOPE_CHANGED = 'horizon-farm-period-changed';

function padMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(date = new Date()) {
  return padMonth(date);
}

export function previousMonthKeyFrom(monthKey = currentMonthKey()) {
  const [year, month] = String(monthKey || currentMonthKey()).split('-').map(Number);
  const date = new Date(year, (month || 1) - 2, 1);
  return padMonth(date);
}

export const DEFAULT_PERIOD_SCOPE = {
  mode: 'month',
  monthKey: currentMonthKey(),
};

export function normalizePeriodScope(scope = {}) {
  const mode = scope.mode === 'all' ? 'all' : 'month';
  const monthKey = /^\d{4}-\d{2}$/.test(String(scope.monthKey || ''))
    ? scope.monthKey
    : currentMonthKey();
  return mode === 'all' ? { mode: 'all' } : { mode: 'month', monthKey };
}

export function readPeriodScope() {
  if (typeof window === 'undefined') return DEFAULT_PERIOD_SCOPE;
  try {
    return normalizePeriodScope(JSON.parse(window.localStorage.getItem(PERIOD_SCOPE_KEY) || '{}'));
  } catch {
    return DEFAULT_PERIOD_SCOPE;
  }
}

export function writePeriodScope(scope = {}) {
  const next = normalizePeriodScope(scope);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PERIOD_SCOPE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PERIOD_SCOPE_CHANGED, { detail: next }));
  }
  return next;
}

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function formatPeriodScopeLabel(scope = readPeriodScope()) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') return 'Depuis le début';
  const [year, month] = normalized.monthKey.split('-').map(Number);
  const name = MONTH_NAMES[(month || 1) - 1] || normalized.monthKey;
  if (normalized.monthKey === currentMonthKey()) return 'Mois en cours';
  return `${name} ${year}`;
}

export function listRecentMonthKeys(count = 12) {
  const keys = [];
  const date = new Date();
  for (let index = 0; index < count; index += 1) {
    keys.push(padMonth(date));
    date.setMonth(date.getMonth() - 1);
  }
  return keys;
}
