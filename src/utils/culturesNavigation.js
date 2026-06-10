import { MODULE_TARGET_TABS } from '../config/horizonVision.config.js';

const CULTURES_TABS = MODULE_TARGET_TABS.cultures || [];

const LEGACY_TAB_MAP = {
  'Vue d’ensemble': 'Pilotage',
  'Vue d\'ensemble': 'Pilotage',
  Résumé: 'Pilotage',
  Cultures: 'Parcelles & Cultures',
  Parcelles: 'Parcelles & Cultures',
  Campagnes: 'Cycles',
  Performance: 'Graphiques',
};

export function resolveCulturesTab(tab = '') {
  const raw = String(tab || '').trim();
  if (!raw) return CULTURES_TABS[0] || 'Pilotage';
  if (CULTURES_TABS.includes(raw)) return raw;
  return LEGACY_TAB_MAP[raw] || CULTURES_TABS[0] || 'Pilotage';
}

export const CULTURES_TARGET_TABS = CULTURES_TABS;
