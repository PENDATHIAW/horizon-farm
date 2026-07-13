import dashboard from './dashboard.config.js';
import assistantErp from './assistantErp.config.js';
import centreDecisionnel from './centreDecisionnel.config.js';
import objectifsCroissance from './objectifsCroissance.config.js';
import elevage from './elevage.config.js';
import cultures from './cultures.config.js';
import commercial from './commercial.config.js';
import achatsStock from './achatsStock.config.js';
import financePilotage from './financePilotage.config.js';
import activiteSuivi from './activiteSuivi.config.js';
import documentsRapports from './documentsRapports.config.js';
import equipe from './equipe.config.js';
import equipements from './equipements.config.js';
import gestionSysteme from './gestionSysteme.config.js';
import syncActivity from './syncActivity.config.js';
import agriFeeds from './agriFeeds.config.js';
import smartfarm from './smartfarm.config.js';
import financements, { financementExternalTabs } from './financements.config.js';

export const MODULE_TAB_CONFIGS = Object.freeze({
  dashboard,
  assistant_erp: assistantErp,
  centre_decisionnel: centreDecisionnel,
  objectifs_croissance: objectifsCroissance,
  elevage,
  cultures,
  commercial,
  achats_stock: achatsStock,
  finance_pilotage: financePilotage,
  activite_suivi: activiteSuivi,
  documents_rapports: documentsRapports,
  equipe,
  equipements,
  gestion_systeme: gestionSysteme,
  sync_activity: syncActivity,
  agri_feeds: agriFeeds,
  smartfarm,
  financements,
  financements_externe: financementExternalTabs,
});

export const MODULE_TAB_ALIASES = Object.freeze({
  centre_ia: 'centre_decisionnel',
  rh: 'equipe',
});

const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function getModuleTabs(moduleId) {
  return MODULE_TAB_CONFIGS[MODULE_TAB_ALIASES[moduleId] || moduleId] || [];
}

export function matchModuleTab(moduleId, value) {
  const normalized = normalize(value);
  return getModuleTabs(moduleId).find((tab) => (
    [tab.id, tab.label, tab.component, ...tab.aliases]
      .some((candidate) => normalize(candidate) === normalized)
  )) || null;
}

export function resolveModuleTab(moduleId, value) {
  const tabs = getModuleTabs(moduleId);
  return matchModuleTab(moduleId, value) || tabs[0] || null;
}

export function visibleModuleTabs(moduleId, { role = null, flags = {} } = {}) {
  return getModuleTabs(moduleId).filter((tab) => {
    if (tab.featureFlag && Object.prototype.hasOwnProperty.call(flags, tab.featureFlag) && flags[tab.featureFlag] !== true) return false;
    return !role || tab.requiredRoles.includes(role);
  });
}
