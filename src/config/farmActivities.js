/** Types d'activité par ferme - Phase 2 fondations Multi-Fermes. */

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

/**
 * Activités proposées à la sélection dans les réglages de ferme. L'exploitation
 * étant recentrée sur les pondeuses, on ne propose que l'aviculture pondeuses et
 * AGRI FEEDS. Les autres activités restent définies plus haut (réversibilité)
 * mais ne sont plus offertes au choix : plus de chair, de bovins, etc.
 */
export const SELECTABLE_FARM_ACTIVITY_KEYS = Object.freeze(['aviculture_pondeuses', 'agri_feeds']);

export const SELECTABLE_FARM_ACTIVITY_TYPES = FARM_ACTIVITY_TYPES.filter(
  (entry) => SELECTABLE_FARM_ACTIVITY_KEYS.includes(entry.key),
);

/** Modules toujours accessibles - contenu adapté selon la ferme. */
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
  'equipe',
  'centre_decisionnel',
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

/** Message d’adaptation activité - Phase 3/4. */
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

/** Compatibilité Phase 3 - retourne le message texte uniquement. */
export function getFarmActivityNotice(moduleId = '', farm = {}, filteringEnabled = false) {
  return getFarmActivityNoticeDetail(moduleId, farm, filteringEnabled)?.message || null;
}

/**
 * Recentrage réversible par activité (branchement navigation + données).
 *
 * Les activités ne filtrent que les modules DE PRODUCTION. Les modules de
 * pilotage et de gestion (finance, commercial, objectifs, documents, systeme,
 * etc.) restent toujours accessibles quelle que soit l'activité. Une ferme sans
 * activity_type (ou 'mixte') voit tout : le recentrage ne s'applique qu'aux
 * fermes explicitement configurées.
 */
/**
 * Recentrage par défaut : sans activité explicitement enregistrée, l'ERP est
 * recentré d'office sur les pondeuses + AGRI FEEDS (pas de réglage manuel
 * nécessaire). 'mixte' force l'affichage de toutes les activités ; une liste
 * explicite l'emporte toujours.
 */
export const DEFAULT_FARM_ACTIVITIES = Object.freeze(['aviculture_pondeuses', 'agri_feeds']);

export function activitiesOf(farm = {}) {
  const cleaned = arr(farm?.activity_type).map((value) => String(value || '').trim()).filter(Boolean);
  if (!cleaned.length) return [...DEFAULT_FARM_ACTIVITIES];
  if (cleaned.includes('mixte')) return ['mixte'];
  return [...new Set(cleaned)];
}

export const ACTIVITY_GATED_MODULES = Object.freeze({
  elevage: ['aviculture_pondeuses', 'poulets_chair', 'embouche_bovine', 'ovins', 'caprins'],
  cultures: ['cultures', 'maraichage', 'fourrage'],
  agri_feeds: ['agri_feeds'],
  smartfarm: ['smart_farm'],
});

const activityNorm = (value) => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

/**
 * Un module lié à une activité est-il visible pour cette ferme ? Les modules
 * non listés dans ACTIVITY_GATED_MODULES (pilotage, gestion) sont toujours
 * visibles. 'mixte' ou activity_type absent : tout visible.
 */
export function isActivityModuleVisible(moduleId, farm = {}) {
  const required = ACTIVITY_GATED_MODULES[moduleId];
  if (!required) return true;
  const activities = activitiesOf(farm);
  if (activities.includes('mixte')) return true;
  return required.some((key) => activities.includes(key));
}

/**
 * Classe un enregistrement d'élevage/culture (lot, animal, produit) dans une
 * clé d'activity_type, à partir d'un texte représentatif. Renvoie null si aucun
 * repère (donnée transverse : conservée, jamais masquée). L'ordre compte :
 * pondeuses avant chair pour ne pas classer « aliment pondeuse » en chair.
 */
export function recordActivityKey(text) {
  const t = activityNorm(text);
  if (!t) return null;
  // Repères bovins d'abord : « boeuf » contient « oeuf », on évite de le classer
  // en pondeuses. Bornes de mot pour ne pas confondre « oeuf » et « boeuf ».
  if (/\b(bovin|boeuf|taureau|veau|vache|zebu|genisse)/.test(t)) return 'embouche_bovine';
  if (/\b(pondeuse|ponte|oeuf|layer)/.test(t)) return 'aviculture_pondeuses';
  if (/\b(chair|broiler|poulet)/.test(t)) return 'poulets_chair';
  if (/\b(ovin|mouton|brebis|belier)/.test(t)) return 'ovins';
  if (/\b(caprin|chevre|bouc|cabri)/.test(t)) return 'caprins';
  if (/\b(parcelle|maraich|recolte|semis|campagne|culture)/.test(t)) return 'cultures';
  return null;
}

/** Texte représentatif d'un enregistrement pour la classification d'activité. */
export function activityTextOf(record = {}) {
  return [
    record.espece, record.type, record.type_lot, record.production_type,
    record.activity_type, record.categorie, record.category,
    record.name, record.nom, record.designation, record.libelle,
  ].filter(Boolean).join(' ');
}

/** L'activité d'un enregistrement est-elle active pour la ferme ? */
export function isRecordActivityActive(farm, text) {
  const key = recordActivityKey(text);
  if (!key) return true;
  const activities = activitiesOf(farm);
  if (activities.includes('mixte')) return true;
  return activities.includes(key);
}

/**
 * Filtre une liste (lots, animaux, produits) selon les activités actives de la
 * ferme. Ferme non recentrée (mixte / non configurée) : liste inchangée.
 */
export function filterRecordsByFarmActivities(farm, records = [], getText = activityTextOf) {
  if (!Array.isArray(records)) return [];
  const activities = activitiesOf(farm);
  if (activities.includes('mixte')) return records;
  return records.filter((record) => isRecordActivityActive(farm, getText(record)));
}

/**
 * Périmètres avicoles actifs pour une ferme (pondeuse / chair). Sert à masquer
 * le sélecteur pondeuse/chair quand la ferme ne pratique qu'un seul des deux :
 * on va alors droit au contenu, sans carte de choix. Ferme mixte ou non
 * configurée : les deux restent disponibles.
 */
/**
 * Sous-vues d'élevage actives (avicole / animaux) selon les activités de la
 * ferme. Permet de masquer le sélecteur Avicole / Animaux quand une seule des
 * deux est pratiquée. Ferme mixte ou non configurée : les deux restent.
 */
export function elevageSubviewsForFarm(farm = {}) {
  const activities = activitiesOf(farm);
  if (activities.includes('mixte')) return { avicole: true, animaux: true };
  const avicole = activities.some((a) => ['aviculture_pondeuses', 'poulets_chair'].includes(a));
  const animaux = activities.some((a) => ['embouche_bovine', 'ovins', 'caprins'].includes(a));
  if (!avicole && !animaux) return { avicole: true, animaux: true };
  return { avicole, animaux };
}

export function poultryScopesForFarm(farm = {}) {
  const activities = activitiesOf(farm);
  if (activities.includes('mixte')) return { pondeuse: true, chair: true };
  const pondeuse = activities.includes('aviculture_pondeuses');
  const chair = activities.includes('poulets_chair');
  if (!pondeuse && !chair) return { pondeuse: true, chair: true };
  return { pondeuse, chair };
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
