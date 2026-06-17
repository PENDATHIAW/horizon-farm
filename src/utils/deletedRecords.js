import { safeLocalStorageSetJson } from './safeLocalStorage';

const tombstoneKey = (moduleKey) => `horizon_farm_deleted_ids:${moduleKey}`;
const tombstoneMetaKey = (moduleKey) => `horizon_farm_deleted_records:${moduleKey}`;

function safeReadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  if (typeof window === 'undefined') return;
  const payload = Array.isArray(value) ? value.slice(-500) : value;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const entries = Object.entries(payload).slice(-120);
    safeLocalStorageSetJson(key, Object.fromEntries(entries));
    return;
  }
  safeLocalStorageSetJson(key, payload);
}

export function readDeletedIds(moduleKey) {
  if (typeof window === 'undefined' || !moduleKey) return new Set();
  const list = safeReadJson(tombstoneKey(moduleKey), []);
  return new Set(Array.isArray(list) ? list.map(String) : []);
}

export function readDeletedRecords(moduleKey) {
  if (typeof window === 'undefined' || !moduleKey) return {};
  const records = safeReadJson(tombstoneMetaKey(moduleKey), {});
  return records && typeof records === 'object' && !Array.isArray(records) ? records : {};
}

export function deletedRecordSignature(row = {}) {
  return [
    row.id,
    row.alert_dedupe_key,
    row.module_source || row.module,
    row.entity_type,
    row.entity_id,
    row.source_module,
    row.source_id,
    row.related_id,
    row.title,
    row.action_recommandee,
  ].filter(Boolean).map(String).join('|');
}

export function rememberDeletedId(moduleKey, id, record = null) {
  if (typeof window === 'undefined' || !moduleKey || !id) return;
  const deleted = readDeletedIds(moduleKey);
  deleted.add(String(id));
  safeWriteJson(tombstoneKey(moduleKey), [...deleted]);

  if (record) {
    const records = readDeletedRecords(moduleKey);
    records[String(id)] = {
      id: String(id),
      deleted_at: new Date().toISOString(),
      signature: deletedRecordSignature(record),
      alert_dedupe_key: record.alert_dedupe_key || '',
      module_source: record.module_source || record.module || '',
      entity_type: record.entity_type || '',
      entity_id: record.entity_id || '',
      title: record.title || '',
      action_recommandee: record.action_recommandee || '',
    };
    safeWriteJson(tombstoneMetaKey(moduleKey), records);
  }
}

export function forgetDeletedId(moduleKey, id) {
  if (typeof window === 'undefined' || !moduleKey || !id) return;
  const deleted = readDeletedIds(moduleKey);
  if (deleted.has(String(id))) {
    deleted.delete(String(id));
    safeWriteJson(tombstoneKey(moduleKey), [...deleted]);
  }
  const records = readDeletedRecords(moduleKey);
  if (records[String(id)]) {
    delete records[String(id)];
    safeWriteJson(tombstoneMetaKey(moduleKey), records);
  }
}

export function isDeletedRecord(moduleKey, row = {}) {
  if (!moduleKey || !row) return false;
  const deleted = readDeletedIds(moduleKey);
  if (row.id && deleted.has(String(row.id))) return true;
  const records = Object.values(readDeletedRecords(moduleKey));
  if (!records.length) return false;
  const signature = deletedRecordSignature(row);
  return records.some((record) => {
    if (record.alert_dedupe_key && row.alert_dedupe_key && record.alert_dedupe_key === row.alert_dedupe_key) return true;
    if (record.signature && signature && record.signature === signature) return true;
    const sameTarget = record.module_source && record.entity_type && record.entity_id
      && String(record.module_source) === String(row.module_source || row.module || '')
      && String(record.entity_type) === String(row.entity_type || '')
      && String(record.entity_id) === String(row.entity_id || '');
    const sameAction = !record.action_recommandee || !row.action_recommandee || String(record.action_recommandee) === String(row.action_recommandee);
    return sameTarget && sameAction;
  });
}

export function filterDeletedRows(moduleKey, rows) {
  const current = Array.isArray(rows) ? rows : [];
  return current.filter((row) => !isDeletedRecord(moduleKey, row));
}

export function filterDataMapDeleted(dataMap = {}) {
  return Object.fromEntries(Object.entries(dataMap || {}).map(([key, rows]) => [key, filterDeletedRows(key, rows)]));
}

const SIMULATED_SEED_MODULE_KEYS = [
  'animaux', 'avicole', 'lots', 'sante', 'veterinaires', 'finances', 'investissements', 'stock', 'stocks',
  'clients', 'fournisseurs', 'tracabilite', 'cultures', 'ventes', 'documents', 'taches', 'rapports', 'equipements',
  'audit_logs', 'alimentation_logs', 'production_oeufs_logs', 'sensor_devices', 'camera_devices', 'business_events',
  'alertes_center', 'whatsapp_templates', 'whatsapp_logs', 'sales_orders', 'sales_order_items', 'deliveries',
  'invoices', 'payments', 'sales_opportunities', 'business_plans', 'bp_investment_lines', 'bp_recurring_costs',
  'bp_revenue_projections', 'bp_funding_sources', 'bp_links', 'bp_risks', 'price_catalog', 'bp_versions', 'bp_lines_history',
];

/** Efface les masquages locaux des données de démonstration lors de l’activation du mode simulé. */
export function clearSimulatedSeedTombstones() {
  if (typeof window === 'undefined') return;
  SIMULATED_SEED_MODULE_KEYS.forEach((moduleKey) => {
    safeWriteJson(tombstoneKey(moduleKey), []);
    safeWriteJson(tombstoneMetaKey(moduleKey), {});
  });
}
