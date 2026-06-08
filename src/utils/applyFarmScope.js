import { getFarmActivityNotice, getFarmActivityNoticeDetail } from '../config/farmActivities.js';
import {
  filterRowsByFarmScope,
  formatFarmScopeLabel,
  isAllFarmsScope,
  isFarmScopeFilteringEnabled,
  isRowInFarmScope,
  normalizeFarmScope,
  rowFarmId,
} from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);

/** Clés dataMap P0 directes. */
export const FARM_FILTER_DATA_MAP_KEYS = new Set([
  'animaux',
  'avicole',
  'stock',
  'sales_orders',
  'finances',
  'cultures',
  'business_events',
]);

/** Modules critiques Phase 3. */
export const FARM_CRITICAL_MODULE_IDS = new Set([
  'dashboard',
  'finance_pilotage',
  'achats_stock',
  'elevage',
  'cultures',
  'commercial',
]);

/** Props filtrées directement par farm_id. */
export const FARM_DIRECT_PROP_KEYS = new Set([
  'rows',
  'animaux',
  'lots',
  'avicole',
  'stocks',
  'stock',
  'salesOrders',
  'sales_orders',
  'transactions',
  'transactionsAll',
  'finances',
  'cultures',
  'businessEvents',
  'business_events',
  'investissements',
]);

/** Props liées aux commandes (filtrées via sales_orders). */
export const FARM_ORDER_LINKED_PROP_KEYS = new Set([
  'payments',
  'paymentsAll',
  'orderItems',
  'invoices',
  'invoicesList',
  'deliveries',
  'deliveriesList',
]);

/** Props liées aux lots avicoles. */
export const FARM_LOT_LINKED_PROP_KEYS = new Set([
  'alimentationLogs',
  'alimentation_logs',
  'productionLogs',
  'production_oeufs_logs',
]);

/** Props liées aux animaux (santé). */
export const FARM_ANIMAL_LINKED_PROP_KEYS = new Set([
  'sante',
  'vaccins',
]);

export const FARM_FILTER_PROP_KEYS = new Set([
  ...FARM_DIRECT_PROP_KEYS,
  ...FARM_ORDER_LINKED_PROP_KEYS,
  ...FARM_LOT_LINKED_PROP_KEYS,
  ...FARM_ANIMAL_LINKED_PROP_KEYS,
]);

function shouldApplyFilter(scope = {}, options = {}) {
  if (isAllFarmsScope(scope)) return false;
  return isFarmScopeFilteringEnabled(options);
}

function buildLotFarmIndex(lots = []) {
  const map = new Map();
  arr(lots).forEach((lot) => {
    map.set(String(lot.id), rowFarmId(lot));
  });
  return map;
}

function buildAnimalFarmIndex(animals = []) {
  const map = new Map();
  arr(animals).forEach((animal) => {
    map.set(String(animal.id), rowFarmId(animal));
  });
  return map;
}

function filterRowByParentFarm(row = {}, parentFarmId, scope, accessibleFarms) {
  const ownFarm = rowFarmId(row);
  if (ownFarm) return isRowInFarmScope(row, scope, accessibleFarms);
  if (!parentFarmId) return true;
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (normalized.mode === 'all') return true;
  return parentFarmId === normalized.farmId;
}

export function filterPaymentsByFarmScope(payments = [], salesOrders = [], scope = {}, accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const allowedOrderIds = new Set(
    filterRowsByFarmScope(salesOrders, normalized, accessibleFarms).map((order) => String(order.id)),
  );
  return arr(payments).filter((payment) => {
    const ownFarm = rowFarmId(payment);
    if (ownFarm) return isRowInFarmScope(payment, normalized, accessibleFarms);
    const orderId = String(payment.order_id || payment.sale_order_id || payment.linked_sale_id || '');
    if (orderId) return allowedOrderIds.has(orderId);
    return true;
  });
}

export function filterOrderLinkedRows(rows = [], salesOrders = [], scope = {}, accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const allowedOrderIds = new Set(
    filterRowsByFarmScope(salesOrders, normalized, accessibleFarms).map((order) => String(order.id)),
  );
  return arr(rows).filter((row) => {
    const ownFarm = rowFarmId(row);
    if (ownFarm) return isRowInFarmScope(row, normalized, accessibleFarms);
    const orderId = String(row.order_id || row.sale_order_id || row.linked_sale_id || '');
    if (!orderId) return true;
    return allowedOrderIds.has(orderId);
  });
}

export function filterLotLinkedRows(rows = [], lots = [], scope = {}, accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const lotFarmById = buildLotFarmIndex(lots);
  return arr(rows).filter((row) => {
    const ownFarm = rowFarmId(row);
    if (ownFarm) return isRowInFarmScope(row, normalized, accessibleFarms);
    const lotId = String(row.lot_id || row.cible_id || '');
    if (!lotId) return true;
    const parentFarm = lotFarmById.get(lotId);
    if (!parentFarm) return false;
    return filterRowByParentFarm(row, parentFarm, normalized, accessibleFarms);
  });
}

export function filterAnimalLinkedRows(rows = [], animals = [], scope = {}, accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const animalFarmById = buildAnimalFarmIndex(animals);
  return arr(rows).filter((row) => {
    const ownFarm = rowFarmId(row);
    if (ownFarm) return isRowInFarmScope(row, normalized, accessibleFarms);
    const animalId = String(row.animal_id || row.animal || row.cible_id || '');
    if (!animalId) return true;
    const parentFarm = animalFarmById.get(animalId);
    if (!parentFarm) return false;
    return filterRowByParentFarm(row, parentFarm, normalized, accessibleFarms);
  });
}

function filterInvestissements(rows = [], scope = {}, accessibleFarms = []) {
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  return arr(rows).filter((row) => {
    const farmId = rowFarmId(row);
    if (!farmId) return true;
    return isRowInFarmScope(row, normalized, accessibleFarms);
  });
}

function applyFilteringToProps(props = {}, scope = {}, options = {}) {
  const accessibleFarms = options.accessibleFarms || [];
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const next = { ...props };

  const salesOrdersSource = arr(next.salesOrders?.length ? next.salesOrders : next.sales_orders);
  const filteredOrders = filterRowsByFarmScope(salesOrdersSource, normalized, accessibleFarms);
  if ('salesOrders' in next) next.salesOrders = filteredOrders;
  if ('sales_orders' in next) next.sales_orders = filteredOrders;
  if ('salesOrdersAll' in next) next.salesOrdersAll = filteredOrders;

  const animauxSource = arr(next.animaux?.length ? next.animaux : next.animals);
  const filteredAnimaux = filterRowsByFarmScope(animauxSource, normalized, accessibleFarms);
  if ('animaux' in next) next.animaux = filteredAnimaux;
  if ('animals' in next) next.animals = filteredAnimaux;

  const lotsSource = arr(next.lots?.length ? next.lots : next.avicole);
  const filteredLots = filterRowsByFarmScope(lotsSource, normalized, accessibleFarms);
  if ('lots' in next) next.lots = filteredLots;
  if ('avicole' in next) next.avicole = filteredLots;
  if ('lotsData' in next) next.lotsData = filteredLots;

  FARM_DIRECT_PROP_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) return;
    if (key === 'investissements') {
      next[key] = filterInvestissements(next[key], normalized, accessibleFarms);
      return;
    }
    if (['salesOrders', 'sales_orders', 'salesOrdersAll', 'animaux', 'animals', 'lots', 'avicole', 'lotsData'].includes(key)) {
      return;
    }
    next[key] = filterRowsByFarmScope(next[key], normalized, accessibleFarms);
  });

  FARM_ORDER_LINKED_PROP_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) return;
    if (key === 'payments' || key === 'paymentsAll') {
      next[key] = filterPaymentsByFarmScope(next[key], filteredOrders, normalized, accessibleFarms);
      return;
    }
    next[key] = filterOrderLinkedRows(next[key], filteredOrders, normalized, accessibleFarms);
  });

  FARM_LOT_LINKED_PROP_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) return;
    next[key] = filterLotLinkedRows(next[key], filteredLots, normalized, accessibleFarms);
  });

  FARM_ANIMAL_LINKED_PROP_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) return;
    next[key] = filterAnimalLinkedRows(next[key], filteredAnimaux, normalized, accessibleFarms);
  });

  if (next.dataMap && typeof next.dataMap === 'object') {
    next.dataMap = applyFarmScopeToDataMap(next.dataMap, normalized, options);
  }

  return next;
}

export function applyFarmScopeToProps(props = {}, scope = {}, options = {}) {
  const accessibleFarms = options.accessibleFarms || [];
  const activeFarm = options.activeFarm || null;
  const moduleId = options.moduleId || props.moduleId || null;
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  const filtering = shouldApplyFilter(normalized, options);

  const base = {
    ...props,
    farmScope: normalized,
    farmScopeLabel: formatFarmScopeLabel(normalized, accessibleFarms),
    farmFiltered: filtering,
    activeFarm,
    accessibleFarms,
    farmActivityNotice: getFarmActivityNotice(moduleId, activeFarm, filtering),
    farmActivityNoticeDetail: getFarmActivityNoticeDetail(moduleId, activeFarm, filtering),
  };

  if (!filtering) return base;
  return applyFilteringToProps(base, normalized, options);
}

export function applyFarmScopeToDataMap(dataMap = {}, scope = {}, options = {}) {
  const accessibleFarms = options.accessibleFarms || [];
  const normalized = normalizeFarmScope(scope, accessibleFarms);
  if (!shouldApplyFilter(normalized, options)) {
    return { ...dataMap, farmScope: normalized, farmFiltered: false };
  }

  const next = { ...dataMap, farmScope: normalized, farmFiltered: true };
  const filteredOrders = filterRowsByFarmScope(next.sales_orders, normalized, accessibleFarms);
  const filteredAnimaux = filterRowsByFarmScope(next.animaux, normalized, accessibleFarms);
  const filteredLots = filterRowsByFarmScope(next.avicole, normalized, accessibleFarms);

  FARM_FILTER_DATA_MAP_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) return;
    if (key === 'sales_orders') {
      next[key] = filteredOrders;
      return;
    }
    next[key] = filterRowsByFarmScope(next[key], normalized, accessibleFarms);
  });

  if (Array.isArray(next.payments)) {
    next.payments = filterPaymentsByFarmScope(next.payments, filteredOrders, normalized, accessibleFarms);
  }
  if (Array.isArray(next.alimentation_logs)) {
    next.alimentation_logs = filterLotLinkedRows(next.alimentation_logs, filteredLots, normalized, accessibleFarms);
  }
  if (Array.isArray(next.production_oeufs_logs)) {
    next.production_oeufs_logs = filterLotLinkedRows(next.production_oeufs_logs, filteredLots, normalized, accessibleFarms);
  }
  if (Array.isArray(next.sante)) {
    next.sante = filterAnimalLinkedRows(next.sante, filteredAnimaux, normalized, accessibleFarms);
  }

  return next;
}
