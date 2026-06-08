/**
 * Achats & Stock V2 — pont consommation élevage / cultures → stock_movements.
 */

import { MOVEMENT_SOURCE_TYPES, movementAlreadyExists, persistStockMovement } from '../services/stockMovementHelpers.js';
import { toNumber } from './format.js';

const clean = (value) => String(value || '').trim();
const n = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);

export const CONSUMPTION_SOURCE_MODULES = {
  ELEVAGE: 'elevage',
  ALIMENTATION: 'alimentation',
  CULTURES: 'cultures',
  SANTE: 'sante',
};

export function feedingConsumptionDedupeKey(logId = '', stockId = '') {
  const ref = clean(logId) || clean(stockId);
  return `stock-mvt:feeding:${ref}`;
}

export function cultureConsumptionDedupeKey(cultureId = '', stockId = '', date = '') {
  return `stock-mvt:culture:${clean(cultureId)}:${clean(stockId)}:${clean(date) || today()}`;
}

export function healthConsumptionDedupeKey(healthId = '', stockId = '') {
  return `stock-mvt:sante:${clean(healthId)}:${clean(stockId)}`;
}

export function eggPackagingConsumptionDedupeKey(logId = '', stockId = '') {
  return `stock-mvt:egg-pack:${clean(logId)}:${clean(stockId)}`;
}

export const HEALTH_CONSUMPTION_GAP_MESSAGE = 'Consommation santé non rattachée au stock : stock_id absent.';
export const EGG_PACKAGING_GAP_MESSAGE = 'Pour tracer les emballages, rattacher un article stock emballage à cette production.';

function resolveFeedingSourceModule(log = {}) {
  const module = clean(log.source_module);
  if (module === 'elevage' || module === 'cultures') return module;
  return CONSUMPTION_SOURCE_MODULES.ALIMENTATION;
}

function resolveFeedingMotif(log = {}, stock = {}) {
  const notes = clean(log.notes);
  if (notes) return notes;
  const target = log.lot_id || log.animal_id || log.cible_id || '';
  const product = stock.produit || stock.name || stock.nom || 'aliment';
  if (log.lot_id) return `Alimentation lot ${target} · ${product}`;
  if (log.animal_id) return `Alimentation animal ${target} · ${product}`;
  return `Consommation élevage · ${product}`;
}

/** Payload mouvement depuis log alimentation / élevage. */
export function buildFeedingConsumptionMovementPayload({
  log = {},
  stock = {},
  beforeQty = 0,
  afterQty = 0,
  farmId = null,
} = {}) {
  const stockId = clean(stock.id || log.stock_id);
  const logId = clean(log.id);
  const qtyUsed = n(log.quantite ?? log.quantity);
  if (!stockId || qtyUsed <= 0) return null;

  const sourceModule = resolveFeedingSourceModule(log);
  const movementRef = logId || `feeding:${stockId}:${log.date || today()}`;
  const dedupeKey = feedingConsumptionDedupeKey(logId, stockId);

  return {
    stock_id: stockId,
    movement_type: 'sortie',
    quantity: qtyUsed,
    unit: log.unite || stock.unite || stock.unit || '',
    stock_before: beforeQty,
    stock_after: afterQty,
    stock_delta: afterQty - beforeQty,
    source_module: sourceModule,
    source_record_id: logId || stockId,
    linked_event_id: '',
    notes: resolveFeedingMotif(log, stock),
    movement_date: String(log.date || today()).slice(0, 10),
    farm_id: farmId || stock.farm_id || log.farm_id || null,
    dedupe_key: dedupeKey,
    movement_ref: movementRef,
    metadata: {
      movement_kind: MOVEMENT_SOURCE_TYPES.FEEDING,
      motif: resolveFeedingMotif(log, stock),
      sens: 'sortie',
      consumption_type: log.type_cible || log.categorie || 'alimentation',
      lot_id: log.lot_id || '',
      animal_id: log.animal_id || '',
    },
  };
}

/** Payload mouvement depuis intrant culture. */
export function buildCultureConsumptionMovementPayload({
  culture = {},
  stock = {},
  qty = 0,
  beforeQty = 0,
  afterQty = 0,
  motif = '',
  date = '',
  farmId = null,
} = {}) {
  const stockId = clean(stock.id);
  const cultureId = clean(culture.id);
  const usedQty = n(qty);
  if (!stockId || !cultureId || usedQty <= 0) return null;

  const movementDate = String(date || today()).slice(0, 10);
  const movementRef = `culture:${cultureId}:stock:${stockId}:${movementDate}`;
  const dedupeKey = cultureConsumptionDedupeKey(cultureId, stockId, movementDate);
  const label = stock.produit || stock.name || stock.nom || stockId;
  const resolvedMotif = clean(motif) || `Intrant culture · ${label}`;

  return {
    stock_id: stockId,
    movement_type: 'sortie',
    quantity: usedQty,
    unit: stock.unite || stock.unit || '',
    stock_before: beforeQty,
    stock_after: afterQty,
    stock_delta: afterQty - beforeQty,
    source_module: CONSUMPTION_SOURCE_MODULES.CULTURES,
    source_record_id: cultureId,
    linked_event_id: '',
    notes: resolvedMotif,
    movement_date: movementDate,
    farm_id: farmId || stock.farm_id || culture.farm_id || null,
    dedupe_key: dedupeKey,
    movement_ref: movementRef,
    metadata: {
      movement_kind: MOVEMENT_SOURCE_TYPES.CULTURE,
      motif: resolvedMotif,
      sens: 'sortie',
      culture_id: cultureId,
      culture_label: culture.nom || culture.culture || cultureId,
    },
  };
}

/** Payload mouvement depuis intervention santé (médicament / vaccin stock). */
export function buildHealthConsumptionMovementPayload({
  healthRecord = {},
  stock = {},
  qty = 0,
  beforeQty = 0,
  afterQty = 0,
  farmId = null,
} = {}) {
  const stockId = clean(stock.id || healthRecord.stock_id);
  const healthId = clean(healthRecord.id);
  const usedQty = n(qty);
  if (!stockId || usedQty <= 0) return null;

  const movementRef = healthId || `sante:${stockId}:${healthRecord.date || today()}`;
  const dedupeKey = healthConsumptionDedupeKey(healthId, stockId);
  const motif = clean(healthRecord.nom || healthRecord.medicament) || 'Consommation santé';
  const animalId = clean(healthRecord.animal_id || (healthRecord.module_lie === 'animaux' ? healthRecord.related_id : ''));
  const lotId = clean(healthRecord.lot_id || (healthRecord.module_lie === 'avicole' ? healthRecord.related_id : ''));

  return {
    stock_id: stockId,
    movement_type: 'sortie',
    quantity: usedQty,
    unit: stock.unite || stock.unit || '',
    stock_before: beforeQty,
    stock_after: afterQty,
    stock_delta: afterQty - beforeQty,
    source_module: CONSUMPTION_SOURCE_MODULES.SANTE,
    source_record_id: healthId || stockId,
    linked_event_id: '',
    notes: motif,
    movement_date: String(healthRecord.date || healthRecord.effectuee || healthRecord.prevue || today()).slice(0, 10),
    farm_id: farmId || stock.farm_id || healthRecord.farm_id || null,
    dedupe_key: dedupeKey,
    movement_ref: movementRef,
    metadata: {
      movement_kind: MOVEMENT_SOURCE_TYPES.HEALTH,
      motif,
      sens: 'sortie',
      intervention_type: healthRecord.type_intervention || healthRecord.intervention_family || '',
      animal_id: animalId,
      lot_id: lotId,
    },
  };
}

/** Payload mouvement sortie emballage lié à production_oeufs_logs. */
export function buildEggPackagingConsumptionPayload({
  log = {},
  stock = {},
  qty = 0,
  beforeQty = 0,
  afterQty = 0,
  farmId = null,
} = {}) {
  const stockId = clean(stock.id || log.packaging_stock_id);
  const logId = clean(log.id);
  const usedQty = n(qty);
  if (!stockId || !logId || usedQty <= 0) return null;

  const movementRef = `egg-pack:${logId}:${stockId}`;
  const dedupeKey = eggPackagingConsumptionDedupeKey(logId, stockId);
  const motif = `Emballage production œufs · lot ${clean(log.lot_id) || '—'}`;

  return {
    stock_id: stockId,
    movement_type: 'sortie',
    quantity: usedQty,
    unit: stock.unite || stock.unit || 'u',
    stock_before: beforeQty,
    stock_after: afterQty,
    stock_delta: afterQty - beforeQty,
    source_module: CONSUMPTION_SOURCE_MODULES.ELEVAGE,
    source_record_id: logId,
    linked_event_id: '',
    notes: motif,
    movement_date: String(log.date || today()).slice(0, 10),
    farm_id: farmId || stock.farm_id || log.farm_id || null,
    dedupe_key: dedupeKey,
    movement_ref: movementRef,
    metadata: {
      movement_kind: MOVEMENT_SOURCE_TYPES.PACKAGING,
      motif,
      sens: 'sortie',
      lot_id: clean(log.lot_id),
      production_log_id: logId,
      packaging_type: clean(log.packaging_type) || 'tablette',
    },
  };
}

/** Persiste un mouvement consommation avec idempotence. */
export async function persistConsumptionMovement({
  before = {},
  after = {},
  patch = {},
  payload = null,
  handlers = {},
  existingMovements = [],
} = {}) {
  if (!handlers.onCreateStockMovement) return null;
  if (payload?.dedupe_key && movementAlreadyExists(existingMovements, payload.dedupe_key)) return null;

  const result = await persistStockMovement({
    before,
    after,
    patch: {
      ...patch,
      last_movement_type: 'sortie',
      source_module: patch.source_module || payload?.source_module,
      source_record_id: patch.source_record_id || payload?.source_record_id,
      movement_ref: patch.movement_ref || payload?.movement_ref,
      dedupe_key: patch.dedupe_key || payload?.dedupe_key,
      notes: patch.notes || payload?.notes,
      farm_id: patch.farm_id || payload?.farm_id,
      metadata: payload?.metadata,
    },
    handlers,
    farmId: payload?.farm_id,
    movementRef: payload?.movement_ref,
    dedupeKey: payload?.dedupe_key,
    existingMovements,
  });

  await handlers.onRefreshStockMovements?.();
  return result;
}

/**
 * GAP V2 documenté : emballages œufs consommés via production_oeufs_logs
 * sans stock_id explicite ne sont pas encore branchés automatiquement.
 * Les sorties Hey Horizon directes (StocksV4) créent alimentation_log mais
 * passent par runFeedingSideEffects après ce patch.
 */
export const CONSUMPTION_GAPS = [
  {
    id: 'health_without_stock_id',
    module: 'sante',
    description: HEALTH_CONSUMPTION_GAP_MESSAGE,
    status: 'documented',
  },
  {
    id: 'egg_packaging_without_stock',
    module: 'elevage',
    description: EGG_PACKAGING_GAP_MESSAGE,
    status: 'partial',
    note: 'Branché si packaging_stock_id renseigné sur production_oeufs_logs',
  },
  {
    id: 'hey_horizon_direct_exit',
    module: 'stock',
    description: 'Sorties Hey Horizon sans log alimentation — mouvement via StocksV5 guardedUpdate uniquement',
    status: 'partial',
  },
];
