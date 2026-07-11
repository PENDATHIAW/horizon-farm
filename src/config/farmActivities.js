/** Types d'activité par ferme — Phase 2 fondations Multi-Fermes. */

export const FARM_ACTIVITY_TYPES = Object.freeze([
  { key: 'aviculture_pondeuses', label: 'Aviculture pondeuses' },
  { key: 'poulets_chair', label: 'Poulets de chair' },
  { key: 'embouche_bovine', label: 'Embouche bovine' },
  { key: 'ovins', label: 'Ovins' },
  { key: 'caprins', label: 'Caprins' },
  { key: 'cultures', label: 'Cultures' },
  { key: 'maraichage', label: 'Maraîchage' },
  { key: 'fourrage', label: 'Fourrage' },
  { key: 'transformation', label: 'Transformation' },
  { key: 'agri_feeds', label: 'AGRI FEEDS (aliments animaux)' },
  { key: 'commercialisation', label: 'Commercialisation' },
  { key: 'stockage', label: 'Stockage' },
  { key: 'smart_farm', label: 'Smart Farm' },
  { key: 'mixte', label: 'Mixte (toutes activités)' },
]);

export const FARM_ACTIVITY_KEYS = FARM_ACTIVITY_TYPES.map((entry) => entry.key);

/** Modules toujours accessibles — contenu adapté selon la ferme. */
export const FARM_COMMON_MODULES = Object.freeze([
  'dashboard',
  'assistant_erp',
  'finance_pilotage',
  'commercial',
  'achats_stock',
  'documents_rapports',
  'activite_suivi',
  'gestion_systeme',
  'sync_activity',
]);

/** Modules adaptatifs selon activity_type. */
export const FARM_ADAPTIVE_MODULES = Object.freeze([
  'elevage',
  'agri_feeds',
  'cultures',
  'smartfarm',
  'rh',
  'rapports',
  'financements',
  'centre_ia',
  'objectifs_croissance',
  'impact_business',
]);

const ACTIVITY_MODULE_RULES = Object.freeze({
  aviculture_pondeuses: {
    enableModules: ['elevage', 'smartfarm'],
    enableTabs: {
      elevage: ['Lots pondeuses', 'Production œufs', 'Alimentation', 'Mortalité', 'Santé', 'Ventes œufs'],
      achats_stock: ['Stock aliment'],
    },
    reduceModules: [],
    reduceTabs: {
      cultures: ['Parcelles', 'Traitements phytosanitaires'],
    },
  },
  poulets_chair: {
    enableModules: ['elevage', 'smartfarm'],
    enableTabs: {
      elevage: ['Bandes chair', 'Alimentation', 'Mortalité', 'Santé avicole', 'Clôture bande'],
    },
    reduceTabs: {
      elevage: ['Production œufs'],
      cultures: ['Parcelles'],
    },
  },
  embouche_bovine: {
    enableModules: ['elevage'],
    enableTabs: {
      elevage: ['Bovins', 'Achats animaux', 'Poids', 'Alimentation', 'Santé', 'Ventes sur pied', 'Coûts embouche'],
    },
    reduceTabs: {
      elevage: ['Production œufs', 'Lots pondeuses', 'Bandes chair'],
    },
  },
  cultures: {
    enableModules: ['cultures', 'smartfarm'],
    enableTabs: {
      cultures: ['Parcelles', 'Semis', 'Traitements', 'Récoltes', 'Irrigation', 'Rendement', 'Météo'],
    },
    reduceTabs: {
      elevage: ['Production œufs', 'Bandes chair', 'Embouche bovine'],
    },
  },
  maraichage: {
    enableModules: ['cultures'],
    enableTabs: { cultures: ['Parcelles', 'Semis', 'Récoltes', 'Irrigation'] },
    reduceTabs: { elevage: ['Production œufs', 'Bandes chair'] },
  },
  smart_farm: {
    enableModules: ['smartfarm', 'equipements'],
    enableTabs: { smartfarm: ['Capteurs', 'Caméras', 'Alertes terrain'] },
  },
  agri_feeds: {
    enableModules: ['agri_feeds', 'elevage', 'achats_stock'],
    enableTabs: {
      agri_feeds: [
        'Tableau de bord',
        'Référence Phase 1',
        'Matières & fournisseurs',
        'Formulations',
        'Production',
        'Tests & comparaison',
        'Commercial',
        'Qualité & reporting',
      ],
    },
  },
  mixte: {
    enableModules: FARM_ADAPTIVE_MODULES,
    enableTabs: {},
    reduceModules: [],
    reduceTabs: {},
  },
});

const arr = (value) => (Array.isArray(value) ? value : []);

export function normalizeFarmActivities(activityTypes = []) {
  const cleaned = arr(activityTypes).map((value) => String(value || '').trim()).filter(Boolean);
  if (!cleaned.length) return ['mixte'];
  if (cleaned.includes('mixte')) return ['mixte'];
  return [...new Set(cleaned)];
}

export function mergeActivityRules(activityTypes = []) {
  const activities = normalizeFarmActivities(activityTypes);
  if (activities.includes('mixte')) return ACTIVITY_MODULE_RULES.mixte;

  const merged = {
    enableModules: new Set(FARM_COMMON_MODULES),
    enableTabs: {},
    reduceModules: new Set(),
    reduceTabs: {},
  };

  activities.forEach((activity) => {
    const rule = ACTIVITY_MODULE_RULES[activity];
    if (!rule) return;
    arr(rule.enableModules).forEach((moduleId) => merged.enableModules.add(moduleId));
    Object.entries(rule.enableTabs || {}).forEach(([moduleId, tabs]) => {
      merged.enableTabs[moduleId] = [...new Set([...(merged.enableTabs[moduleId] || []), ...tabs])];
    });
    arr(rule.reduceModules).forEach((moduleId) => merged.reduceModules.add(moduleId));
    Object.entries(rule.reduceTabs || {}).forEach(([moduleId, tabs]) => {
      merged.reduceTabs[moduleId] = [...new Set([...(merged.reduceTabs[moduleId] || []), ...tabs])];
    });
  });

  return {
    enableModules: [...merged.enableModules],
    enableTabs: merged.enableTabs,
    reduceModules: [...merged.reduceModules],
    reduceTabs: merged.reduceTabs,
  };
}

export function isModuleEnabledForFarm(moduleId, farm = {}) {
  const activities = normalizeFarmActivities(farm.activity_type);
  const rules = mergeActivityRules(activities);
  if (FARM_COMMON_MODULES.includes(moduleId)) return true;
  if (rules.reduceModules.includes(moduleId)) return false;
  if (activities.includes('mixte')) return true;
  return rules.enableModules.includes(moduleId);
}

export function isTabEnabledForFarm(moduleId, tabLabel, farm = {}) {
  const rules = mergeActivityRules(farm.activity_type);
  const reduced = rules.reduceTabs[moduleId] || [];
  if (reduced.includes(tabLabel)) return false;
  const enabled = rules.enableTabs[moduleId] || [];
  if (!enabled.length) return true;
  return enabled.includes(tabLabel);
}

export function getFarmModuleAdaptation(farm = {}) {
  return {
    activities: normalizeFarmActivities(farm.activity_type),
    commonModules: FARM_COMMON_MODULES,
    adaptiveModules: FARM_ADAPTIVE_MODULES.filter((moduleId) => isModuleEnabledForFarm(moduleId, farm)),
    hiddenModules: FARM_ADAPTIVE_MODULES.filter((moduleId) => !isModuleEnabledForFarm(moduleId, farm)),
    rules: mergeActivityRules(farm.activity_type),
  };
}

/** Message d’adaptation activité — Phase 3/4. */
export function getFarmActivityNoticeDetail(moduleId = '', farm = {}, filteringEnabled = false) {
  if (!filteringEnabled || !farm?.id || !moduleId) return null;
  const activities = normalizeFarmActivities(farm.activity_type);
  if (activities.includes('mixte')) return null;

  const notices = {
    cultures: {
      moduleId: 'cultures',
      activityKey: 'cultures',
      message: 'Cette ferme n’a pas d’activité cultures activée.',
      actionLabel: 'Activer l’activité cultures pour cette ferme',
    },
    elevage: {
      moduleId: 'elevage',
      activityKeys: ['aviculture_pondeuses', 'poulets_chair', 'embouche_bovine', 'ovins', 'caprins'],
      message: 'Cette ferme n’a pas d’activité élevage activée.',
      actionLabel: 'Activer une activité élevage',
    },
    smartfarm: {
      moduleId: 'smartfarm',
      activityKey: 'smart_farm',
      message: 'Cette ferme n’a pas Smart Farm activé.',
      actionLabel: 'Activer Smart Farm pour cette ferme',
    },
  };

  const rule = notices[moduleId];
  if (!rule) return null;

  if (rule.activityKey && !activities.includes(rule.activityKey)) {
    return rule;
  }
  if (rule.activityKeys && !rule.activityKeys.some((entry) => activities.includes(entry))) {
    return rule;
  }
  return null;
}

/** Compatibilité Phase 3 — retourne le message texte uniquement. */
export function getFarmActivityNotice(moduleId = '', farm = {}, filteringEnabled = false) {
  return getFarmActivityNoticeDetail(moduleId, farm, filteringEnabled)?.message || null;
}

export const FARM_ACCESS_ROLES = Object.freeze([
  'super_admin',
  'direction',
  'farm_manager',
  'farm_accountant',
  'farm_agent',
  'farm_commercial',
  'farm_stock_manager',
  'farm_veterinary',
  'farm_readonly',
]);
