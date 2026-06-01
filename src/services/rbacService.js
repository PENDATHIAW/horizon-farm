const DEFAULT_PERMISSIONS = {
  admin: { read: true, write: true, admin: true },
  manager: { read: true, write: true, admin: false },
  comptable: { read: true, write: false, admin: false },
  veterinaire: { read: true, write: false, admin: false },
  employe: { read: true, write: false, admin: false },
};

const MODULE_OVERRIDES = {
  comptable: { finances: { write: true }, comptabilite: { write: true }, finance_pilotage: { write: true } },
  veterinaire: { elevage: { write: true }, sante: { write: true }, avicole: { write: true } },
  manager: { '*': { write: true } },
  admin: { '*': { write: true, admin: true } },
};

export function resolveModulePermission(role = 'employe', moduleId = '*', action = 'read') {
  const normalizedRole = String(role || 'employe').toLowerCase();
  const base = DEFAULT_PERMISSIONS[normalizedRole] || DEFAULT_PERMISSIONS.employe;
  const overrides = MODULE_OVERRIDES[normalizedRole] || {};
  const moduleOverride = overrides[moduleId] || overrides['*'] || {};
  const merged = { ...base, ...moduleOverride };
  if (action === 'admin') return Boolean(merged.admin);
  if (action === 'write') return Boolean(merged.write || merged.admin);
  return Boolean(merged.read || merged.write || merged.admin);
}

export function canAccessModule(role, moduleId, action = 'read') {
  return resolveModulePermission(role, moduleId, action);
}

export function guardModuleAccess({ role, moduleId, action = 'read' }) {
  if (!canAccessModule(role, moduleId, action)) {
    const err = new Error(`Accès refusé au module ${moduleId}`);
    err.code = 'RBAC_FORBIDDEN';
    throw err;
  }
  return true;
}
