const today = () => new Date().toISOString().slice(0, 10);

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
};

export function routeForSyncIssue(issue = {}) {
  return SYNC_ISSUE_ROUTES[issue.module] || issue.module || 'sync_activity';
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
    .replace('Un document est lié à un élément qui n’existe plus.', 'Document lié à une fiche introuvable.');
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
    source_module: 'sync_activity',
    source_record_id: issue.row_id || issue.linked_id || issue.flow || '',
    action_key: options.actionKey || `sync:${issue.flow || 'erp'}:${issue.module || 'module'}:${issue.row_id || issue.linked_id || 'row'}`,
  };
}
