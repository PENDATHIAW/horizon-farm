/**
 * Commercial V2 — préparation future stock_movements (V3).
 * Documente chaque impact stock sans créer encore la table.
 */

const clean = (value) => String(value || '').trim();

/** Plan de mouvement stock futur à partir d'une ligne vente impactée. */
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
        ? 'Impact appliqué — stock_movements à créer en V3'
        : 'Aucun impact stock (service/autre ou non appliqué)',
    };
  }

  return {
    ready: true,
    movement: {
      id: `SM-PLAN-${clean(order.id)}-${clean(orderItem.id)}`,
      type: 'sortie',
      source_module: patchPlan.module || orderItem.source_module,
      source_id: patchPlan.id,
      order_id: order.id,
      order_item_id: orderItem.id,
      quantity: orderItem.quantity,
      unit: orderItem.unit,
      farm_id: order.farm_id || null,
      movement_ref: `sale:${order.id}:line:${orderItem.line_index || orderItem.id}`,
      status: 'planned',
      created_from: 'stock_movement_bridge_v2',
    },
    note: 'Mouvement planifié — en attente implémentation stock_movements V3',
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
