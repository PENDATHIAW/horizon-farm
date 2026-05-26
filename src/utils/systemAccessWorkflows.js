const todayIso = () => new Date().toISOString();
const active = (user = {}) => ['actif', 'active'].includes(String(user.statut || user.status || '').toLowerCase());

const ROLE_PERMISSIONS_SAFE = {
  admin: ['*'],
  manager: ['*'],
  employe: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'sante', 'stock', 'cultures', 'documents', 'taches', 'equipements', 'alertes', 'sync', 'sync_activity'],
  veterinaire: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'sante', 'tracabilite', 'alertes', 'documents', 'taches', 'sync_activity'],
  comptable: ['dashboard', 'assistant_erp', 'sante', 'finances', 'comptabilite', 'investissements', 'impact_business', 'clients', 'ventes', 'fournisseurs', 'documents', 'rapports', 'audit_logs', 'alertes', 'sync', 'sync_activity'],
  visiteur: ['dashboard', 'assistant_erp'],
};

export function roleCanAccess(role = 'visiteur', moduleKey = '') {
  const permissions = ROLE_PERMISSIONS_SAFE[role] || ROLE_PERMISSIONS_SAFE.visiteur;
  return permissions.includes('*') || permissions.includes(moduleKey);
}

export function canPerformSystemAction(role = 'visiteur', action = 'voir') {
  if (role === 'admin') return true;
  if (action === 'voir') return true;
  return false;
}

export function isLastActiveAdmin(target = {}, users = []) {
  return target.role === 'admin' && users.filter((user) => user.role === 'admin' && active(user)).length <= 1;
}

export function validateSystemResetConfirmation(value = '') {
  return String(value || '').trim() === 'EFFACER';
}

export function buildSystemAuditEvent(action, target = {}, context = {}) {
  return {
    action,
    module: 'gestion_systeme',
    module_source: 'gestion_systeme',
    entity_type: 'utilisateur',
    entity_id: target.id,
    title: action === 'system_user_deleted' ? 'Utilisateur retiré' : 'Accès utilisateur modifié',
    description: `${target.nom || target.email || target.id || 'Utilisateur'} · rôle ${target.role || 'non renseigné'}`,
    actor_email: context.actorEmail || '',
    created_at: context.createdAt || todayIso(),
    severity: ['admin', 'suspended', 'disabled'].includes(String(target.role || target.statut || '').toLowerCase()) ? 'warning' : 'info',
  };
}
