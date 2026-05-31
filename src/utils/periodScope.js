export const PERIOD_SCOPE_KEY = 'horizon_farm_period_scope';
export const PERIOD_SCOPE_CHANGED = 'horizon-farm-period-changed';

const arr = (value) => (Array.isArray(value) ? value : []);

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
  mode: 'months',
  monthKeys: [currentMonthKey()],
};

function normalizeMonthKeys(keys = [], fallback = currentMonthKey()) {
  const cleaned = arr(keys)
    .map((key) => String(key || '').trim())
    .filter((key) => /^\d{4}-\d{2}$/.test(key));
  if (cleaned.length) return [...new Set(cleaned)];
  return [fallback];
}

export function normalizePeriodScope(scope = {}) {
  if (scope.mode === 'all') return { mode: 'all' };

  const legacyKey = /^\d{4}-\d{2}$/.test(String(scope.monthKey || '')) ? scope.monthKey : null;
  const monthKeys = normalizeMonthKeys(
    scope.monthKeys?.length ? scope.monthKeys : legacyKey ? [legacyKey] : undefined,
  );
  return { mode: 'months', monthKeys };
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

export function selectedMonthKeys(scope = readPeriodScope()) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') return null;
  return normalized.monthKeys;
}

export function isAllTimeScope(scope = readPeriodScope()) {
  return normalizePeriodScope(scope).mode === 'all';
}

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function formatMonthKeyLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  const name = MONTH_NAMES[(month || 1) - 1] || monthKey;
  if (monthKey === currentMonthKey()) return 'Mois en cours';
  return `${name} ${year}`;
}

export function formatPeriodScopeLabel(scope = readPeriodScope()) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') return 'Depuis le début';
  if (normalized.monthKeys.length === 1) return formatMonthKeyLabel(normalized.monthKeys[0]);
  return `${normalized.monthKeys.length} mois sélectionnés`;
}

export function listRecentMonthKeys(count = 18) {
  const keys = [];
  const date = new Date();
  for (let index = 0; index < count; index += 1) {
    keys.push(padMonth(date));
    date.setMonth(date.getMonth() - 1);
  }
  return keys;
}

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function rowDateValue(row = {}) {
  return row.date
    || row.date_paiement
    || row.payment_date
    || row.date_commande
    || row.order_date
    || row.date_livraison
    || row.date_facture
    || row.date_echeance
    || row.date_entree
    || row.date_sortie
    || row.date_soin
    || row.date_vaccin
    || row.date_naissance
    || row.date_mise_bas
    || row.date_ramassage
    || row.sent_at
    || row.created_at
    || row.updated_at
    || '';
}

export function monthKeyFromRow(row = {}) {
  const date = asDate(rowDateValue(row));
  if (!date) return null;
  return padMonth(date);
}

export function isRowInPeriodScope(row = {}, scope = readPeriodScope()) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') return true;
  const key = monthKeyFromRow(row);
  if (!key) return false;
  return normalized.monthKeys.includes(key);
}

export function filterRowsByPeriodScope(rows = [], scope = readPeriodScope()) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') return arr(rows);
  const monthSet = new Set(normalized.monthKeys);
  return arr(rows).filter((row) => {
    const key = monthKeyFromRow(row);
    return key && monthSet.has(key);
  });
}

export function resolvePeriodContext(scope = {}) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') {
    return { mode: 'all', monthKeys: null, compareMonthKey: null, isSingleMonth: false };
  }
  const monthKeys = normalized.monthKeys;
  const isSingleMonth = monthKeys.length === 1;
  return {
    mode: 'months',
    monthKeys,
    monthKey: isSingleMonth ? monthKeys[0] : null,
    compareMonthKey: isSingleMonth ? previousMonthKeyFrom(monthKeys[0]) : null,
    isSingleMonth,
  };
}

export function rowMatchesMonthKeys(row = {}, monthKeys = []) {
  const key = monthKeyFromRow(row);
  if (!key) return false;
  const monthSet = monthKeys instanceof Set ? monthKeys : new Set(monthKeys);
  return monthSet.has(key);
}

export function toggleMonthKey(scope = {}, monthKey) {
  const normalized = normalizePeriodScope(scope);
  if (normalized.mode === 'all') {
    return { mode: 'months', monthKeys: [monthKey] };
  }
  const set = new Set(normalized.monthKeys);
  if (set.has(monthKey)) {
    set.delete(monthKey);
    if (!set.size) return { mode: 'months', monthKeys: [currentMonthKey()] };
    return { mode: 'months', monthKeys: [...set] };
  }
  set.add(monthKey);
  return { mode: 'months', monthKeys: [...set].sort().reverse() };
}
