const clean = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const today = () => new Date().toISOString().slice(0, 10);

export const TRACE_ROUTE_BY_MODULE = {
  stocks: 'stock',
  stock: 'stock',
  ventes: 'ventes',
  sales_orders: 'ventes',
  payments: 'ventes',
  finances: 'finances',
  animaux: 'animaux',
  avicole: 'avicole',
  cultures: 'cultures',
  sante: 'sante',
  documents: 'documents',
  taches: 'taches',
  alertes: 'alertes',
  fournisseurs: 'fournisseurs',
  clients: 'clients',
  investissements: 'investissements',
  equipements: 'equipements',
  rh: 'rh',
  smartfarm: 'smartfarm',
  objectifs_croissance: 'objectifs_croissance',
  centre_ia: 'centre_ia',
  gestion_systeme: 'gestion_systeme',
  sync_activity: 'sync_activity',
};

export function routeForTrace(event = {}) {
  return TRACE_ROUTE_BY_MODULE[event.module_source || event.source_module || event.module] || '';
}

export function traceHasSource(event = {}) {
  return Boolean(
    (event.module_source || event.source_module || event.module)
    && (event.entity_id || event.source_record_id || event.related_id || event.linked_sale_id || event.linked_transaction_id || event.linked_document_id || event.linked_task_id || event.linked_alert_id)
  );
}

export function normalizeTraceEvent(event = {}) {
  const moduleSource = event.module_source || event.source_module || event.module || inferModule(event);
  const entityId = event.entity_id || event.source_record_id || event.related_id || event.linked_sale_id || event.linked_transaction_id || event.linked_document_id || event.linked_task_id || event.linked_alert_id || '';
  return {
    ...event,
    module_source: moduleSource || 'autre',
    entity_id: entityId,
    event_type: event.event_type || event.type_evenement || event.action || 'fait_important',
    title: event.title || event.titre || event.label || event.action || event.id || 'Fait important',
    description: event.description || event.notes || event.message || '',
    event_date: event.event_date || event.date || event.created_at || today(),
    severity: event.severity || event.gravite || 'info',
    has_source: traceHasSource({ ...event, module_source: moduleSource, entity_id: entityId }),
    source_route: TRACE_ROUTE_BY_MODULE[moduleSource] || '',
  };
}

export function buildSensitiveActionTrace({ action = 'action_admin', module = 'gestion_systeme', entityId = '', title = '', description = '', date = today(), severity = 'warning' } = {}) {
  const moduleSource = module || 'gestion_systeme';
  const idKey = `${moduleSource}-${action}-${entityId || date}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  return normalizeTraceEvent({
    id: `EVT-${idKey}`,
    event_type: action,
    module_source: moduleSource,
    entity_type: moduleSource,
    entity_id: entityId || moduleSource,
    title: title || `Action sensible ${moduleSource}`,
    description,
    event_date: date,
    severity,
  });
}

export function buildTraceCoverage(events = []) {
  const rows = events.map(normalizeTraceEvent);
  const missingSource = rows.filter((event) => !event.has_source);
  const sensitive = rows.filter((event) => {
    const text = clean(`${event.event_type} ${event.title}`);
    return ['vente', 'paiement', 'perte', 'soin', 'recolte', 'stock', 'investissement', 'panne', 'reparation', 'suppression', 'deleted', 'admin', 'system', 'cloture'].some((word) => text.includes(word));
  });
  const sensitiveMissing = sensitive.filter((event) => !event.has_source);
  return {
    total: rows.length,
    withSource: rows.length - missingSource.length,
    missingSource,
    sensitive,
    sensitiveMissing,
    coverageRate: rows.length ? Math.round(((rows.length - missingSource.length) / rows.length) * 100) : 100,
  };
}

function inferModule(event = {}) {
  const text = clean(`${event.event_type || ''} ${event.type_evenement || ''} ${event.title || ''} ${event.description || ''}`);
  if (text.includes('vente') || text.includes('commande')) return 'ventes';
  if (text.includes('paiement') || text.includes('finance') || text.includes('cash')) return 'finances';
  if (text.includes('stock') || text.includes('reception') || text.includes('sortie')) return 'stock';
  if (text.includes('soin') || text.includes('vaccin') || text.includes('sante')) return 'sante';
  if (text.includes('recolte') || text.includes('culture')) return 'cultures';
  if (text.includes('panne') || text.includes('reparation') || text.includes('equipement')) return 'equipements';
  if (text.includes('admin') || text.includes('system')) return 'gestion_systeme';
  return '';
}
