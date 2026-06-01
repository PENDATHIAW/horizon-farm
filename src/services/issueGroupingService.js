import { enrichLinkedFields } from './issueLinkingService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

function issueKeyOf(record = {}, moduleKey = 'record') {
  return clean(record.issue_key)
    || clean(record.alert_dedupe_key)
    || clean(record.dedupe_key)
    || enrichLinkedFields(moduleKey, record).issue_key;
}

function labelOf(record = {}) {
  return record.title || record.nom || record.name || record.libelle || record.message || record.event_type || record.id || 'Élément';
}

function moduleOf(record = {}) {
  return record.source_module || record.module_source || record.module_lie || record.module || 'system';
}

function isOpen(record = {}, type = '') {
  if (type === 'alerte') {
    return !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'ignoree', 'ignorée', 'done'].includes(lower(record.status || record.statut));
  }
  if (type === 'tache') {
    return !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(lower(record.status || record.statut));
  }
  return true;
}

function pushItem(map, key, item) {
  if (!key) return;
  if (!map.has(key)) {
    map.set(key, {
      issueKey: key,
      sourceModule: item.sourceModule,
      sourceRecordId: item.sourceRecordId,
      title: item.title,
      items: [],
      openCount: 0,
      modules: new Set(),
      severities: new Set(),
    });
  }
  const group = map.get(key);
  group.items.push(item);
  if (item.open) group.openCount += 1;
  if (item.sourceModule) group.modules.add(item.sourceModule);
  if (item.severity) group.severities.add(item.severity);
  if (!group.title || group.title === 'Élément') group.title = item.title;
}

export function buildIssueGroups({
  alertes = [],
  taches = [],
  businessEvents = [],
  recommendations = [],
  salesOrders = [],
  payments = [],
} = {}) {
  const map = new Map();

  arr(alertes).forEach((row) => {
    const key = issueKeyOf(row, 'alertes_center');
    pushItem(map, key, {
      type: 'alerte',
      id: row.id,
      title: labelOf(row),
      sourceModule: moduleOf(row),
      sourceRecordId: clean(row.source_record_id || row.entity_id || row.related_record_id),
      severity: lower(row.severity || row.priorite),
      open: isOpen(row, 'alerte'),
      record: row,
    });
  });

  arr(taches).forEach((row) => {
    const key = issueKeyOf(row, 'taches');
    pushItem(map, key, {
      type: 'tache',
      id: row.id,
      title: labelOf(row),
      sourceModule: moduleOf(row),
      sourceRecordId: clean(row.source_record_id || row.related_record_id || row.entity_id),
      severity: lower(row.priority || row.priorite),
      open: isOpen(row, 'tache'),
      record: row,
    });
  });

  arr(businessEvents).forEach((row) => {
    const key = issueKeyOf(row, 'business_events');
    pushItem(map, key, {
      type: 'event',
      id: row.id,
      title: labelOf(row),
      sourceModule: moduleOf(row),
      sourceRecordId: clean(row.source_record_id || row.entity_id || row.related_id),
      severity: lower(row.severity),
      open: true,
      record: row,
    });
  });

  arr(recommendations).forEach((row) => {
    const key = issueKeyOf(row, 'ai_recommendations');
    pushItem(map, key, {
      type: 'recommendation',
      id: row.id,
      title: labelOf(row),
      sourceModule: moduleOf(row),
      sourceRecordId: clean(row.source_record_id || row.related_record_id),
      severity: lower(row.severity || row.priority),
      open: lower(row.status) !== 'applied',
      record: row,
    });
  });

  // Lier ventes/paiements orphelins quand issue_key explicite
  [...arr(salesOrders), ...arr(payments)].forEach((row, index) => {
    const key = issueKeyOf(row, index < salesOrders.length ? 'sales_orders' : 'payments');
    if (!clean(row.issue_key) && !clean(row.dedupe_key)) return;
    pushItem(map, key, {
      type: index < salesOrders.length ? 'vente' : 'paiement',
      id: row.id,
      title: labelOf(row),
      sourceModule: moduleOf(row),
      sourceRecordId: clean(row.source_record_id || row.id),
      severity: 'info',
      open: true,
      record: row,
    });
  });

  return [...map.values()]
    .map((group) => ({
      ...group,
      modules: [...group.modules],
      severities: [...group.severities],
      itemCount: group.items.length,
      hasOpen: group.openCount > 0,
    }))
    .sort((a, b) => {
      if (a.hasOpen !== b.hasOpen) return a.hasOpen ? -1 : 1;
      if (a.openCount !== b.openCount) return b.openCount - a.openCount;
      return b.itemCount - a.itemCount;
    });
}

export function summarizeIssueGroups(groups = []) {
  const rows = arr(groups);
  return {
    total: rows.length,
    open: rows.filter((row) => row.hasOpen).length,
    linkedItems: rows.reduce((sum, row) => sum + row.itemCount, 0),
    rows: rows.slice(0, 20),
  };
}

export function navigateTargetForGroup(group = {}) {
  const module = group.sourceModule || group.modules?.[0] || 'alertes';
  const map = {
    alertes_center: 'alertes',
    ventes: 'ventes',
    sales_orders: 'ventes',
    finances: 'finance_pilotage',
    stock: 'stock',
    animaux: 'elevage',
    avicole: 'elevage',
    cultures: 'cultures',
    documents: 'documents_rapports',
    rh: 'rh',
    equipements: 'equipements',
    smartfarm: 'smartfarm',
  };
  return map[lower(module)] || module.replace(/_/g, ' ');
}
