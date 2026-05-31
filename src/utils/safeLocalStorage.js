const QUOTA_PATTERN = /quota/i;

export function isQuotaError(error) {
  return error?.name === 'QuotaExceededError' || QUOTA_PATTERN.test(String(error?.message || ''));
}

/** Supprime les caches ERP les plus lourds pour libérer de l'espace navigateur. */
export function pruneHeavyLocalStorage() {
  if (typeof localStorage === 'undefined') return;
  const heavyPrefixes = [
    'horizon_simulated_rows:',
    'horizon_farm_deleted_records:',
    'horizon-erp-health-engine-last',
    'horizon_ai_recommendations_journal',
    'horizon_erp_health_processed',
  ];
  Object.keys(localStorage).forEach((key) => {
    if (!heavyPrefixes.some((prefix) => key.startsWith(prefix) || key.includes(prefix))) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 120_000) return;
      if (key.startsWith('horizon_simulated_rows:')) {
        const rows = JSON.parse(raw);
        if (Array.isArray(rows)) localStorage.setItem(key, JSON.stringify(rows.slice(-80)));
        else localStorage.removeItem(key);
        return;
      }
      if (key.startsWith('horizon_farm_deleted_records:')) {
        const records = JSON.parse(raw);
        if (records && typeof records === 'object') {
          const entries = Object.entries(records).slice(-80);
          localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
        } else localStorage.removeItem(key);
        return;
      }
      localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  });
}

export function safeLocalStorageSet(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) return false;
    pruneHeavyLocalStorage();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

export function safeLocalStorageGet(key, fallback = null) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function safeLocalStorageSetJson(key, value) {
  return safeLocalStorageSet(key, JSON.stringify(value));
}
