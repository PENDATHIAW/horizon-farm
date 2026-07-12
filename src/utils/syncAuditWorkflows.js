const today = () => new Date().toISOString().slice(0, 10);
const arr = (value) => (Array.isArray(value) ? value : []);

export const SYNC_ISSUE_DOMAINS = {
  TOUTES: 'toutes',
  IOT: 'iot',
  FINANCE: 'finance',
};

const FINANCE_FLOWS = new Set(['sales_finance', 'stock_supply_finance', 'health_stock_finance', 'investment_profitability', 'sales_stock_sources']);

export function filterSyncIssuesByDomain(issues = [], domain = SYNC_ISSUE_DOMAINS.TOUTES) {
  if (!domain || domain === SYNC_ISSUE_DOMAINS.TOUTES) return arr(issues);
  return arr(issues).filter((issue) => {
    const flow = issue.flow || '';
    const module = String(issue.module || '').toLowerCase();
    if (domain === SYNC_ISSUE_DOMAINS.IOT) {
      return flow === 'smartfarm_alerts_tasks'
        || module === 'smartfarm_events'
        || module === 'sensor_devices'
        || module === 'camera_devices';
    }
    if (domain === SYNC_ISSUE_DOMAINS.FINANCE) {
      return FINANCE_FLOWS.has(flow);
    }
    return true;
  });
}

export const SYNC_ISSUE_ROUTES = {
  payments: 'ventes',
  invoices: 'ventes',
  sales_orders: 'ventes',
  sales_opportunities: 'ventes',
  clients: 'clients',
  fournisseurs: 'fournisseurs',
  documents: 'documents',
  stock: 'stock',
  alertes_center: 'alertes',
  taches: 'taches',
  sante: 'sante',
  finances: 'finances',
  business_events: 'tracabilite',
  smartfarm_events: 'smartfarm',
  sensor_devices: 'smartfarm',
  camera_devices: 'smartfarm',
  alimentation_logs: 'stock',
  production_oeufs_logs: 'avicole',
  avicole: 'avicole',
  animaux: 'animaux',
};

/** Onglet cible dans le module canonique une fois résolu. */
export const SYNC_ISSUE_TABS = {
  payments: 'Clients & créances',
  invoices: 'Ventes',
  sales_orders: 'Ventes',
  sales_opportunities: 'Opportunités',
  clients: 'Clients & créances',
  fournisseurs: 'Fournisseurs & dettes',
  documents: 'Rapprochement & preuves',
  stock: 'Inventaire',
  alertes_center: 'À traiter maintenant',
  taches: 'À traiter maintenant',
  sante: 'Santé',
  finances: 'Trésorerie',
  business_events: 'Registre & traçabilité',
  smartfarm_events: 'Objets connectés',
  sensor_devices: 'Objets connectés',
  camera_devices: 'Objets connectés',
  alimentation_logs: 'Inventaire',
  production_oeufs_logs: 'Lots & bandes',
  avicole: 'Lots & bandes',
  animaux: 'Lots & bandes',
};

export function routeForSyncIssue(issue = {}) {
  return SYNC_ISSUE_ROUTES[issue.module] || issue.module || 'gestion_systeme';
}

export function tabForSyncIssue(issue = {}) {
  return SYNC_ISSUE_TABS[issue.module] || null;
}

export function syncIssueActionLabel(issue = {}) {
  const module = issue.module || '';
  const message = String(issue.message || '').toLowerCase();
  if (module === 'sales_orders' && message.includes('statut')) return 'Mettre à jour la vente';
  if (module === 'sales_opportunities') return 'Fermer l’opportunité';
  if (module === 'documents' || message.includes('preuve') || message.includes('document')) return 'Créer preuve / facture';
  if (module === 'stock' || module === 'alertes_center') return 'Créer une tâche';
  return 'Créer une alerte';
}

export function syncIssueReadableTitle(issue = {}) {
  const message = issue.message || 'Point à vérifier';
  return message
    .replace('Un paiement n’est lié à aucune vente.', 'Paiement sans vente liée.')
    .replace('Un encaissement de vente n’apparaît pas encore dans les finances.', 'Paiement absent des finances.')
    .replace('Une opportunité déjà vendue est encore ouverte.', 'Opportunité déjà vendue encore ouverte.')
    .replace('Un document est lié à un élément qui n’existe plus.', 'Document orphelin.')
    .replace('Un document n’est lié à aucune dépense, vente ou paiement.', 'Document orphelin.')
    .replace('Une dépense stockable n’a pas encore d’entrée stock associée.', 'Dépense stockable sans entrée stock.')
    .replace('Une alimentation n’a pas encore de sortie stock enregistrée.', 'Alimentation sans sortie stock.')
    .replace('Une alerte reste ouverte alors que la tâche associée est terminée.', 'Alerte avec tâche terminée.')
    .replace('Un événement IoT n’est lié à aucun objet connecté.', 'Événement IoT sans objet.')
    .replace('Un événement IoT référence un capteur ou caméra introuvable.', 'Événement IoT orphelin.');
}

export function buildSyncRepairTask(issue = {}, options = {}) {
  const route = routeForSyncIssue(issue);
  const title = options.title || syncIssueReadableTitle(issue);
  const id = options.id || `TASK-SYNC-${String(issue.module || 'erp').toUpperCase()}-${String(issue.row_id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32)}`;
  return {
    id,
    title,
    module_lie: route,
    entity_type: issue.module || 'erp_issue',
    related_id: issue.row_id || issue.linked_id || '',
    due_date: options.date || today(),
    priority: issue.severity === 'critical' ? 'critique' : 'haute',
    status: 'a_faire',
    notes: issue.message || 'Tâche créée depuis Activité & Sync ERP.',
    source_module: 'gestion_systeme',
    source_record_id: issue.row_id || issue.linked_id || issue.flow || '',
    action_key: options.actionKey || `sync:${issue.flow || 'erp'}:${issue.module || 'module'}:${issue.row_id || issue.linked_id || 'row'}`,
  };
}
