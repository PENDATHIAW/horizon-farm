/**
 * Adaptation ERP par activité ferme — Phase 4 Multi-Fermes.
 * KPI, alertes, actions rapides et résumé assistant création.
 */

import {
  FARM_ADAPTIVE_MODULES,
  FARM_COMMON_MODULES,
  FARM_ACTIVITY_TYPES,
  getFarmModuleAdaptation,
  mergeActivityRules,
  normalizeFarmActivities,
} from './farmActivities.js';

const arr = (value) => (Array.isArray(value) ? value : []);

export const ACTIVITY_KPI_DEFINITIONS = Object.freeze({
  aviculture_pondeuses: [
    { key: 'lay_rate', label: 'Taux de ponte' },
    { key: 'eggs_produced', label: 'Œufs produits' },
    { key: 'mortality', label: 'Mortalité' },
    { key: 'feed_stock', label: 'Stock aliment' },
    { key: 'egg_sales', label: 'Ventes œufs' },
  ],
  poulets_chair: [
    { key: 'broiler_count', label: 'Effectif chair' },
    { key: 'avg_weight', label: 'Poids moyen' },
    { key: 'mortality', label: 'Mortalité' },
    { key: 'feed_cost', label: 'Coût aliment' },
    { key: 'broiler_sales', label: 'Ventes poulets' },
  ],
  embouche_bovine: [
    { key: 'cattle_count', label: 'Nombre de bovins' },
    { key: 'avg_weight', label: 'Poids moyen' },
    { key: 'fattening_cost', label: 'Coût d\'embouche' },
    { key: 'health', label: 'Santé' },
    { key: 'live_sales', label: 'Ventes sur pied' },
  ],
  cultures: [
    { key: 'cultivated_area', label: 'Surface cultivée' },
    { key: 'active_parcels', label: 'Parcelles actives' },
    { key: 'harvests', label: 'Récoltes' },
    { key: 'yield', label: 'Rendement' },
    { key: 'irrigation', label: 'Irrigation' },
    { key: 'weather_alerts', label: 'Alertes météo' },
  ],
  maraichage: [
    { key: 'cultivated_area', label: 'Surface maraîchère' },
    { key: 'active_parcels', label: 'Parcelles actives' },
    { key: 'harvests', label: 'Récoltes' },
    { key: 'yield', label: 'Rendement' },
  ],
  stockage: [
    { key: 'storage_capacity', label: 'Capacité stockage' },
    { key: 'stock_level', label: 'Niveau stock' },
    { key: 'expiry_risk', label: 'Risque péremption' },
  ],
  smart_farm: [
    { key: 'sensors', label: 'Capteurs actifs' },
    { key: 'cameras', label: 'Caméras' },
    { key: 'weather_station', label: 'Station météo' },
  ],
});

export const ALL_FARMS_KPI = Object.freeze([
  { key: 'consolidated', label: 'KPI consolidés' },
  { key: 'farm_comparison', label: 'Comparaison par ferme' },
  { key: 'top_performance', label: 'Top ferme en performance' },
  { key: 'top_risk', label: 'Ferme la plus à risque' },
]);

export const ACTIVITY_ALERT_DEFINITIONS = Object.freeze({
  aviculture_pondeuses: ['mortalité', 'baisse ponte', 'stock aliment', 'température bâtiment', 'vaccination'],
  poulets_chair: ['mortalité', 'poids', 'stock aliment', 'température bâtiment', 'vaccination'],
  embouche_bovine: ['santé', 'poids', 'alimentation', 'cycle embouche', 'vente prévue'],
  ovins: ['santé', 'alimentation', 'mortalité'],
  caprins: ['santé', 'alimentation', 'mortalité'],
  cultures: ['irrigation', 'météo', 'traitements', 'récolte', 'rendement'],
  maraichage: ['irrigation', 'météo', 'récolte', 'rendement'],
  fourrage: ['récolte', 'stock fourrage'],
  stockage: ['rupture', 'péremption', 'mouvements suspects'],
  smart_farm: ['température', 'eau', 'énergie', 'capteurs hors ligne'],
});

export const COMMON_FINANCE_ALERTS = Object.freeze(['trésorerie', 'dettes', 'créances', 'budget']);

export const ACTIVITY_QUICK_ACTIONS = Object.freeze({
  aviculture_pondeuses: [
    { key: 'create_lot', label: 'Créer un lot', module: 'elevage' },
    { key: 'record_lay', label: 'Enregistrer ponte', module: 'elevage' },
    { key: 'record_mortality', label: 'Enregistrer mortalité', module: 'elevage' },
    { key: 'add_feed', label: 'Ajouter aliment', module: 'achats_stock' },
    { key: 'create_egg_sale', label: 'Créer vente œufs', module: 'commercial' },
  ],
  poulets_chair: [
    { key: 'create_broiler_batch', label: 'Créer bande chair', module: 'elevage' },
    { key: 'record_weight', label: 'Enregistrer poids', module: 'elevage' },
    { key: 'record_mortality', label: 'Enregistrer mortalité', module: 'elevage' },
    { key: 'add_feed', label: 'Ajouter aliment', module: 'achats_stock' },
    { key: 'create_broiler_sale', label: 'Créer vente poulets', module: 'commercial' },
  ],
  embouche_bovine: [
    { key: 'add_cattle', label: 'Ajouter bovin', module: 'elevage' },
    { key: 'record_weight', label: 'Enregistrer poids', module: 'elevage' },
    { key: 'record_care', label: 'Enregistrer soin', module: 'elevage' },
    { key: 'record_live_sale', label: 'Enregistrer vente sur pied', module: 'commercial' },
  ],
  cultures: [
    { key: 'create_parcel', label: 'Créer parcelle', module: 'cultures' },
    { key: 'plan_sowing', label: 'Planifier semis', module: 'cultures' },
    { key: 'record_treatment', label: 'Enregistrer traitement', module: 'cultures' },
    { key: 'record_harvest', label: 'Enregistrer récolte', module: 'cultures' },
  ],
  maraichage: [
    { key: 'create_parcel', label: 'Créer parcelle', module: 'cultures' },
    { key: 'record_harvest', label: 'Enregistrer récolte', module: 'cultures' },
  ],
});

const MODULE_LABELS = Object.freeze({
  dashboard: 'Accueil',
  assistant_erp: 'Assistant ERP',
  finance_pilotage: 'Finance & Pilotage',
  commercial: 'Commercial',
  achats_stock: 'Achats & Stock',
  documents_rapports: 'Documents & Rapports',
  activite_suivi: 'Activité & Suivi',
  gestion_systeme: 'Gestion système',
  elevage: 'Élevage',
  cultures: 'Cultures',
  smartfarm: 'Smart Farm',
  rh: 'RH',
  rapports: 'Rapports',
  investisseurs_forums: 'Investisseurs & Forums',
  centre_ia: 'Centre décisionnel',
  objectifs_croissance: 'Objectifs & Croissance',
  impact_business: 'Impact business',
});

export function getActivityLabel(activityKey = '') {
  return FARM_ACTIVITY_TYPES.find((entry) => entry.key === activityKey)?.label || activityKey;
}

export function getFarmKpis(farm = {}, scope = {}) {
  if (scope?.mode === 'all') return [...ALL_FARMS_KPI];
  const activities = normalizeFarmActivities(farm.activity_type);
  if (activities.includes('mixte')) {
    return Object.values(ACTIVITY_KPI_DEFINITIONS).flat().slice(0, 8);
  }
  const seen = new Set();
  const kpis = [];
  activities.forEach((activity) => {
    arr(ACTIVITY_KPI_DEFINITIONS[activity]).forEach((kpi) => {
      if (seen.has(kpi.key)) return;
      seen.add(kpi.key);
      kpis.push(kpi);
    });
  });
  return kpis.length ? kpis : [{ key: 'overview', label: 'Vue d\'ensemble' }];
}

export function getFarmAlerts(farm = {}) {
  const activities = normalizeFarmActivities(farm.activity_type);
  const alerts = new Set(COMMON_FINANCE_ALERTS);
  if (activities.includes('mixte')) {
    Object.values(ACTIVITY_ALERT_DEFINITIONS).flat().forEach((entry) => alerts.add(entry));
    alerts.add('rupture');
    alerts.add('péremption');
    return [...alerts];
  }
  activities.forEach((activity) => {
    arr(ACTIVITY_ALERT_DEFINITIONS[activity]).forEach((entry) => alerts.add(entry));
  });
  if (activities.some((entry) => ['commercialisation', 'stockage', 'transformation'].includes(entry))) {
    alerts.add('rupture');
    alerts.add('péremption');
  }
  return [...alerts];
}

export function getFarmQuickActions(farm = {}) {
  const activities = normalizeFarmActivities(farm.activity_type);
  if (activities.includes('mixte')) {
    return Object.values(ACTIVITY_QUICK_ACTIONS).flat().slice(0, 10);
  }
  const seen = new Set();
  const actions = [];
  activities.forEach((activity) => {
    arr(ACTIVITY_QUICK_ACTIONS[activity]).forEach((action) => {
      if (seen.has(action.key)) return;
      seen.add(action.key);
      actions.push(action);
    });
  });
  return actions;
}

export function getFarmHeyHorizonTopics(farm = {}, scope = {}) {
  if (scope?.mode === 'all') {
    return ['synthèse globale', 'comparaison fermes', 'ferme la plus à risque', 'ferme la plus performante'];
  }
  const activities = normalizeFarmActivities(farm.activity_type);
  if (activities.includes('aviculture_pondeuses') || activities.includes('poulets_chair')) {
    return ['ponte', 'lots', 'alimentation', 'mortalité', 'ventes œufs'];
  }
  if (activities.includes('embouche_bovine') || activities.includes('ovins') || activities.includes('caprins')) {
    return ['bovins', 'poids', 'alimentation', 'santé', 'ventes sur pied'];
  }
  if (activities.includes('cultures') || activities.includes('maraichage')) {
    return ['parcelles', 'météo', 'semis', 'récoltes', 'rendement'];
  }
  if (activities.includes('mixte')) {
    return ['pilotage global', 'production', 'commercial', 'finance'];
  }
  return ['exploitation', 'alertes', 'performance'];
}

export function buildFarmCreationSummary(draft = {}) {
  const activities = normalizeFarmActivities(draft.activities?.activity_type);
  const adaptation = getFarmModuleAdaptation({ activity_type: activities });
  const rules = mergeActivityRules(activities);
  const enabledModules = [...new Set([...FARM_COMMON_MODULES, ...adaptation.adaptiveModules])];
  const reducedModules = adaptation.hiddenModules.map((moduleId) => MODULE_LABELS[moduleId] || moduleId);

  return {
    name: draft.general?.name || 'Nouvelle ferme',
    activities: activities.map(getActivityLabel),
    enabledModules: enabledModules.map((moduleId) => MODULE_LABELS[moduleId] || moduleId),
    reducedModules,
    enabledTabs: rules.enableTabs,
    kpis: getFarmKpis({ activity_type: activities }).map((entry) => entry.label),
    alerts: getFarmAlerts({ activity_type: activities }),
    quickActions: getFarmQuickActions({ activity_type: activities }).map((entry) => entry.label),
    recommendedDocuments: ['Statuts', 'Autorisations', 'Contrats fournisseurs', 'Photos site'],
    nextSteps: [
      'Configurer les capacités opérationnelles',
      'Affecter les utilisateurs terrain',
      'Lancer les premiers enregistrements métier',
    ],
  };
}

export function formatFarmActivitiesLabel(activityTypes = []) {
  const activities = normalizeFarmActivities(activityTypes);
  if (activities.includes('mixte')) return 'Mixte';
  return activities.map(getActivityLabel).join(', ') || '—';
}

export { FARM_ADAPTIVE_MODULES, FARM_COMMON_MODULES, MODULE_LABELS };
