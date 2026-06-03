import { toNumber } from './format';
import { makeId } from './ids';
import { eventIds } from './sideEffectIds';
import { attachIdempotency, buildIdempotencyKey, WORKFLOW_TYPES } from './workflowDedupe';

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value) => String(value || '').trim();

export const stockProductName = (row = {}) => row.produit || row.nom || row.name || row.id || 'Produit stock';
export const stockQuantity = (row = {}) => toNumber(row.quantite ?? row.quantity);
export const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold);
export const stockMax = (row = {}) => toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
export const stockUnitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);
export const stockReorderKey = (row = {}) => `stock_reorder:${clean(row.id)}`;

export function isStockCritical(row = {}, quantity = stockQuantity(row)) {
  const threshold = stockThreshold(row);
  return threshold > 0 && toNumber(quantity) <= threshold;
}

export function stockSuggestedOrderQty(row = {}, quantity = stockQuantity(row)) {
  const maxQty = stockMax(row);
  const threshold = stockThreshold(row);
  return maxQty > 0 ? Math.max(0, maxQty - toNumber(quantity)) : Math.max(0, threshold - toNumber(quantity));
}

export function applyStockMovement(row = {}, movement = {}) {
  const type = movement.type || 'sortie';
  const quantity = stockQuantity(row);
  const qty = Math.max(0, toNumber(movement.qty ?? movement.quantity));
  const nextQty = type === 'entree' ? quantity + qty : Math.max(0, quantity - qty);
  const product = stockProductName(row);
  const unit = row.unite || row.unit || '';
  const eventType = type === 'entree' ? 'reception_stock' : type === 'perte' ? 'perte_stock' : 'sortie_stock';
  const value = qty * stockUnitPrice(row);
  const movementRef = clean(movement.movementRef || movement.ref || movement.motif || movement.label || movement.date || today());
  const idempotencyKey = movement.idempotencyKey || buildIdempotencyKey({
    workflowType: type === 'entree' ? WORKFLOW_TYPES.PURCHASE : WORKFLOW_TYPES.STOCK_EXIT,
    sourceModule: 'stock',
    sourceRecordId: row.id,
    targetAction: type,
    movementRef: `${movementRef}:${qty}`,
  });
  const eventId = movement.eventId || eventIds.stockMovement(row.id, `${type}:${movementRef}:${qty}`);
  return {
    stock: {
      ...row,
      quantite: nextQty,
      quantity: nextQty,
      statut: nextQty <= 0 ? 'epuise' : (row.statut || row.stock_status || 'ok'),
      stock_status: nextQty <= 0 ? 'epuise' : (row.stock_status || row.statut || 'ok'),
      last_movement_type: type,
      last_movement_label: movement.motif || movement.label || '',
      last_movement_qty: qty,
      last_movement_ref: movementRef,
    },
    event: attachIdempotency({
      id: eventId,
      event_type: eventType,
      module_source: 'stock',
      entity_type: 'stock',
      entity_id: row.id,
      title: `${type === 'entree' ? 'Réception' : type === 'perte' ? 'Perte' : 'Sortie'} stock ${product}`,
      description: `${qty} ${unit}`.trim(),
      event_date: movement.date || today(),
      severity: type === 'perte' ? 'warning' : 'info',
      quantity: qty,
      amount: value,
      linked_stock_id: row.id,
      event_dedupe_key: idempotencyKey,
    }, idempotencyKey, { workflowType: WORKFLOW_TYPES.STOCK_EXIT, sourceModule: 'stock', sourceRecordId: row.id }),
  };
}

export function buildStockCriticalFollowUp(row = {}, quantity = stockQuantity(row)) {
  if (!isStockCritical(row, quantity)) return null;
  const key = stockReorderKey(row);
  const product = stockProductName(row);
  const qty = stockSuggestedOrderQty(row, quantity);
  const amount = qty * stockUnitPrice(row);
  const unit = row.unite || '';
  const severity = toNumber(quantity) <= 0 ? 'critique' : 'warning';
  const taskId = makeId('TSK');
  return {
    key,
    task: {
      id: taskId,
      title: `Réapprovisionner ${product}`,
      module_lie: 'stock',
      source_module: 'stock',
      source_record_id: row.id,
      related_id: row.id,
      task_dedupe_key: key,
      action_key: key,
      due_date: today(),
      priority: toNumber(quantity) <= 0 ? 'critique' : 'haute',
      status: 'a_faire',
      notes: `Stock actuel ${quantity} ${unit}. Quantité conseillée ${qty} ${unit}. Budget estimé ${amount} FCFA.`,
    },
    alert: {
      id: makeId('ALT'),
      title: `Stock critique: ${product}`,
      message: `${product} est sous le seuil: ${quantity} ${unit} disponible(s).`,
      module_source: 'stock',
      entity_type: 'stock',
      entity_id: row.id,
      severity,
      status: 'nouvelle',
      action_recommandee: 'Créer ou confirmer une commande fournisseur.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'stock_critique_detecte',
      module_source: 'stock',
      entity_type: 'stock',
      entity_id: row.id,
      title: `Stock critique ${product}`,
      description: `${quantity} ${unit} disponible(s), seuil ${stockThreshold(row)}.`,
      event_date: today(),
      severity,
      linked_task_id: taskId,
      saisies_evitees: 2,
    },
  };
}

export function hasOpenStockReorderTask(row = {}, tasks = []) {
  const key = stockReorderKey(row);
  const id = clean(row.id);
  return tasks.some((task) => {
    const status = clean(task.status || task.statut).toLowerCase();
    const closed = ['termine', 'terminé', 'annule', 'annulé', 'done', 'closed'].includes(status);
    if (closed) return false;
    return clean(task.task_dedupe_key || task.alert_dedupe_key || task.action_key) === key
      || (clean(task.source_module) === 'stock' && clean(task.source_record_id || task.related_id) === id);
  });
}
