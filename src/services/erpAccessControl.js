export const ROLE_ACTION_POLICY = {
  admin: {
    modules: ['*'],
    actions: ['*'],
  },
  manager: {
    modules: ['*'],
    actions: [
      'read',
      'create_task',
      'create_alert',
      'create_stock_record',
      'create_health_record',
      'create_animal_record',
      'create_flock_record',
      'create_sale',
      'create_finance_record',
      'create_document',
      'create_equipment_record',
      'create_crop_record',
    ],
  },
  employe: {
    modules: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'sante', 'stock', 'cultures', 'documents', 'taches', 'equipements', 'alertes', 'sync', 'sync_activity'],
    actions: ['read', 'create_task', 'create_alert', 'create_stock_record', 'create_health_record', 'create_animal_record', 'create_flock_record', 'create_document', 'create_equipment_record', 'create_crop_record'],
  },
  veterinaire: {
    modules: ['dashboard', 'assistant_erp', 'animaux', 'avicole', 'sante', 'tracabilite', 'alertes', 'documents', 'taches', 'sync_activity'],
    actions: ['read', 'create_task', 'create_alert', 'create_health_record', 'create_document'],
  },
  comptable: {
    modules: ['dashboard', 'assistant_erp', 'sante', 'finances', 'comptabilite', 'investissements', 'impact_business', 'clients', 'ventes', 'fournisseurs', 'documents', 'rapports', 'audit_logs', 'alertes', 'sync', 'sync_activity'],
    actions: ['read', 'create_task', 'create_alert', 'create_sale', 'create_finance_record', 'create_document'],
  },
  visiteur: {
    modules: ['dashboard', 'assistant_erp'],
    actions: ['read'],
  },
};

export const ERP_ASSISTANT_ACTIONS = [
  { action: 'read', module: '*', label: 'Lire les données ERP' },
  { action: 'create_task', module: 'taches', label: 'Créer une tâche' },
  { action: 'create_alert', module: 'alertes', label: 'Créer une alerte' },
  { action: 'create_stock_record', module: 'stock', label: 'Enregistrer un mouvement de stock' },
  { action: 'create_health_record', module: 'sante', label: 'Enregistrer un suivi santé' },
  { action: 'create_animal_record', module: 'animaux', label: 'Créer ou modifier un animal' },
  { action: 'create_flock_record', module: 'avicole', label: 'Créer ou modifier un lot avicole' },
  { action: 'create_sale', module: 'ventes', label: 'Créer une vente ou commande' },
  { action: 'create_finance_record', module: 'finances', label: 'Créer une transaction financière' },
  { action: 'create_document', module: 'documents', label: 'Créer ou attacher un document' },
  { action: 'create_equipment_record', module: 'equipements', label: 'Créer ou modifier une maintenance' },
  { action: 'create_crop_record', module: 'cultures', label: 'Créer ou modifier une opération culture' },
];

export function canRoleAccessModule(role = 'visiteur', module = '') {
  const policy = ROLE_ACTION_POLICY[role] || ROLE_ACTION_POLICY.visiteur;
  return policy.modules.includes('*') || policy.modules.includes(module);
}

export function canRolePerformAction(role = 'visiteur', action = 'read', module = '') {
  const policy = ROLE_ACTION_POLICY[role] || ROLE_ACTION_POLICY.visiteur;
  const moduleAllowed = policy.modules.includes('*') || !module || policy.modules.includes(module);
  const actionAllowed = policy.actions.includes('*') || policy.actions.includes(action);
  return moduleAllowed && actionAllowed;
}

export function getAccessDeniedMessage(language = 'fr') {
  if (language === 'wo') return 'Mënuma def loolu ak sa ndigal léegi. Laajal responsable bi mu jox la accès bu gën a yaatu.';
  if (language === 'en') return 'I cannot perform this action with your current access level. Please ask a manager for the required permission.';
  return 'Je ne peux pas effectuer cette action avec votre niveau d’accès actuel. Demandez à un responsable de vous accorder l’autorisation nécessaire.';
}
