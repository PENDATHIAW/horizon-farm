import { makeId } from '../utils/ids.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);

export const MOVEMENT_SOURCE_TYPES = {
  PURCHASE_RECEPTION: 'reception_achat',
  MANUAL_ENTRY: 'entree_manuelle',
  MANUAL_EXIT: 'sortie_manuelle',
  SALE: 'vente_commercial',
  FEEDING: 'consommation_elevage',
  HEALTH: 'consommation_sante',
  PACKAGING: 'consommation_emballage',
  CULTURE: 'consommation_cultures',
  LOSS: 'perte',
  CORRECTION: 'correction',
  EXPIRY: 'peremption',
  RETURN: 'retour',
};

function resolveMovementType(patch = {}, delta = 0) {
  const explicit = clean(patch.movement_kind || patch.movement_type_label);
  if (explicit) return explicit;
  const last = clean(patch.last_movement_type);
  if (last.includes('perte')) return MOVEMENT_SOURCE_TYPES.LOSS;
  if (last.includes('correction') || last.includes('ajustement')) return MOVEMENT_SOURCE_TYPES.CORRECTION;
  if (patch.source_module === 'ventes' || patch.created_from === 'sale_side_effects') return MOVEMENT_SOURCE_TYPES.SALE;
  if (patch.source_module === 'sante') return MOVEMENT_SOURCE_TYPES.HEALTH;
  if (patch.source_module === 'alimentation' || patch.source_module === 'elevage') return MOVEMENT_SOURCE_TYPES.FEEDING;
  if (patch.source_module === 'cultures') return MOVEMENT_SOURCE_TYPES.CULTURE;
  if (patch.created_from === 'stock_purchase_workflow') return MOVEMENT_SOURCE_TYPES.PURCHASE_RECEPTION;
  return delta > 0 ? MOVEMENT_SOURCE_TYPES.MANUAL_ENTRY : MOVEMENT_SOURCE_TYPES.MANUAL_EXIT;
}

export function buildMovementDedupeKey({ stockId = '', movementRef = '', type = 'entree', sourceModule = '' } = {}) {
  const ref = clean(movementRef);
  if (ref) return `stock-mvt:${ref}`;
  return `stock-mvt:${type}:${clean(stockId)}:${clean(sourceModule)}:${today()}`;
}

export function buildStockMovementPayload({
  before = {},
  after = {},
  patch = {},
  linkedEventId = '',
  farmId = null,
  movementRef = '',
  dedupeKey = '',
} = {}) {
  const oldQty = n(before.quantite ?? before.quantity ?? before.stock);
  const newQty = n(after.quantite ?? after.quantity ?? after.stock);
  const delta = newQty - oldQty;
  if (!after?.id || Math.abs(delta) <= 0) return null;

  const movementType = patch.last_movement_type || (delta > 0 ? 'entree' : 'sortie');
  const isLoss = String(movementType).includes('perte');
  const type = isLoss ? 'perte' : delta > 0 ? 'entree' : 'sortie';
  const date = String(patch.date || patch.last_movement_date || patch.movement_date || today()).slice(0, 10);
  const resolvedFarm = farmId || after.farm_id || after.farmId || patch.farm_id || null;
  const resolvedRef = clean(movementRef || patch.movement_ref || patch.workflow_id || patch.issue_key);
  const resolvedDedupe = clean(dedupeKey || patch.dedupe_key || buildMovementDedupeKey({
    stockId: after.id,
    movementRef: resolvedRef,
    type,
    sourceModule: patch.source_module || after.source_module,
  }));

  const baseMetadata = {
    movement_kind: resolveMovementType(patch, delta),
    motif: patch.last_movement_label || patch.notes || '',
    sens: type === 'entree' ? 'entree' : type === 'perte' ? 'ajustement' : 'sortie',
  };
  const extraMetadata = patch.metadata && typeof patch.metadata === 'object' ? patch.metadata : {};

  return {
    id: makeId('STKMVT'),
    stock_id: after.id,
    movement_type: type,
    quantity: Math.abs(delta),
    unit: after.unite || after.unit || '',
    stock_before: oldQty,
    stock_after: newQty,
    stock_delta: delta,
    source_module: patch.source_module || after.source_module || 'stock',
    source_record_id: patch.source_record_id || after.source_record_id || after.linked_event_id || '',
    linked_event_id: linkedEventId || patch.linked_event_id || '',
    notes: patch.last_movement_note || patch.notes || patch.last_movement_label || extraMetadata.motif || '',
    movement_date: date,
    farm_id: resolvedFarm,
    dedupe_key: resolvedDedupe,
    movement_ref: resolvedRef,
    metadata: { ...baseMetadata, ...extraMetadata },
    created_at: new Date().toISOString(),
  };
}

export function listStockMovements(movements = [], stockId = '') {
  const rows = arr(movements);
  if (!stockId) return [...rows].sort((a, b) => String(b.movement_date || b.created_at).localeCompare(String(a.movement_date || a.created_at)));
  return rows
    .filter((row) => String(row.stock_id) === String(stockId))
    .sort((a, b) => String(b.movement_date || b.created_at).localeCompare(String(a.movement_date || a.created_at)));
}

export function summarizeMovements(movements = []) {
  const rows = arr(movements);
  const entrees = rows.filter((r) => r.movement_type === 'entree').length;
  const sorties = rows.filter((r) => r.movement_type === 'sortie').length;
  const pertes = rows.filter((r) => r.movement_type === 'perte').length;
  return { total: rows.length, entrees, sorties, pertes, recent: rows.slice(0, 12) };
}

export function movementAlreadyExists(existingMovements = [], dedupeKey = '', movementId = '') {
  const key = clean(dedupeKey);
  const id = clean(movementId);
  return arr(existingMovements).some((row) => (key && clean(row.dedupe_key) === key) || (id && clean(row.id) === id));
}

export async function persistStockMovement({ before, after, patch, linkedEventId, handlers = {}, farmId, movementRef, dedupeKey, existingMovements = [] } = {}) {
  const payload = buildStockMovementPayload({ before, after, patch, linkedEventId, farmId, movementRef, dedupeKey });
  if (!payload || !handlers.onCreateStockMovement) return null;
  if (movementAlreadyExists(existingMovements, payload.dedupe_key, payload.id)) return null;
  await handlers.onCreateStockMovement(payload);
  await handlers.onRefreshStockMovements?.();
  return payload;
}

/** Mouvement depuis workflow achat (quantités connues avant/après). */
export function buildPurchaseStockMovementPayload({ preview = {}, beforeQty = 0, afterQty = 0, farmId = null, linkedEventId = '' } = {}) {
  const stockPatch = preview.records?.stock_patch || {};
  const movement = preview.records?.movement || {};
  const stockId = stockPatch.id;
  if (!stockId || n(movement.qty) <= 0) return null;
  const dedupeKey = preview.records?.movement_event?.dedupe_key
    || movementDedupeKeyFromPreview(preview);
  return buildStockMovementPayload({
    before: { id: stockId, quantite: beforeQty },
    after: { ...stockPatch, quantite: afterQty, quantity: afterQty },
    patch: {
      last_movement_type: 'entree',
      source_module: 'stock',
      source_record_id: stockId,
      last_movement_label: movement.motif || stockPatch.last_movement_label,
      movement_ref: preview.workflow_id,
      dedupe_key: dedupeKey,
      created_from: 'stock_purchase_workflow',
      date: movement.date,
    },
    linkedEventId,
    farmId: farmId || stockPatch.farm_id,
    movementRef: preview.workflow_id,
    dedupeKey,
  });
}

function movementDedupeKeyFromPreview(preview = {}) {
  return preview.records?.movement_event?.dedupe_key
    || `stock-movement:entree:${clean(preview.records?.stock_patch?.id)}:${clean(preview.workflow_id)}`;
}
