export const ERP_ROLES = Object.freeze([
  'promotrice_direction',
  'responsable_filiere',
  'terrain',
  'finance',
  'veterinaire',
  'maintenance',
  'financeur_externe',
  'admin_support',
]);

export const INTERNAL_ROLES = Object.freeze(ERP_ROLES.filter((role) => role !== 'financeur_externe'));
export const MANAGEMENT_ROLES = Object.freeze(['promotrice_direction', 'responsable_filiere', 'finance', 'admin_support']);
export const SYSTEM_ROLES = Object.freeze(['promotrice_direction', 'admin_support']);

export function defineModuleTabs(moduleId, labels, definitions, featureFlag = null) {
  if (labels.length !== definitions.length) {
    throw new Error(`Configuration d'onglets incomplete pour ${moduleId}`);
  }
  return Object.freeze(definitions.map((definition, index) => Object.freeze({
    id: definition.id,
    label: labels[index],
    component: definition.component,
    requiredRoles: Object.freeze([...(definition.requiredRoles || INTERNAL_ROLES)]),
    featureFlag: definition.featureFlag ?? featureFlag,
    order: index + 1,
    aliases: Object.freeze([...(definition.aliases || [])]),
  })));
}
