/**
 * Commercial V3 - pont stock_movements : planifie et matérialise les sorties vente.
 */

const clean = (value) => String(value || '').trim();
const n = (value = 0) => Number(value || 0) || 0;

/** Plan de mouvement stock à partir d'une ligne vente impactée. */
export function planStockMovementFromSaleLine({
  orderItem = {},
  order = {},
  patchPlan = null,
} = {}) {
  if (!patchPlan?.id || !orderItem?.source_impact_applied) {
    return {
      ready: Boolean(patchPlan?.id),
      movement: null,
      note: patchPlan?.id
        ? 'Impact appliqué - mouvement stock enregistrable'
        : 'Aucun impact stock (service/autre ou non appliqué)',
    };
  }

  const movementRef = `sale:${clean(order.id)}:line:${clean(orderItem.id || orderItem.line_index)}`;
  const dedupeKey = `stock-mvt:${movementRef}`;

  return {
    ready: true,
    movement: {
      id: `SM-${clean(order.id)}-${clean(orderItem.id)}`,
      stock_id: patchPlan.module === 'stock' ? patchPlan.id : null,
      movement_type: 'sortie',
      type: 'sortie',
      source_module: patchPlan.module || orderItem.source_module || 'ventes',
      source_record_id: patchPlan.id,
      order_id: order.id,
      order_item_id: orderItem.id,
      quantity: n(orderItem.quantity),
      unit: orderItem.unit,
      farm_id: order.farm_id || null,
      movement_ref: movementRef,
      dedupe_key: dedupeKey,
      notes: `Vente Commercial ${order.id}`,
      metadata: { movement_kind: 'vente_commercial', sens: 'sortie' },
      status: 'ready',
      created_from: 'stock_movement_bridge',
    },
    note: 'Mouvement prêt pour persistance stock_movements',
  };
}

/** Agrège les plans de mouvement pour une commande multi-lignes. */
export function planStockMovementsForOrder({ order = {}, orderItems = [], appliedPatches = [] } = {}) {
  const patchesByItem = new Map();
  appliedPatches.forEach((entry, index) => {
    const itemId = entry.itemId || orderItems[index]?.id;
    if (itemId) patchesByItem.set(String(itemId), entry.patchPlan);
  });

  return orderItems.map((item) => planStockMovementFromSaleLine({
    orderItem: item,
    order,
    patchPlan: patchesByItem.get(String(item.id)) || null,
  }));
}

/** Construit le payload persistable pour stock_movements après vente stock. */
export function buildSaleStockMovementPersistPayload({
  order = {},
  orderItem = {},
  patchPlan = null,
  beforeQty = 0,
  afterQty = 0,
} = {}) {
  const plan = planStockMovementFromSaleLine({ orderItem: { ...orderItem, source_impact_applied: true }, order, patchPlan });
  if (!plan.movement?.stock_id) return null;
  const qty = n(orderItem.quantity);
  return {
    stock_id: plan.movement.stock_id,
    movement_type: 'sortie',
    quantity: qty,
    unit: orderItem.unit || '',
    stock_before: beforeQty,
    stock_after: afterQty,
    stock_delta: afterQty - beforeQty,
    source_module: 'ventes',
    source_record_id: order.id,
    linked_event_id: '',
    notes: plan.movement.notes,
    movement_date: String(order.date || order.created_at || new Date().toISOString()).slice(0, 10),
    farm_id: plan.movement.farm_id,
    dedupe_key: plan.movement.dedupe_key,
    movement_ref: plan.movement.movement_ref,
    metadata: plan.movement.metadata,
  };
}
