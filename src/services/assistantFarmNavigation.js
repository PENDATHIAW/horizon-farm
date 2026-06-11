/**
 * Cartographie navigation ferme — alignée sur la sidebar ERP.
 * PILOTAGE · PRODUCTION · COMMERCE · FINANCE · SUIVI · RESSOURCES · ADMINISTRATION
 */

import { MODULE_REGISTRY } from '../config/modules.config.js';
import { normalizeAgriculturalText } from './assistantUniversalIntents.js';

export const FARM_NAV_SECTIONS = Object.freeze({
  pilotage: {
    label: 'Pilotage',
    modules: ['dashboard', 'assistant_erp', 'centre_ia', 'objectifs_croissance', 'investisseurs_forums'],
  },
  production: {
    label: 'Production',
    modules: ['elevage', 'cultures'],
  },
  commerce: {
    label: 'Commerce',
    modules: ['commercial', 'achats_stock'],
  },
  finance: {
    label: 'Finance',
    modules: ['finance_pilotage'],
  },
  suivi: {
    label: 'Suivi',
    modules: ['activite_suivi', 'documents_rapports'],
  },
  ressources: {
    label: 'Ressources',
    modules: ['rh'],
  },
  administration: {
    label: 'Administration',
    modules: ['sync_activity', 'gestion_systeme'],
  },
});

const MODULE_ALIASES = Object.entries(MODULE_REGISTRY).flatMap(([id, meta]) => {
  const label = normalizeAgriculturalText(meta.label || id);
  const aliases = [id.replace(/_/g, ' '), label];
  if (id === 'centre_ia') aliases.push('centre decisionnel', 'centre ia');
  if (id === 'achats_stock') aliases.push('achats stock', 'stock', 'achats');
  if (id === 'finance_pilotage') aliases.push('finance', 'finance pilotage', 'tresorerie module');
  if (id === 'investisseurs_forums') aliases.push('investisseurs', 'forums', 'impact business');
  if (id === 'sync_activity') aliases.push('sync erp', 'activite sync', 'activite sync erp');
  if (id === 'rh') aliases.push('operations ressources', 'operations et ressources', 'rh equipe');
  return aliases.map((alias) => ({ alias: normalizeAgriculturalText(alias), moduleId: id }));
});

const OPEN_PATTERNS = [
  /^(?:ouvre|ouvrir|va dans|va en|montre|affiche|accede a|accède à|aller a|aller à|je veux)\s+/,
];

/**
 * Résout une demande d'ouverture de module (« ouvre le commercial »).
 * @returns {{ moduleId: string, label: string, section?: string } | null}
 */
export function resolveFarmModuleNavigation(text = '') {
  const raw = String(text || '').trim();
  const q = normalizeAgriculturalText(raw);
  if (!q) return null;

  const isOpen = OPEN_PATTERNS.some((pattern) => pattern.test(q));
  if (!isOpen && !/module\b/.test(q)) return null;

  const stripped = q.replace(OPEN_PATTERNS[0], '').replace(/^le |^la |^les |^l |^module /, '').trim();
  const target = stripped || q;

  let best = null;
  for (const entry of MODULE_ALIASES) {
    if (!entry.alias) continue;
    if (target === entry.alias || target.includes(entry.alias) || entry.alias.includes(target)) {
      if (!best || entry.alias.length > best.alias.length) best = entry;
    }
  }

  if (!best) return null;

  const section = Object.entries(FARM_NAV_SECTIONS).find(([, cfg]) => cfg.modules.includes(best.moduleId))?.[0];
  return {
    moduleId: best.moduleId,
    label: MODULE_REGISTRY[best.moduleId]?.label || best.moduleId,
    section,
  };
}

export default FARM_NAV_SECTIONS;
