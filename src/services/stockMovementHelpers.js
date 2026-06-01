import { makeId } from '../utils/ids.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);

export function buildStockMovementPayload({ before = {}, after = {}, patch = {}, linkedEventId = '' } = {}) {
  const oldQty = n(before.quantite ?? before.quantity ?? before.stock);
  const newQty = n(after.quantite ?? after.quantity ?? after.stock);
  const delta = newQty - oldQty;
  if (!after?.id || Math.abs(delta) <= 0) return null;

  const movementType = patch.last_movement_type || (delta > 0 ? 'entree' : 'sortie');
  const isLoss = String(movementType).includes('perte');
  const type = isLoss ? 'perte' : delta > 0 ? 'entree' : 'sortie';
  const date = String(patch.date || patch.last_movement_date || today()).slice(0, 10);

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
    notes: patch.last_movement_note || patch.notes || '',
    movement_date: date,
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

export async function persistStockMovement({ before, after, patch, linkedEventId, handlers = {} } = {}) {
  const payload = buildStockMovementPayload({ before, after, patch, linkedEventId });
  if (!payload || !handlers.onCreateStockMovement) return null;
  await handlers.onCreateStockMovement(payload);
  await handlers.onRefreshStockMovements?.();
  return payload;
}
