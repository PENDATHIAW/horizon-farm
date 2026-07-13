export const TRANSFORMATION_ROLE_CAPABILITIES = Object.freeze({
  promotrice_direction: Object.freeze({ canView: true, canWrite: true, canValidate: true, canViewCosts: true, canOverrideSanitary: true, canWriteAnimal: true }),
  responsable_filiere: Object.freeze({ canView: true, canWrite: true, canValidate: true, canViewCosts: true, canOverrideSanitary: true, canWriteAnimal: true }),
  terrain: Object.freeze({ canView: true, canWrite: true, canValidate: true, canViewCosts: false, canOverrideSanitary: false, canWriteAnimal: true }),
  veterinaire: Object.freeze({ canView: true, canWrite: false, canValidate: false, canViewCosts: false, canOverrideSanitary: true, canWriteAnimal: false }),
  finance: Object.freeze({ canView: true, canWrite: false, canValidate: false, canViewCosts: true, canOverrideSanitary: false, canWriteAnimal: false }),
  admin_support: Object.freeze({ canView: true, canWrite: true, canValidate: true, canViewCosts: true, canOverrideSanitary: true, canWriteAnimal: true, auditedAccess: true }),
  financeur_externe: Object.freeze({ canView: false, canWrite: false, canValidate: false, canViewCosts: false, canOverrideSanitary: false, canWriteAnimal: false }),
});

const ROLE_ALIASES = Object.freeze({
  admin: 'promotrice_direction',
  manager: 'responsable_filiere',
  responsable: 'responsable_filiere',
  employe: 'terrain',
  farm_agent: 'terrain',
  comptable: 'finance',
  support: 'admin_support',
  visiteur: 'financeur_externe',
});

export function normalizeTransformationRole(role = '') {
  const value = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[value] || value || 'promotrice_direction';
}

export function getTransformationPermissions(role = '') {
  const canonicalRole = normalizeTransformationRole(role);
  return TRANSFORMATION_ROLE_CAPABILITIES[canonicalRole]
    || TRANSFORMATION_ROLE_CAPABILITIES.financeur_externe;
}
