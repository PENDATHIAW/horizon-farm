/**
 * Mode démo multi-fermes léger — localStorage / flag env uniquement.
 * N’insère pas de fausses données métier en production.
 */

import { shouldShowFarmSelector } from './farmScope.js';

const DEMO_FLAG_KEY = 'horizon_farm_demo_multi_enabled';

export const DEMO_FARMS = Object.freeze([
  {
    id: 'demo-avicole-thies',
    name: 'Avicole Thiès Demo',
    country: 'SN',
    region: 'Thiès',
    location: 'Mbour',
    activity_type: ['aviculture_pondeuses'],
    status: 'active',
    is_default: false,
    settings: { demo: true, location_details: { commune: 'Mbour', region: 'Thiès' } },
  },
  {
    id: 'demo-cultures-kaolack',
    name: 'Cultures Kaolack Demo',
    country: 'SN',
    region: 'Kaolack',
    location: 'Ngoye',
    activity_type: ['cultures', 'maraichage'],
    status: 'active',
    is_default: false,
    settings: { demo: true, location_details: { commune: 'Ngoye', region: 'Kaolack' } },
  },
]);

export function isFarmDemoModeEnabled() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FARM_DEMO_MULTI === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setFarmDemoModeEnabled(enabled = false) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_FLAG_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('horizon-farm-demo-mode-changed', { detail: { enabled } }));
  } catch {
    // ignore
  }
}

/** Ajoute des fermes démo uniquement si activé et mono-ferme actuel. */
export function mergeDemoFarms(accessibleFarms = []) {
  if (!isFarmDemoModeEnabled()) return accessibleFarms;
  if (shouldShowFarmSelector(accessibleFarms)) return accessibleFarms;
  const existingIds = new Set(accessibleFarms.map((farm) => farm.id));
  const extras = DEMO_FARMS.filter((farm) => !existingIds.has(farm.id));
  return extras.length ? [...accessibleFarms, ...extras] : accessibleFarms;
}
