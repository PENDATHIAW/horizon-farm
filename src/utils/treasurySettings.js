/**
 * Soldes réels saisis par l'éleveur pour le rapprochement de trésorerie.
 * Persistés localement (par appareil) : première brique sans migration.
 * Aucune donnée métier n'est supprimée ; on ne stocke que des montants de
 * contrôle saisis manuellement.
 */

const KEY = 'horizon_farm_treasury_real_balances_v1';

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getRealBalances() {
  const storage = safeStorage();
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRealBalances(balances = {}) {
  const storage = safeStorage();
  const clean = {};
  Object.entries(balances || {}).forEach(([key, value]) => {
    if (value === '' || value == null) return;
    const num = Number(value);
    if (Number.isFinite(num)) clean[key] = num;
  });
  if (storage) {
    try { storage.setItem(KEY, JSON.stringify({ ...clean, updated_at: new Date().toISOString() })); } catch { /* noop */ }
  }
  return clean;
}
