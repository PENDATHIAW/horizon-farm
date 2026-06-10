import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import { financeIds } from './sideEffectIds';
import { applyStockMovement } from './stockWorkflows';
import { attachIdempotency, buildIdempotencyKey, findByRecordId, WORKFLOW_TYPES } from './workflowDedupe';
import { toNumber } from './format';
import {
  buildFeedingConsumptionMovementPayload,
  persistConsumptionMovement,
} from './stockConsumptionBridge.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

export function buildFeedingFinanceRow({ log = {}, amount = 0, date = '' } = {}) {
  const value = num(amount);
  const logId = clean(log.id);
  if (value <= 0 || !logId) return null;
  const target = log.lot_id || log.animal_id || log.cible_id || log.stock_id || '';
  return {
    id: financeIds.feeding(logId),
    type: 'sortie',
    libelle: `Alimentation ${target || log.categorie || 'élevage'}`,
    montant: value,
    amount: value,
    date: date || log.date || today(),
    categorie: 'Alimentation',
    activite: log.lot_id ? 'avicole' : 'animaux',
    module_lie: 'alimentation',
    related_id: target || log.stock_id || '',
    source_module: 'alimentation',
    source_record_id: logId,
    stock_id: log.stock_id || '',
    statut: 'paye',
    side_effects_managed: true,
    created_from: 'feeding_side_effects',
  };
}

export async function runFeedingSideEffects({
  log = {},
  stock = {},
  stockMovement = null,
  amount = 0,
  transactions = [],
  businessEvents = [],
  existingLogs = [],
  handlers = {},
  skipFinance = false,
} = {}) {
  const logId = clean(log.id);
  if (log?.id) {
    const existingLog = findByRecordId(existingLogs, logId);
    if (!existingLog) {
      await handlers.onCreateAlimentation?.(attachIdempotency({
        ...log,
        side_effects_managed: true,
        created_from: log.created_from || 'feeding_side_effects',
      }, buildIdempotencyKey({
        workflowType: WORKFLOW_TYPES.FEEDING,
        sourceModule: 'alimentation',
        sourceRecordId: logId,
      }), { workflowType: WORKFLOW_TYPES.FEEDING, sourceModule: 'alimentation', sourceRecordId: logId }));
    }
  }

  const qtyUsed = num(stockMovement?.qty ?? log.quantite);
  const beforeQty = num(stock.quantite ?? stock.quantity ?? stock.stock);
  let afterQty = beforeQty;

  if (stockMovement && handlers.onUpdateStockMovement) {
    await handlers.onUpdateStockMovement(stockMovement);
    afterQty = Math.max(0, beforeQty - qtyUsed);
  } else if (stock?.id && qtyUsed > 0) {
    const movementRef = clean(log.id || stockMovement?.ref || log.date || today());
    const movement = applyStockMovement(stock, {
      type: 'sortie',
      qty: qtyUsed,
      motif: log.notes || 'Alimentation',
      date: log.date || today(),
      movementRef,
      idempotencyKey: buildIdempotencyKey({
        workflowType: WORKFLOW_TYPES.STOCK_EXIT,
        sourceModule: 'alimentation',
        sourceRecordId: logId || stock.id,
        movementRef,
      }),
    });
    afterQty = num(movement.stock?.quantite ?? movement.stock?.quantity ?? (beforeQty - qtyUsed));
    await handlers.onUpdateStock?.(stock.id, movement.stock);
    if (handlers.onCreateBusinessEvent && movement.event) {
      const eventExists = arr(businessEvents).some((row) => clean(row.id) === clean(movement.event.id));
      if (!eventExists) await handlers.onCreateBusinessEvent(movement.event);
    }
  }

  if (stock?.id && qtyUsed > 0 && handlers.onCreateStockMovement) {
    const consumptionPayload = buildFeedingConsumptionMovementPayload({
      log,
      stock: { ...stock, quantite: afterQty, quantity: afterQty },
      beforeQty,
      afterQty,
      farmId: stock.farm_id || log.farm_id,
    });
    if (consumptionPayload) {
      await persistConsumptionMovement({
        before: { id: stock.id, quantite: beforeQty },
        after: { id: stock.id, quantite: afterQty, unite: stock.unite || stock.unit, farm_id: consumptionPayload.farm_id },
        patch: {
          source_module: consumptionPayload.source_module,
          source_record_id: consumptionPayload.source_record_id,
          movement_ref: consumptionPayload.movement_ref,
          dedupe_key: consumptionPayload.dedupe_key,
          notes: consumptionPayload.notes,
        },
        payload: consumptionPayload,
        handlers,
        existingMovements: handlers.existingStockMovements || [],
      });
    }
  }

  const financeAmount = num(amount || log.montant_total);
  if (!skipFinance && financeAmount > 0) {
    const financeRow = buildFeedingFinanceRow({ log, stock, amount: financeAmount, date: log.date });
    if (financeRow) {
      const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
      if (!exists) await handlers.onCreateFinanceTransaction?.(financeRow);
      await syncFinanceSideEffects(exists || financeRow, { handlers });
    }
  }

  return { logId: log.id, amount: financeAmount };
}
