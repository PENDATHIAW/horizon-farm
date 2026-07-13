/**
 * Seuils officiels Élevage V2 - source unique pour alertes, workflows et IA.
 * Override futur par ferme via farm_cost_settings.elevageThresholds.
 */

export const ELEVAGE_THRESHOLDS_DEFAULTS = {
  mortalityAlertPct: 4,
  mortalityCriticalPct: 8,
  eggBreakAlertPct: 8,
  lowLayingPct: 65,
  weightDelayStatus: 'retard_croissance',
};

const n = (value) => Number(value || 0);

export function resolveElevageThresholds(farmSettings = {}) {
  const custom = farmSettings?.elevageThresholds || {};
  return {
    ...ELEVAGE_THRESHOLDS_DEFAULTS,
    ...Object.fromEntries(
      Object.entries(custom).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ),
  };
}

export function mortalityAlertSeverity(rate = 0, thresholds = ELEVAGE_THRESHOLDS_DEFAULTS) {
  const r = n(rate);
  if (r >= n(thresholds.mortalityCriticalPct)) return 'critique';
  if (r >= n(thresholds.mortalityAlertPct)) return 'warning';
  return null;
}

export function shouldAlertEggBreak(brokenRate = 0, thresholds = ELEVAGE_THRESHOLDS_DEFAULTS) {
  return n(brokenRate) >= n(thresholds.eggBreakAlertPct);
}

export function isLowLayingRate(rate = 0, thresholds = ELEVAGE_THRESHOLDS_DEFAULTS) {
  const r = n(rate);
  return r > 0 && r < n(thresholds.lowLayingPct);
}
