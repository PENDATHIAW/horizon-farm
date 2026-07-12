import { makeId } from './ids.js';

const clean = (value = '') => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const arr = (value) => (Array.isArray(value) ? value : []);

export const DAILY_ENTRY_TYPES = Object.freeze({
  FEEDING: 'feeding',
  EGGS: 'egg_production',
  MORTALITY: 'mortality',
  WEIGHING: 'weighing',
  IRRIGATION: 'irrigation',
  HARVEST: 'harvest',
  SALE: 'sale',
});

export const DAILY_ENTRY_CONTRACTS = Object.freeze({
  [DAILY_ENTRY_TYPES.FEEDING]: Object.freeze({ requiredFields: ['stock_id', 'target_id', 'quantite'], maxInteractions: 4, defaultUnit: 'kg' }),
  [DAILY_ENTRY_TYPES.EGGS]: Object.freeze({ requiredFields: ['lot_id', 'oeufs_produits'], maxInteractions: 3, defaultUnit: 'oeuf' }),
  [DAILY_ENTRY_TYPES.MORTALITY]: Object.freeze({ requiredFields: ['target_id', 'quantite'], maxInteractions: 3, defaultUnit: 'tete' }),
  [DAILY_ENTRY_TYPES.WEIGHING]: Object.freeze({ requiredFields: ['target_id', 'poids'], maxInteractions: 3, defaultUnit: 'kg' }),
  [DAILY_ENTRY_TYPES.IRRIGATION]: Object.freeze({ requiredFields: ['culture_id', 'volume_litres'], maxInteractions: 3, defaultUnit: 'L' }),
  [DAILY_ENTRY_TYPES.HARVEST]: Object.freeze({ requiredFields: ['culture_id', 'quantite_recoltee'], maxInteractions: 3, defaultUnit: 'kg' }),
  [DAILY_ENTRY_TYPES.SALE]: Object.freeze({ requiredFields: ['client_id', 'source_id', 'quantity', 'unit_price'], maxInteractions: 5, defaultUnit: 'unite' }),
});

export function connectedUserId(user = {}) {
  return clean(user.id || user.user_id || user.email || user.user_metadata?.email || 'system');
}

export function uniqueRowId(rows = []) {
  const values = arr(rows).filter((row) => row?.id);
  return values.length === 1 ? clean(values[0].id) : '';
}

function stableHash(value = '') {
  let first = 2166136261;
  let second = 2246822519;
  for (const char of String(value)) {
    const code = char.charCodeAt(0);
    first ^= code;
    first = Math.imul(first, 16777619);
    second ^= code + 0x9e3779b9;
    second = Math.imul(second, 3266489917);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`.toUpperCase();
}

export function buildDailyEntryEventKey({
  type,
  farmId,
  recordId,
  date = today(),
  entryId,
} = {}) {
  const token = clean(entryId) || makeId('ENTRY');
  return ['daily', clean(type) || 'entry', clean(farmId) || 'farm', clean(recordId) || 'record', clean(date) || today(), token].join(':');
}

export function dailyEntryRecordId(prefix = 'REC', identity = {}) {
  const eventKey = clean(identity.eventKey || identity.event_key || identity);
  return `${prefix}-${stableHash(eventKey)}`;
}

export function resolveDailyEntryIdentity(type, form = {}, context = {}) {
  const date = clean(form.date || form.event_date || context.date) || today();
  const entryId = clean(form.entry_id || form.entryId || context.entryId) || makeId('ENTRY');
  const recordId = clean(context.recordId || form.lot_id || form.animal_id || form.culture_id || form.source_id || form.stock_id);
  const farmId = clean(form.farm_id || context.farmId || context.activeFarm?.id);
  const eventKey = clean(form.event_key) || buildDailyEntryEventKey({ type, farmId, recordId, date, entryId });
  return Object.freeze({ type, date, entryId, recordId, farmId, eventKey, eventId: dailyEntryRecordId('EVT-Q', eventKey) });
}

export function attachDailyEntryMeta(payload = {}, identity = {}, actorId = '') {
  const eventKey = clean(identity.eventKey || identity.event_key);
  return {
    ...payload,
    entry_id: payload.entry_id || identity.entryId,
    event_key: payload.event_key || eventKey,
    idempotency_key: payload.idempotency_key || eventKey,
    recorded_by: payload.recorded_by || clean(actorId) || 'system',
    farm_id: payload.farm_id || identity.farmId || undefined,
  };
}

export function findDailyEntryReplay(rows = [], eventKey = '') {
  const key = clean(eventKey);
  if (!key) return null;
  return arr(rows).find((row) => clean(row.event_key || row.idempotency_key) === key) || null;
}

export function dailyEntryConfirmation(type, result = {}) {
  if (result.replayed) return 'Saisie déjà enregistrée · aucun doublon créé.';
  if (type === DAILY_ENTRY_TYPES.FEEDING) return `Distribution enregistrée · ${result.qty || 0} ${result.unit || 'kg'} sortis · stock ${result.newStockQty ?? 'mis à jour'} · coût ${result.amount || 0} FCFA.`;
  if (type === DAILY_ENTRY_TYPES.EGGS) return `Ponte enregistrée · ${result.sellable || 0} œuf(s) vendables · ${result.tablet?.tablettes || 0} plateau(x) · taux de ponte mis à jour.`;
  if (type === DAILY_ENTRY_TYPES.MORTALITY) return `Mortalité enregistrée · ${result.qty || 0} sujet(s) · effectif ${result.activeCount ?? 'mis à jour'}.`;
  if (type === DAILY_ENTRY_TYPES.WEIGHING) return `Pesée enregistrée · ${result.weight || 0} ${result.unit || 'kg'} · croissance mise à jour.`;
  if (type === DAILY_ENTRY_TYPES.IRRIGATION) return `Irrigation enregistrée · ${result.volumeLitres || 0} L · coût parcelle mis à jour.`;
  if (type === DAILY_ENTRY_TYPES.HARVEST) return `Récolte enregistrée · ${result.qty || 0} ${result.unit || 'kg'} récoltés · ${result.sellableQty ?? result.qty ?? 0} vendables ajoutés au stock.`;
  if (type === DAILY_ENTRY_TYPES.SALE) return `Vente enregistrée · ${result.paid || 0} FCFA encaissés · ${result.remaining || 0} FCFA à encaisser · source mise à jour.`;
  return 'Saisie enregistrée.';
}

export function validateDailyEntryContracts(contracts = DAILY_ENTRY_CONTRACTS) {
  return Object.entries(contracts).map(([type, contract]) => ({
    type,
    requiredCount: arr(contract.requiredFields).length,
    maxInteractions: Number(contract.maxInteractions || 0),
    valid: arr(contract.requiredFields).length <= 5 && Number(contract.maxInteractions || 0) <= 5,
  }));
}
