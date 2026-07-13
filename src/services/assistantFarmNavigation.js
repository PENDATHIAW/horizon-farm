/**
 * Cartographie navigation ferme - alignée sur la sidebar ERP.
 * PILOTAGE · PRODUCTION · COMMERCE · FINANCE · SUIVI · RESSOURCES · ADMINISTRATION
 */

import { MODULE_REGISTRY } from '../config/modules.config.js';
import { normalizeAgriculturalText } from './assistantUniversalIntents.js';

export const FARM_NAV_SECTIONS = Object.freeze({
  pilotage: {
    label: 'Pilotage',
    modules: ['dashboard', 'assistant_erp', 'centre_ia', 'objectifs_croissance', 'financements'],
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
  if (id === 'financements') aliases.push('financements', 'financeurs', 'dossier financement', 'subventions', 'impact business', 'investisseurs');
  if (id === 'sync_activity') aliases.push('sync erp', 'activite sync', 'activite sync erp');
  if (id === 'rh') aliases.push('operations ressources', 'operations et ressources', 'rh equipe');
  return aliases.map((alias) => ({ alias: normalizeAgriculturalText(alias), moduleId: id }));
});

const OPEN_PATTERNS = [
  /^(?:ouvre|ouvrir|va dans|va en|aller dans|aller en|accede a|accède à|je veux voir)\s+/,
];

const SHOW_NAV_ALIASES = [
  { pattern: /^(?:montre(?: moi)?|affiche(?: moi)?)\s+(?:mes|mon|ma)\s+ventes/, moduleId: 'commercial' },
  { pattern: /^(?:montre(?: moi)?|affiche(?: moi)?)\s+(?:mes|mon|ma)\s+animaux/, moduleId: 'elevage' },
  { pattern: /^(?:montre(?: moi)?|affiche(?: moi)?)\s+(?:mes|mon|ma)\s+cultures/, moduleId: 'cultures' },
  { pattern: /^(?:montre(?: moi)?|affiche(?: moi)?)\s+(?:mes|mon|ma)\s+rapports/, moduleId: 'documents_rapports' },
  { pattern: /^(?:montre|affiche)\s+(?:les|mes)\s+rapports/, moduleId: 'documents_rapports' },
  { pattern: /^(?:ouvre|ouvrir)\s+(?:les|mes)\s+objectifs/, moduleId: 'objectifs_croissance' },
  { pattern: /^(?:va|aller)\s+(?:dans|en|vers)\s+(?:les|mes)\s+cultures/, moduleId: 'cultures' },
];

/** Demandes de données chiffrées - rester dans le chat. */
const DATA_SHOW_PATTERN = /^(?:montre(?: moi)?|affiche(?: moi)?|donne(?: moi)?)\s+(?:mes|mon|ma|le|la|les|moi)\s+(?:ventes|stock|tresorerie|cheptel|bovins)/;

/**
 * Résout une demande d'ouverture de module (« ouvre le commercial »).
 * @returns {{ moduleId: string, label: string, section?: string } | null}
 */
export function resolveFarmModuleNavigation(text = '') {
  const raw = String(text || '').trim();
  const q = normalizeAgriculturalText(raw);
  if (!q) return null;

  if (/^(combien|quel|quelle|comment|qui|vais je)/.test(q)) return null;

  for (const entry of SHOW_NAV_ALIASES) {
    if (entry.pattern.test(q)) {
      const section = Object.entries(FARM_NAV_SECTIONS).find(([, cfg]) => cfg.modules.includes(entry.moduleId))?.[0];
      return {
        moduleId: entry.moduleId,
        label: MODULE_REGISTRY[entry.moduleId]?.label || entry.moduleId,
        section,
      };
    }
  }

  if (DATA_SHOW_PATTERN.test(q)) return null;

  const isOpen = OPEN_PATTERNS.some((pattern) => pattern.test(q))
    || /^(?:va|aller)\s+(?:dans|en|vers)\s+/.test(q);
  if (!isOpen && !/^(?:ouvre|ouvrir)\s+/.test(q) && !/module\b/.test(q)) return null;

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
