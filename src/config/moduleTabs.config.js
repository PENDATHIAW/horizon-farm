/**
 * Adaptateur historique de la configuration d'onglets.
 *
 * La source canonique vit dans `src/config/moduleTabs/`. Ce fichier conserve
 * l'ancienne forme francisée pour les tests et intégrations existants sans
 * maintenir une seconde liste de libellés.
 */
import {
  MODULE_TAB_ALIASES,
  MODULE_TAB_CONFIGS,
  getModuleTabs,
  visibleModuleTabs,
} from './moduleTabs/index.js';
import { ERP_ROLES } from './moduleTabs/shared.js';

const legacyEntry = (tab) => Object.freeze({
  id: tab.id,
  libelle: tab.label,
  composant: tab.component,
  rolesAutorises: tab.requiredRoles,
  rolesMasques: Object.freeze(ERP_ROLES.filter((role) => !tab.requiredRoles.includes(role))),
  flag: tab.featureFlag,
  ordre: tab.order,
  aliases: tab.aliases,
  actif: true,
});

const configFor = (moduleId) => Object.freeze({
  onglets: Object.freeze(getModuleTabs(moduleId).map(legacyEntry)),
});

const canonicalConfig = Object.fromEntries(
  Object.keys(MODULE_TAB_CONFIGS).map((moduleId) => [moduleId, configFor(moduleId)]),
);

for (const [alias, moduleId] of Object.entries(MODULE_TAB_ALIASES)) {
  canonicalConfig[alias] = canonicalConfig[moduleId];
}

export const MODULE_TABS_CONFIG = Object.freeze(canonicalConfig);

export const MODULE_TABS_LABELS = Object.freeze(Object.fromEntries(
  Object.entries(MODULE_TABS_CONFIG).map(([moduleId, config]) => [
    moduleId,
    Object.freeze(config.onglets.map((tab) => tab.libelle)),
  ]),
));

export function ongletsDuModule(moduleId = '', { role = null, flags = {} } = {}) {
  return visibleModuleTabs(moduleId, { role, flags }).map(legacyEntry);
}
