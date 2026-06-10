import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import { buildStructuredFarmImpact } from '../services/erpInterconnectionRules';
import { documentIds, eventIds, financeIds } from './sideEffectIds';
import { attachIdempotency, buildIdempotencyKey, findByRecordId, WORKFLOW_TYPES } from './workflowDedupe';
import { toNumber } from './format';
import {
  buildHealthConsumptionMovementPayload,
  HEALTH_CONSUMPTION_GAP_MESSAGE,
  persistConsumptionMovement,
} from './stockConsumptionBridge.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

const openStatus = (row = {}) =>
  !['termine', 'terminé', 'done', 'traitee', 'traitée', 'annule', 'annulé', 'closed', 'resolue', 'résolue'].includes(lower(row.status || row.statut));

export function buildHealthFinanceRow({ health = {}, amount = 0, date = '' } = {}) {
  const value = num(amount);
  const healthId = clean(health.id);
  if (value <= 0 || !healthId) return null;
  return {
    id: financeIds.health(healthId),
    type: 'sortie',
    libelle: `Soin/Vaccin ${health.nom || healthId}`,
    montant: value,
    amount: value,
    date: date || health.date || today(),
    categorie: 'Sante',
    activite: health.lot_id ? 'avicole' : 'animaux',
    module_lie: 'sante',
    related_id: healthId,
    source_module: 'sante',
    source_record_id: healthId,
    statut: 'paye',
    side_effects_managed: true,
    created_from: 'health_side_effects',
    ...buildStructuredFarmImpact({ ...health, cout: value }),
  };
}

export async function runHealthSideEffects({
  health = {},
  healthPatch = {},
  stockMovement = null,
  cost = 0,
  tasks = [],
  transactions = [],
  handlers = {},
} = {}) {
  const merged = { ...health, ...healthPatch };
  const healthId = clean(merged.id);
  if (!healthId) return null;

  const structured = buildStructuredFarmImpact({ ...merged, cout: num(cost || merged.cout) });
  await handlers.onUpdateHealth?.(healthId, {
    ...merged,
    ...structured,
    statut: merged.statut || 'fait',
    effectuee: merged.effectuee || today(),
    side_effects_managed: true,
  });

  if (stockMovement?.stock_id && handlers.onUpdateStockMovement) {
    await handlers.onUpdateStockMovement(stockMovement);
  }

  const financeAmount = num(cost || merged.cout);
  if (financeAmount > 0) {
    const financeRow = buildHealthFinanceRow({ health: merged, amount: financeAmount });
    if (financeRow) {
      const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
      if (!exists) await handlers.onCreateFinanceTransaction?.(financeRow);
      await syncFinanceSideEffects(exists || financeRow, { handlers });
    }
  }

  const taskDedupe = `health-followup:${healthId}`;
  const taskExists = arr(tasks).some((row) => openStatus(row) && clean(row.task_dedupe_key) === taskDedupe);
  if (!taskExists && handlers.onCreateTask) {
    await handlers.onCreateTask({
      title: `Suivi santé ${merged.nom || healthId}`,
      module_lie: 'sante',
      related_id: healthId,
      due_date: today(),
      priority: 'normale',
      status: 'a_faire',
      task_dedupe_key: taskDedupe,
      side_effects_managed: true,
    });
  }

  if (handlers.onCreateBusinessEvent) {
    const eventId = eventIds.businessEvent('sante', 'sante', healthId, today());
    if (findByRecordId(handlers.existingBusinessEvents || [], eventId)) return { healthId, cost: financeAmount };
    const idempotencyKey = buildIdempotencyKey({
      workflowType: WORKFLOW_TYPES.HEALTH,
      sourceModule: 'sante',
      sourceRecordId: healthId,
    });
    await handlers.onCreateBusinessEvent(attachIdempotency({
      id: eventId,
      event_type: 'sante',
      module_source: 'sante',
      entity_id: healthId,
      title: `Intervention santé ${merged.nom || healthId}`,
      event_date: today(),
      severity: 'info',
      side_effects_managed: true,
      ...structured,
    }, idempotencyKey, { workflowType: WORKFLOW_TYPES.HEALTH, sourceModule: 'sante', sourceRecordId: healthId }));
  }

  return { healthId, cost: financeAmount };
}

/** Persiste consommation stock santé vers stock_movements (idempotent). */
export async function runHealthStockConsumptionSideEffects({
  healthRecord = {},
  stock = {},
  qty = 0,
  beforeQty = 0,
  afterQty = 0,
  handlers = {},
} = {}) {
  const stockId = clean(stock.id || healthRecord.stock_id);
  const usedQty = num(qty || healthRecord.quantite_utilisee);
  const wantsStock = clean(healthRecord.product_source) === 'stock' || Boolean(stockId);

  if (!stockId || usedQty <= 0) {
    if (wantsStock && usedQty > 0) return { gap: HEALTH_CONSUMPTION_GAP_MESSAGE };
    return null;
  }
  if (!handlers.onCreateStockMovement) return null;

  const payload = buildHealthConsumptionMovementPayload({
    healthRecord,
    stock,
    qty: usedQty,
    beforeQty,
    afterQty,
    farmId: stock.farm_id || healthRecord.farm_id,
  });
  if (!payload) return null;

  await persistConsumptionMovement({
    before: { id: stock.id, quantite: beforeQty },
    after: { id: stock.id, quantite: afterQty, unite: stock.unite || stock.unit, farm_id: payload.farm_id },
    patch: {
      source_module: payload.source_module,
      source_record_id: payload.source_record_id,
      movement_ref: payload.movement_ref,
      dedupe_key: payload.dedupe_key,
      notes: payload.notes,
    },
    payload,
    handlers,
    existingMovements: handlers.existingStockMovements || [],
  });

  return { movement: payload };
}

export async function runBiosecuritySideEffects({
  alert = null,
  task = null,
  stockMovement = null,
  document = null,
  trace = null,
  alertes = [],
  tasks = [],
  handlers = {},
  skipAlert = false,
  skipTask = false,
} = {}) {
  if (alert && !skipAlert) {
    const alertExists = arr(alertes).some((row) => openStatus(row) && clean(row.alert_dedupe_key) === clean(alert.alert_dedupe_key));
    if (!alertExists) await handlers.onCreateAlert?.({ ...alert, side_effects_managed: true });
  }
  if (task && !skipTask) {
    const taskExists = arr(tasks).some((row) => openStatus(row) && clean(row.task_dedupe_key) === clean(task.task_dedupe_key));
    if (!taskExists) await handlers.onCreateTask?.({ ...task, side_effects_managed: true });
  }
  if (stockMovement && handlers.onUpdateStockMovement) await handlers.onUpdateStockMovement(stockMovement);
  if (document && handlers.onCreateDocument) await handlers.onCreateDocument({ ...document, side_effects_managed: true });
  if (trace && handlers.onCreateBusinessEvent && (!skipAlert || !skipTask)) {
    await handlers.onCreateBusinessEvent({ ...trace, side_effects_managed: true });
  }
  return { alert: Boolean(alert), task: Boolean(task) };
}

export function buildHealthProofDocument({ health = {} } = {}) {
  const healthId = clean(health.id);
  if (!healthId) return null;
  return {
    id: documentIds.healthProof(healthId),
    title: `Preuve sanitaire ${health.nom || healthId}`,
    document_category: 'sanitaire',
    module_source: 'sante',
    entity_type: 'sanitary_event',
    entity_id: healthId,
    side_effects_managed: true,
  };
}
