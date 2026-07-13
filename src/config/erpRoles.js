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

export const LEGACY_ERP_ROLE_ALIASES = Object.freeze({
  admin: 'admin_support',
  manager: 'promotrice_direction',
  employe: 'terrain',
  comptable: 'finance',
  responsable_agri_feeds: 'responsable_filiere',
  technicien_elevage: 'terrain',
  commercial: 'responsable_filiere',
  lecteur_financeur: 'financeur_externe',
  super_admin: 'admin_support',
  direction: 'promotrice_direction',
  farm_manager: 'responsable_filiere',
  farm_accountant: 'finance',
  farm_agent: 'terrain',
  farm_commercial: 'responsable_filiere',
  farm_stock_manager: 'terrain',
  farm_veterinary: 'veterinaire',
  farm_readonly: 'financeur_externe',
});

export function normalizeErpRole(role, fallback = 'terrain') {
  const normalized = String(role || '').trim().toLowerCase();
  if (ERP_ROLES.includes(normalized)) return normalized;
  if (LEGACY_ERP_ROLE_ALIASES[normalized]) return LEGACY_ERP_ROLE_ALIASES[normalized];
  if (normalized === 'visiteur') return 'visiteur';
  return fallback;
}

export function isCanonicalErpRole(role) {
  return ERP_ROLES.includes(String(role || '').trim().toLowerCase());
}
