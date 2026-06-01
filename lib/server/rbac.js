import { canAccessModule } from '../../src/services/rbacService.js';

export function guardApiModuleAccess({ role, moduleId, action = 'read' }) {
  if (!canAccessModule(role, moduleId, action)) {
    const err = new Error(`Forbidden: ${moduleId}`);
    err.statusCode = 403;
    throw err;
  }
  return true;
}

export function extractRoleFromRequest(req = {}) {
  return req.headers?.['x-horizon-role']
    || req.headers?.['x-user-role']
    || process.env.HORIZON_DEFAULT_ROLE
    || 'admin';
}
