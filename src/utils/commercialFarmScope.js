/**
 * Commercial V1 P0 - farm_id sur ventes et entités liées.
 */

import {
  CREATE_REQUIRES_FARM_ERROR,
  enrichPayloadWithFarmId,
  resolveCreateFarmId,
  validateCreateFarmContext,
} from './farmScopeCreate.js';
import {
  isAllFarmsScope,
  isFarmScopeFilteringEnabled,
  normalizeFarmScope,
  rowFarmId,
} from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();

export const COMMERCIAL_REQUIRES_FARM_MESSAGE = 'Choisissez une ferme active avant d\'enregistrer une vente.';

export function buildCommercialFarmContext(farmScope = {}, accessibleFarms = [], activeFarm = null, options = {}) {
  return {
    scope: normalizeFarmScope(farmScope, accessibleFarms),
    accessibleFarms: arr(accessibleFarms),
    activeFarm,
    filteringEnabled: isFarmScopeFilteringEnabled(options),
  };
}

/** Résout le farm_id pour une nouvelle vente (null si filtre désactivé). */
export function resolveCommercialSaleFarmId(farmContext = {}, explicitFarmId = '') {
  const explicit = clean(explicitFarmId);
  if (explicit) return explicit;
  if (!farmContext.filteringEnabled) return null;
  return resolveCreateFarmId(farmContext.scope, farmContext.accessibleFarms, {});
}

/** Bloque la vente en mode « toutes les fermes » si le filtre multi-fermes est actif. */
export function validateCommercialSaleFarmContext(farmContext = {}, explicitFarmId = '') {
  if (!farmContext.filteringEnabled) {
    return { ok: true, farmId: null };
  }

  const payloadFarmId = clean(explicitFarmId);
  const result = validateCreateFarmContext(
    'sales_orders',
    payloadFarmId ? { farm_id: payloadFarmId } : {},
    farmContext,
  );

  if (!result.ok) {
    return {
      ok: false,
      error: result.error || CREATE_REQUIRES_FARM_ERROR,
      message: COMMERCIAL_REQUIRES_FARM_MESSAGE,
    };
  }

  return { ok: true, farmId: result.farmId || null };
}

export function stampFarmIdOnRow(row = {}, farmId = null) {
  if (!row || farmId == null || farmId === '') return row;
  if (rowFarmId(row)) return row;
  return { ...row, farm_id: farmId };
}

/** Applique farm_id à toutes les entités créées par le workflow vente. */
export function stampFarmIdOnCommercialRecords(records = {}, farmId = null) {
  if (farmId == null || farmId === '') return records;

  const stamp = (row) => (row ? stampFarmIdOnRow(row, farmId) : row);

  return {
    ...records,
    order: stamp(records.order),
    items: arr(records.items).map(stamp),
    delivery: stamp(records.delivery),
    invoice: stamp(records.invoice),
    document: stamp(records.document),
    payment: stamp(records.payment),
    businessEvent: stamp(records.businessEvent),
  };
}

/** farm_id pour un paiement : commande liée > explicite > ferme active. */
export function resolvePaymentFarmId({
  payment = {},
  order = null,
  farmContext = {},
} = {}) {
  const fromPayment = rowFarmId(payment);
  if (fromPayment) return fromPayment;

  const fromOrder = order ? rowFarmId(order) : rowFarmId({ farm_id: payment.order_farm_id });
  if (fromOrder) return fromOrder;

  if (!farmContext.filteringEnabled) return null;

  if (isAllFarmsScope(farmContext.scope) && !clean(payment.order_id || payment.sale_id)) {
    return null;
  }

  return resolveCreateFarmId(farmContext.scope, farmContext.accessibleFarms, payment);
}

export function enrichPaymentWithFarmId(payment = {}, options = {}) {
  const farmId = resolvePaymentFarmId(options);
  if (!farmId) return payment;
  return stampFarmIdOnRow(payment, farmId);
}

export function enrichFinanceWithOrderFarmId(financeRow = {}, order = {}, farmId = null) {
  const resolved = farmId || rowFarmId(order) || rowFarmId(financeRow);
  if (!resolved) return financeRow;
  return stampFarmIdOnRow(financeRow, resolved);
}

export { enrichPayloadWithFarmId, CREATE_REQUIRES_FARM_ERROR };
