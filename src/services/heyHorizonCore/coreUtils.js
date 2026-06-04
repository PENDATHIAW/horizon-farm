/**
 * Utilitaires partagés Hey Horizon AI Core — lecture seule sur dataMap.
 */

export const HEY_HORIZON_CORE_VERSION = '1.0.0';
export const HEY_HORIZON_CORE_SOURCE = 'hey_horizon_ai_core';

export const arr = (value) => (Array.isArray(value) ? value : []);
export const n = (value = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const low = (value = '') => String(value ?? '').trim().toLowerCase();
export const money = (row = {}) => n(row?.montant ?? row?.amount ?? row?.total ?? row?.montant_total ?? row?.valeur ?? row?.value);

export function pickRows(dataMap = {}, ...keys) {
  for (const key of keys) {
    const rows = arr(dataMap[key]);
    if (rows.length) return rows;
  }
  return [];
}

export function textOrMissing(value, fallback = 'Non renseigné') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function metaBase(extra = {}) {
  return {
    source: HEY_HORIZON_CORE_SOURCE,
    version: HEY_HORIZON_CORE_VERSION,
    generated_at: new Date().toISOString(),
    ...extra,
  };
}

export function hasRows(dataMap = {}, ...keys) {
  return keys.some((key) => arr(dataMap[key]).length > 0);
}
