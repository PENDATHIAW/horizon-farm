import { MODULE_TARGET_TABS } from '../config/horizonVision.config.js';

export const CENTRE_IA_TABS = MODULE_TARGET_TABS.centre_ia;

/** Alias d'onglets legacy → onglets canoniques du Centre décisionnel (7 onglets). */
export const CENTRE_IA_TAB_ALIASES = {
  Graphiques: 'Graphiques',
  Annexe: 'Annexe',
  Opportunités: 'Cycles',
  'Opportunités & cycles': 'Cycles',
  Recommandations: 'Recommandations',
  Historique: 'Historique',
  'À traiter': 'À traiter',
  Risques: 'Risques',
  Cycles: 'Cycles',
  /** Anciens onglets Vision / Objectifs redirigés vers le Centre */
  Efficacité: 'À traiter',
  'Efficacité Technique': 'Recommandations',
  Priorités: 'À traiter',
  'Priorités & risques': 'À traiter',
  Performance: 'Recommandations',
  'Rentabilité lots': 'Recommandations',
  'Flux & stocks': 'Risques',
  Prévisions: 'Historique',
  Plans: 'Recommandations',
  Financeurs: 'Historique',
};

export function resolveCentreTab(value = '') {
  const requested = String(value || '').trim();
  if (!requested) return CENTRE_IA_TABS[0];
  const mapped = CENTRE_IA_TAB_ALIASES[requested] || requested;
  if (CENTRE_IA_TABS.includes(mapped)) return mapped;
  return CENTRE_IA_TABS[0];
}
