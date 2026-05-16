import { supabase } from '../lib/supabase';
import { moduleSeedMap } from '../utils/mockData';
import { normalizeByModule, normalizePayloadBeforeSave } from '../utils/normalize';
import { isSimulatedDataModeEnabled } from '../utils/uiPreferences';

const clonedModuleSeedMap = JSON.parse(JSON.stringify(moduleSeedMap || {}));
Object.keys(moduleSeedMap || {}).forEach((key) => { moduleSeedMap[key] = []; });

const tableModuleMap = {
  animals: 'animaux',
  lots: 'avicole',
  vaccins: 'sante',
  veterinaires: 'veterinaires',
  finances: 'finances',
  investments: 'investissements',
  business_plans: 'business_plans',
  bp_investment_lines: 'bp_investment_lines',
  bp_recurring_costs: 'bp_recurring_costs',
  bp_revenue_projections: 'bp_revenue_projections',
  bp_funding_sources: 'bp_funding_sources',
  bp_links: 'bp_links',
  bp_risks: 'bp_risks',
  price_catalog: 'price_catalog',
  bp_versions: 'bp_versions',
  bp_lines_history: 'bp_lines_history',
  stocks: 'stock',
  stock: 'stock',
  clients: 'clients',
  fournisseurs: 'fournisseurs',
  tracabilite: 'tracabilite',
  cultures: 'cultures',
  ventes: 'ventes',
  documents: 'documents',
  taches: 'taches',
  rapports: 'rapports',
  equipements: 'equipements',
  audit_logs: 'audit_logs',
  alimentation_logs: 'alimentation_logs',
  production_oeufs_logs: 'production_oeufs_logs',
  sensor_devices: 'sensor_devices',
  camera_devices: 'camera_devices',
  business_events: 'business_events',
  alertes_center: 'alertes_center',
  whatsapp_templates: 'whatsapp_templates',
  whatsapp_logs: 'whatsapp_logs',
  sales_orders: 'sales_orders',
  sales_order_items: 'sales_order_items',
  deliveries: 'deliveries',
  invoices: 'invoices',
  payments: 'payments',
  sales_opportunities: 'sales_opportunities',
};

const simulatedStorageKey = (table) => `horizon_simulated_rows:${table}`;
const readSimulatedRows = (table) => {
  if (typeof localStorage === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(simulatedStorageKey(table)) || '[]'); } catch { return []; }
};
const writeSimulatedRows = (table, rows = []) => {
  if (typeof localStorage === 'undefined') return rows;
  localStorage.setItem(simulatedStorageKey(table), JSON.stringify(rows));
  return rows;
};
const mergeById = (rows = [], updates = [], idField = 'id') => {
  const map = new Map(rows.map((row) => [String(row?.[idField] ?? row?.id), row]));
  updates.forEach((row) => map.set(String(row?.[idField] ?? row?.id), row));
  return Array.from(map.values()).filter((row) => !row?.__deleted);
};
const getSimulatedTableRows = (table, idField = 'id') => {
  const moduleKey = tableModuleMap[table] || table;
  const baseRows = JSON.parse(JSON.stringify(clonedModuleSeedMap[moduleKey] || []));
  const localRows = readSimulatedRows(table);
  return normalizeByModule(moduleKey, mergeById(baseRows, localRows, idField));
};
const createSimulatedRow = (table, payload = {}, idField = 'id') => {
  const moduleKey = tableModuleMap[table] || table;
  const rows = getSimulatedTableRows(table, idField);
  const record = normalizeByModule(moduleKey, [{ ...payload, [idField]: payload?.[idField] || payload?.id || `${table}-${Date.now()}` }])[0];
  const next = mergeById(rows, [record], idField);
  writeSimulatedRows(table, next);
  return record;
};
const updateSimulatedRow = (table, id, payload = {}, idField = 'id') => {
  const moduleKey = tableModuleMap[table] || table;
  const rows = getSimulatedTableRows(table, idField);
  const previous = rows.find((row) => String(row?.[idField]) === String(id)) || {};
  const record = normalizeByModule(moduleKey, [{ ...previous, ...payload, [idField]: id }])[0];
  const next = mergeById(rows, [record], idField);
  writeSimulatedRows(table, next);
  return record;
};
const removeSimulatedRow = (table, id, idField = 'id') => {
  const rows = getSimulatedTableRows(table, idField);
  writeSimulatedRows(table, rows.filter((row) => String(row?.[idField]) !== String(id)));
  return true;
};

const dbKeyMap = {
  productionJour: 'productionjour',
  revenuEstime: 'revenu_estime',
  scoresSante: 'scores_sante',
  prixUnit: 'prixunit',
  totalAchats: 'totalachats',
  derniereCommande: 'dernierecommande',
  margeFinale: 'margefinale',
  photoUrl: 'photo_url',
  moduleLie: 'module_lie',
  relatedId: 'related_id',
  clientId: 'client_id',
  fournisseurId: 'fournisseur_id',
  justificatifUrl: 'justificatif_url',
  treasuryAccountId: 'treasury_account_id',
  accountingEntryId: 'accounting_entry_id',
};

const GENERATED_COLUMNS = {
  bp_investment_lines: ['total'],
  bp_revenue_projections: ['ca_estime', 'marge_estimee'],
  business_plans: ['apport_total'],
};

const today = () => new Date().toISOString().slice(0, 10);
const amountOf = (...values) => values.map((value) => Number(value || 0)).find((value) => value > 0) || 0;

const enrichWorkflowPayload = (payload = {}, table = '') => {
  if (table !== 'payments') return payload;
  const paymentDate = payload.date_paiement || payload.date || payload.paid_at || today();
  const amount = amountOf(payload.montant_paye, payload.montant, payload.amount, payload.paid_amount);
  return {
    ...payload,
    date_paiement: paymentDate,
    date: payload.date || paymentDate,
    montant_paye: amount || payload.montant_paye || 0,
    montant: payload.montant ?? amount,
    amount: payload.amount ?? amount,
    mode_paiement: payload.mode_paiement || payload.moyen_paiement || payload.paiement || payload.payment_method || 'Cash',
    moyen_paiement: payload.moyen_paiement || payload.mode_paiement || payload.paiement || payload.payment_method || 'Cash',
    statut: payload.statut || 'paye',
  };
};

const toDbPayload = (payload = {}, table = '') => {
  const generated = GENERATED_COLUMNS[table] || [];
  const enriched = enrichWorkflowPayload(payload, table);
  const mapped = Object.fromEntries(
    Object.entries(enriched)
      .filter(([key]) => !generated.includes(dbKeyMap[key] || key))
      .map(([key, value]) => [dbKeyMap[key] || key, value])
  );
  return normalizePayloadBeforeSave(mapped);
};

const getMissingSchemaColumn = (error) => {
  const message = String(error?.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
};

const isDuplicateKeyError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '23505' || message.includes('duplicate key value violates unique constraint');
};

const isSingleObjectCoercionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'PGRST116' || message.includes('cannot coerce the result to a single json object') || message.includes('json object requested');
};

const withoutColumn = (payload, column) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => (dbKeyMap[key] || key) !== column));

const firstRow = (data, fallback = null) => Array.isArray(data) ? (data[0] || fallback) : (data || fallback);

const selectExistingByPrimaryKey = async ({ table, id, idField, fallback }) => {
  if (!id) return fallback;
  const { data, error } = await supabase.from(table).select('*').eq(idField, id).limit(1);
  if (error) return fallback;
  return firstRow(data, fallback);
};

const updateExistingByPrimaryKey = async ({ table, payload, idField }) => {
  const id = payload?.[idField];
  if (!id) return payload;
  const { data, error } = await supabase.from(table).update(payload).eq(idField, id).select('*').limit(1);
  if (error) {
    if (isSingleObjectCoercionError(error)) return selectExistingByPrimaryKey({ table, id, idField, fallback: payload });
    throw error;
  }
  return firstRow(data, payload);
};

const executeMutation = async ({ table, action, payload, id, idField }) => {
  if (action === 'insert') {
    return supabase.from(table).insert(payload).select('*').limit(1);
  }
  return supabase.from(table).update(payload).eq(idField, id).select('*').limit(1);
};

const runMutationWithSchemaRetry = async ({ table, action, payload, id, idField }) => {
  let nextPayload = toDbPayload(payload, table);
  const removedColumns = [];

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { data, error } = await executeMutation({ table, action, payload: nextPayload, id, idField });
    if (!error) return firstRow(data, nextPayload);

    if (isSingleObjectCoercionError(error)) {
      return selectExistingByPrimaryKey({ table, id: id || nextPayload?.[idField], idField, fallback: nextPayload });
    }

    if (action === 'insert' && isDuplicateKeyError(error) && nextPayload?.[idField]) {
      return updateExistingByPrimaryKey({ table, payload: nextPayload, idField });
    }

    const missingColumn = getMissingSchemaColumn(error);
    if (!missingColumn || removedColumns.includes(missingColumn)) throw error;

    removedColumns.push(missingColumn);
    nextPayload = withoutColumn(nextPayload, missingColumn);
  }

  console.warn(`Schema Supabase incomplet pour ${table}. Colonnes ignorees: ${removedColumns.join(', ')}`);
  return nextPayload;
};

const isSoftDeleted = (row = {}) => Boolean(row.is_deleted || row.deleted_at || row.deletedAt);

const filterSoftDeletedRows = (rows = []) => Array.isArray(rows) ? rows.filter((row) => !isSoftDeleted(row)) : [];

const currentUserId = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || data?.user?.email || 'system';
  } catch {
    return 'system';
  }
};

const writeDeletedRecord = async ({ table, id, idField }) => {
  try {
    const actor = await currentUserId();
    await supabase.from('deleted_records').upsert({
      id: `${table}:${id}`,
      module_key: table,
      table_name: table,
      record_id: String(id),
      id_field: idField,
      deleted_by: actor,
      deleted_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (!message.includes('deleted_records') && !message.includes('schema cache') && !message.includes('does not exist')) {
      console.warn('Deleted record journal non enregistre', error.message || error);
    }
  }
};

const trySoftDelete = async ({ table, id, idField }) => {
  const actor = await currentUserId();
  const payload = {
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: actor,
  };
  let nextPayload = payload;
  const removedColumns = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (Object.keys(nextPayload).length === 0) return false;
    const { error } = await supabase.from(table).update(nextPayload).eq(idField, id);
    if (!error) {
      await writeDeletedRecord({ table, id, idField });
      return true;
    }
    const missingColumn = getMissingSchemaColumn(error);
    if (!missingColumn || removedColumns.includes(missingColumn)) return false;
    removedColumns.push(missingColumn);
    nextPayload = withoutColumn(nextPayload, missingColumn);
  }

  return false;
};

export const createSupabaseCrudService = (table, idField = 'id') => ({
  async getAll() {
    if (!table) return [];
    if (isSimulatedDataModeEnabled()) return getSimulatedTableRows(table, idField);
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return filterSoftDeletedRows(data || []);
  },

  async create(payload) {
    if (!table) return payload;
    if (isSimulatedDataModeEnabled()) return createSimulatedRow(table, payload, idField);
    return runMutationWithSchemaRetry({ table, action: 'insert', payload, idField });
  },

  async update(id, payload) {
    if (!table) return payload;
    if (isSimulatedDataModeEnabled()) return updateSimulatedRow(table, id, payload, idField);
    return runMutationWithSchemaRetry({ table, action: 'update', payload, id, idField });
  },

  async remove(id) {
    if (!table) return true;
    if (isSimulatedDataModeEnabled()) return removeSimulatedRow(table, id, idField);
    const softDeleted = await trySoftDelete({ table, id, idField });
    if (softDeleted) return true;
    await writeDeletedRecord({ table, id, idField });
    const { error } = await supabase.from(table).delete().eq(idField, id);
    if (error) throw error;
    return true;
  },
});