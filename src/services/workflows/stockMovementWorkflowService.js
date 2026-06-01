/** Mouvement stock officiel — source_module + source_record_id obligatoires. */
export function buildStockMovementPayload({
  stockRow = {},
  quantity = 0,
  movementType = 'sortie',
  sourceModule = 'achats_stock',
  sourceRecordId = '',
  reason = '',
} = {}) {
  return {
    stock_id: stockRow.id,
    product_name: stockRow.nom || stockRow.name || stockRow.produit,
    quantity: Math.abs(Number(quantity || 0)),
    movement_type: movementType,
    source_module: sourceModule,
    source_record_id: sourceRecordId,
    reason,
    origin_type: sourceRecordId ? 'workflow' : 'manual',
  };
}
