import { supabase } from '../lib/supabase.js';
import { getModuleSeedRows } from '../utils/mockData.js';
import { normalizeByModule, normalizePayloadBeforeSave } from '../utils/normalize.js';
import { safeLocalStorageSetJson } from '../utils/safeLocalStorage.js';
import { isSimulatedDataModeEnabled } from '../utils/uiPreferences.js';
import { withFarmId } from '../utils/farmScopePayload.js';
import { enrichLinkedFields } from './issueLinkingService.js';

import {
  resetSimulatedLocalStateIfNeeded,
  simulatedDeletedKey,
  simulatedStorageKey,
} from '../utils/simulatedModeStorage.js';

const tableModuleMap = {
  transactions: 'finances', tasks: 'taches', reports: 'rapports', equipment: 'equipements', animals: 'animaux', lots: 'avicole', vaccins: 'sante', veterinaires: 'veterinaires', finances: 'finances', investments: 'investissements', business_plans: 'business_plans', bp_investment_lines: 'bp_investment_lines', bp_recurring_costs: 'bp_recurring_costs', bp_revenue_projections: 'bp_revenue_projections', bp_funding_sources: 'bp_funding_sources', bp_links: 'bp_links', bp_risks: 'bp_risks', price_catalog: 'price_catalog', bp_versions: 'bp_versions', bp_lines_history: 'bp_lines_history', stocks: 'stock', stock: 'stock', clients: 'clients', fournisseurs: 'fournisseurs', tracabilite: 'tracabilite', cultures: 'cultures', ventes: 'ventes', documents: 'documents', taches: 'taches', rapports: 'rapports', equipements: 'equipements', audit_logs: 'audit_logs', alimentation_logs: 'alimentation_logs', production_oeufs_logs: 'production_oeufs_logs', sensor_devices: 'sensor_devices', camera_devices: 'camera_devices', business_events: 'business_events', alertes_center: 'alertes_center', whatsapp_templates: 'whatsapp_templates', whatsapp_logs: 'whatsapp_logs', sales_orders: 'sales_orders', sales_order_items: 'sales_order_items', deliveries: 'deliveries', invoices: 'invoices', payments: 'payments', sales_opportunities: 'sales_opportunities',
  feed_raw_materials: 'feed_raw_materials', feed_raw_batches: 'feed_raw_batches', feed_formulas: 'feed_formulas', feed_formula_versions: 'feed_formula_versions', feed_formula_ingredients: 'feed_formula_ingredients', feed_facility_zones: 'feed_facility_zones',
  feed_production_orders: 'feed_production_orders', feed_finished_batches: 'feed_finished_batches', feed_quality_checks: 'feed_quality_checks',
  feed_trials: 'feed_trials', feed_phase1_comparisons: 'feed_phase1_comparisons',
  funding_opportunities: 'funding_opportunities', funding_contacts: 'funding_contacts', funding_applications: 'funding_applications',
  funding_document_library: 'funding_document_library', funding_agreements: 'funding_agreements', funding_expense_allocations: 'funding_expense_allocations',
  funding_reports: 'funding_reports', funding_project_journal: 'funding_project_journal', funder_accounts: 'funder_accounts', funder_access_logs: 'funder_access_logs',
};

const realDeletedKey = (table) => `horizon_real_deleted:${table}`;

const safeJson = (key, fallback) => {
  if (typeof localStorage === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};
const seedRowsForTable = (table) => {
  const moduleKey = tableModuleMap[table] || table;
  return getModuleSeedRows(moduleKey);
};

/** Ne conserve que les lignes créées/modifiées localement - pas la copie complète du seed. */
const readSimulatedRows = (table) => {
  const seedById = new Map(seedRowsForTable(table).map((row) => [String(row.id), row]));
  let raw = safeJson(simulatedStorageKey(table), []);
  if (!Array.isArray(raw)) raw = [];
  if (raw.length > Math.max(40, seedById.size + 15)) {
    raw = raw.filter((row) => {
      const id = String(row?.id ?? '');
      const seed = seedById.get(id);
      if (!seed) return true;
      return JSON.stringify(row) !== JSON.stringify(seed);
    });
    safeLocalStorageSetJson(simulatedStorageKey(table), raw);
  }
  return raw;
};
const writeSimulatedRows = (table, rows = []) => safeLocalStorageSetJson(simulatedStorageKey(table), rows);
const readDeletedIds = (table) => new Set(safeJson(simulatedDeletedKey(table), []).map(String));
const writeDeletedIds = (table, ids) => { safeLocalStorageSetJson(simulatedDeletedKey(table), Array.from(ids).map(String)); return ids; };
const readRealDeletedIds = (table) => new Set(safeJson(realDeletedKey(table), []).map(String));
const writeRealDeletedId = (table, id) => {
  if (typeof localStorage === 'undefined' || !id) return;
  const ids = readRealDeletedIds(table);
  ids.add(String(id));
  const list = [...ids].slice(-500);
  safeLocalStorageSetJson(realDeletedKey(table), list);
};
const readServerDeletedIds = async () => new Set();
const filterRealDeletedRows = async (table, rows = [], idField = 'id') => {
  const localIds = readRealDeletedIds(table);
  const serverIds = await readServerDeletedIds(table);
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const id = String(row?.[idField] ?? row?.id ?? '');
    return id && !localIds.has(id) && !serverIds.has(id);
  });
};
const mergeById = (rows = [], updates = [], idField = 'id') => {
  const map = new Map(rows.map((row) => [String(row?.[idField] ?? row?.id), row]));
  updates.forEach((row) => map.set(String(row?.[idField] ?? row?.id), row));
  return Array.from(map.values()).filter((row) => !row?.__deleted);
};
const getSimulatedTableRows = (table, idField = 'id') => {
  resetSimulatedLocalStateIfNeeded();
  const moduleKey = tableModuleMap[table] || table;
  const deletedIds = readDeletedIds(table);
  const baseRows = seedRowsForTable(table).filter((row) => !deletedIds.has(String(row?.[idField] ?? row?.id)));
  const localRows = readSimulatedRows(table).filter((row) => !deletedIds.has(String(row?.[idField] ?? row?.id)));
  return normalizeByModule(moduleKey, mergeById(baseRows, localRows, idField));
};
const createSimulatedRow = (table, payload = {}, idField = 'id') => {
  resetSimulatedLocalStateIfNeeded();
  const moduleKey = tableModuleMap[table] || table;
  const record = normalizeByModule(moduleKey, [{ ...payload, [idField]: payload?.[idField] || payload?.id || `${table}-${Date.now()}` }])[0];
  const id = String(record?.[idField] ?? record?.id);
  const deletedIds = readDeletedIds(table);
  deletedIds.delete(id);
  writeDeletedIds(table, deletedIds);
  const localRows = readSimulatedRows(table).filter((row) => String(row?.[idField] ?? row?.id) !== id);
  writeSimulatedRows(table, [...localRows, record]);
  return record;
};
const updateSimulatedRow = (table, id, payload = {}, idField = 'id') => {
  resetSimulatedLocalStateIfNeeded();
  const moduleKey = tableModuleMap[table] || table;
  const previous = getSimulatedTableRows(table, idField).find((row) => String(row?.[idField]) === String(id)) || {};
  const record = normalizeByModule(moduleKey, [{ ...previous, ...payload, [idField]: id }])[0];
  const deletedIds = readDeletedIds(table);
  deletedIds.delete(String(id));
  writeDeletedIds(table, deletedIds);
  const localRows = readSimulatedRows(table).filter((row) => String(row?.[idField] ?? row?.id) !== String(id));
  writeSimulatedRows(table, [...localRows, record]);
  return record;
};
const removeSimulatedRow = (table, id, idField = 'id') => {
  resetSimulatedLocalStateIfNeeded();
  const deletedIds = readDeletedIds(table);
  deletedIds.add(String(id));
  writeDeletedIds(table, deletedIds);
  const localRows = readSimulatedRows(table).filter((row) => String(row?.[idField] ?? row?.id) !== String(id));
  writeSimulatedRows(table, localRows);
  return true;
};

const dbKeyMap = { productionJour: 'productionjour', revenuEstime: 'revenu_estime', scoresSante: 'scores_sante', prixUnit: 'prixunit', totalAchats: 'totalachats', derniereCommande: 'dernierecommande', margeFinale: 'margefinale', photoUrl: 'photo_url', moduleLie: 'module_lie', relatedId: 'related_id', clientId: 'client_id', fournisseurId: 'fournisseur_id', justificatifUrl: 'justificatif_url', treasuryAccountId: 'treasury_account_id', accountingEntryId: 'accounting_entry_id' };
const GENERATED_COLUMNS = { bp_investment_lines: ['total'], bp_revenue_projections: ['ca_estime', 'marge_estimee'], business_plans: ['apport_total'] };
const today = () => new Date().toISOString().slice(0, 10);
const amountOf = (...values) => values.map((value) => Number(value || 0)).find((value) => value > 0) || 0;
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const closedOpportunity = (row = {}) => ['converti', 'converted', 'annule', 'annulee', 'ignor', 'perdu', 'cloture', 'clôturé'].some((status) => norm(row.status || row.statut).includes(status));
const enrichWorkflowPayload = (payload = {}, table = '') => {
  if (table !== 'payments') return payload;
  const paymentDate = payload.date_paiement || payload.date || payload.paid_at || today();
  const amount = amountOf(payload.montant_paye, payload.montant, payload.amount, payload.paid_amount);
  return { ...payload, date_paiement: paymentDate, date: payload.date || paymentDate, montant_paye: amount || payload.montant_paye || 0, montant: payload.montant ?? amount, amount: payload.amount ?? amount, mode_paiement: payload.mode_paiement || payload.moyen_paiement || payload.paiement || payload.payment_method || 'Cash', moyen_paiement: payload.moyen_paiement || payload.mode_paiement || payload.paiement || payload.payment_method || 'Cash', statut: payload.statut || 'paye' };
};
const toDbPayload = (payload = {}, table = '') => {
  const generated = GENERATED_COLUMNS[table] || [];
  const linked = enrichLinkedFields(table, payload);
  const enriched = enrichWorkflowPayload(linked, table);
  const mapped = Object.fromEntries(Object.entries(enriched).filter(([key]) => !generated.includes(dbKeyMap[key] || key)).map(([key, value]) => [dbKeyMap[key] || key, value]));
  return normalizePayloadBeforeSave(mapped);
};
const getMissingSchemaColumn = (error) => { const message = String(error?.message || ''); const match = message.match(/Could not find the '([^']+)' column/i); return match?.[1] || null; };
const isDuplicateKeyError = (error) => { const message = String(error?.message || '').toLowerCase(); return error?.code === '23505' || message.includes('duplicate key value violates unique constraint'); };
const isSingleObjectCoercionError = (error) => { const message = String(error?.message || '').toLowerCase(); return error?.code === 'PGRST116' || message.includes('cannot coerce the result to a single json object') || message.includes('json object requested'); };
const withoutColumn = (payload, column) => Object.fromEntries(Object.entries(payload).filter(([key]) => (dbKeyMap[key] || key) !== column));
const firstRow = (data, fallback = null) => Array.isArray(data) ? (data[0] || fallback) : (data || fallback);
const selectExistingByPrimaryKey = async ({ table, id, idField, fallback }) => { if (!id) return fallback; const { data, error } = await supabase.from(table).select('*').eq(idField, id).limit(1); if (error) return fallback; return firstRow(data, fallback); };
const updateExistingByPrimaryKey = async ({ table, payload, idField }) => { const id = payload?.[idField]; if (!id) return payload; const { data, error } = await supabase.from(table).update(payload).eq(idField, id).select('*').limit(1); if (error) { if (isSingleObjectCoercionError(error)) return selectExistingByPrimaryKey({ table, id, idField, fallback: payload }); throw error; } return firstRow(data, payload); };
const executeMutation = async ({ table, action, payload, id, idField }) => action === 'insert' ? supabase.from(table).insert(payload).select('*').limit(1) : supabase.from(table).update(payload).eq(idField, id).select('*').limit(1);
const runMutationWithSchemaRetry = async ({ table, action, payload, id, idField }) => {
  let nextPayload = toDbPayload(action === 'insert' ? withFarmId(table, payload) : payload, table);
  const removedColumns = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { data, error } = await executeMutation({ table, action, payload: nextPayload, id, idField });
    if (!error) return firstRow(data, nextPayload);
    if (isSingleObjectCoercionError(error)) return selectExistingByPrimaryKey({ table, id: id || nextPayload?.[idField], idField, fallback: nextPayload });
    if (action === 'insert' && isDuplicateKeyError(error) && nextPayload?.[idField]) return updateExistingByPrimaryKey({ table, payload: nextPayload, idField });
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
const currentUserId = async () => { try { const { data } = await supabase.auth.getUser(); return data?.user?.id || data?.user?.email || 'system'; } catch { return 'system'; } };
const findMatchingOpportunity = async (payload = {}) => {
  const sourceId = payload.source_id || payload.entity_id || payload.related_id;
  if (payload.opportunity_id || !sourceId) return null;
  try {
    const { data, error } = await supabase.from('sales_opportunities').select('*').eq('source_id', sourceId).limit(10);
    if (error) return null;
    const sourceType = norm(payload.source_type || payload.type_vente || '');
    return (data || []).find((opp) => {
      const oppType = norm(opp.source_type || opp.type_source || opp.type || '');
      return !closedOpportunity(opp) && (!sourceType || !oppType || sourceType.includes(oppType) || oppType.includes(sourceType));
    }) || null;
  } catch { return null; }
};
const safePatchOpportunitySchema = async (opportunityId, patch = {}) => {
  if (!opportunityId) return;
  let nextPatch = patch;
  const removed = [];
  for (let i = 0; i < 12; i += 1) {
    if (Object.keys(nextPatch).length === 0) return;
    const { error } = await supabase.from('sales_opportunities').update(nextPatch).eq('id', opportunityId);
    if (!error) return;
    const missing = getMissingSchemaColumn(error);
    if (!missing || removed.includes(missing)) return;
    removed.push(missing);
    nextPatch = withoutColumn(nextPatch, missing);
  }
};
const linkSalesOrderToOpportunity = async (createdOrder = {}, originalPayload = {}) => {
  if (!createdOrder?.id) return createdOrder;
  try {
    const match = originalPayload.opportunity_id ? { id: originalPayload.opportunity_id } : await findMatchingOpportunity({ ...originalPayload, ...createdOrder });
    if (!match?.id) return createdOrder;
    await safePatchOpportunitySchema(match.id, { status: 'converti', statut: 'converti', converted_sale_id: createdOrder.id, converted_at: new Date().toISOString() });
    await supabase.from('business_events').insert(withFarmId('business_events', { id: `EVT-${createdOrder.id}-${match.id}`.slice(0, 80), farm_id: createdOrder.farm_id || originalPayload.farm_id, event_type: 'opportunite_convertie', module_source: 'ventes', entity_type: 'opportunite_vente', entity_id: match.id, title: `Opportunité convertie en commande ${createdOrder.id}`, description: createdOrder.source_label || originalPayload.source_label || 'Opportunité convertie en vente.', amount: Number(createdOrder.montant_total || originalPayload.montant_total || 0), event_date: new Date().toISOString(), linked_sale_id: createdOrder.id, severity: 'info' })).catch(() => {});
    return { ...createdOrder, opportunity_id: createdOrder.opportunity_id || match.id, decision_origin: createdOrder.decision_origin || originalPayload.decision_origin || 'opportunite_vente', attributable_to_decision_center: true };
  } catch { return createdOrder; }
};
const writeDeletedRecord = async ({ table, id }) => {
  writeRealDeletedId(table, id);
};
const trySoftDelete = async ({ table, id, idField }) => {
  const actor = await currentUserId();
  const payload = { is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: actor };
  let nextPayload = payload;
  const removedColumns = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (Object.keys(nextPayload).length === 0) return false;
    const { error } = await supabase.from(table).update(nextPayload).eq(idField, id);
    if (!error) { await writeDeletedRecord({ table, id, idField }); return true; }
    const missingColumn = getMissingSchemaColumn(error);
    if (!missingColumn || removedColumns.includes(missingColumn)) return false;
    removedColumns.push(missingColumn);
    nextPayload = withoutColumn(nextPayload, missingColumn);
  }
  return false;
};

export const createSupabaseCrudService = (table, idField = 'id') => ({
  async getAll() { if (!table) return []; if (isSimulatedDataModeEnabled()) return getSimulatedTableRows(table, idField); const { data, error } = await supabase.from(table).select('*'); if (error) throw error; return filterRealDeletedRows(table, filterSoftDeletedRows(data || []), idField); },
  async create(payload) {
    if (!table) return payload;
    if (isSimulatedDataModeEnabled()) return createSimulatedRow(table, payload, idField);
    const created = await runMutationWithSchemaRetry({ table, action: 'insert', payload, idField });
    if (table === 'sales_orders') return linkSalesOrderToOpportunity(created, payload);
    return created;
  },
  async update(id, payload) { if (!table) return payload; if (isSimulatedDataModeEnabled()) return updateSimulatedRow(table, id, payload, idField); return runMutationWithSchemaRetry({ table, action: 'update', payload, id, idField }); },
  async remove(id) { if (!table) return true; if (isSimulatedDataModeEnabled()) return removeSimulatedRow(table, id, idField); await writeDeletedRecord({ table, id, idField }); const softDeleted = await trySoftDelete({ table, id, idField }); if (softDeleted) return true; const { error } = await supabase.from(table).delete().eq(idField, id); if (error) throw error; return true; },
});
