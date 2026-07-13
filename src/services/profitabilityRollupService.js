import { toNumber } from '../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => toNumber(value);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const label = (row = {}) => row.name || row.nom || row.title || row.id || '-';

function linkedId(row = {}) {
  return clean(row.lot_id || row.avicole_id || row.animal_id || row.source_id || row.related_id || row.entity_id);
}

function feedCostForTarget(feedLogs = [], targetId = '') {
  const id = clean(targetId);
  if (!id) return 0;
  return arr(feedLogs)
    .filter((row) => linkedId(row) === id || clean(row.lot_id) === id || clean(row.animal_id) === id)
    .reduce((sum, row) => sum + n(row.cout_total ?? row.cost ?? row.montant), 0);
}

function healthCostForTarget(healthLogs = [], targetId = '') {
  const id = clean(targetId);
  if (!id) return 0;
  return arr(healthLogs)
    .filter((row) => linkedId(row) === id || clean(row.animal_id) === id || clean(row.lot_id) === id)
    .reduce((sum, row) => sum + n(row.cout ?? row.cost ?? row.montant ?? row.prix), 0);
}

function revenueForLot(salesOrders = [], lotId = '') {
  const id = clean(lotId);
  return arr(salesOrders)
    .filter((order) => clean(order.source_id || order.product_id || order.lot_id) === id)
    .reduce((sum, order) => sum + n(order.montant_total ?? order.total ?? order.amount), 0);
}

function revenueForAnimal(salesOrders = [], animalId = '') {
  const id = clean(animalId);
  return arr(salesOrders)
    .filter((order) => clean(order.source_id || order.product_id || order.animal_id) === id)
    .reduce((sum, order) => sum + n(order.montant_total ?? order.total ?? order.amount), 0);
}

export function rollupLotCosts(lot = {}, context = {}) {
  const feedLogs = arr(context.alimentationLogs || context.alimentation_logs);
  const healthLogs = arr(context.vaccins || context.sante || context.healthLogs);
  const salesOrders = arr(context.salesOrders || context.sales_orders);
  const lotId = lot.id || '';

  const feedCost = n(lot.cout_aliment ?? lot.feed_cost) || feedCostForTarget(feedLogs, lotId);
  const vaccineCost = n(lot.cout_vaccins ?? lot.vaccine_cost) || healthCostForTarget(healthLogs, lotId);
  const chickCost = n(lot.cout_poussins ?? lot.chick_cost);
  const energyCost = n(lot.cout_energie ?? lot.energy_cost);
  const transportCost = n(lot.cout_transport ?? lot.transport_cost);
  const revenue = n(lot.revenu ?? lot.revenue ?? lot.ca ?? lot.montant_vente) || revenueForLot(salesOrders, lotId);
  const cost = chickCost + feedCost + vaccineCost + energyCost + transportCost;
  const missing = [];
  if (!chickCost) missing.push('poussins');
  if (!feedCost) missing.push('alimentation');
  if (!vaccineCost) missing.push('vaccins');

  return {
    id: lotId,
    name: label(lot),
    feedCost,
    vaccineCost,
    chickCost,
    energyCost,
    transportCost,
    cost,
    revenue,
    margin: revenue - cost,
    reliable: missing.length < 2 && (cost > 0 || revenue > 0),
    missing,
    sources: {
      feedFromLogs: feedCostForTarget(feedLogs, lotId),
      healthFromLogs: healthCostForTarget(healthLogs, lotId),
      revenueFromSales: revenueForLot(salesOrders, lotId),
    },
  };
}

export function rollupAnimalCosts(animal = {}, context = {}) {
  const feedLogs = arr(context.alimentationLogs || context.alimentation_logs);
  const healthLogs = arr(context.vaccins || context.sante || context.healthLogs);
  const salesOrders = arr(context.salesOrders || context.sales_orders);
  const animalId = animal.id || '';

  const purchaseCost = n(animal.cout_achat ?? animal.purchase_cost);
  const feedCost = n(animal.cout_alimentation ?? animal.feed_cost) || feedCostForTarget(feedLogs, animalId);
  const healthCost = n(animal.cout_sante ?? animal.health_cost) || healthCostForTarget(healthLogs, animalId);
  const transportCost = n(animal.cout_transport ?? animal.transport_cost);
  const revenue = n(animal.prix_vente ?? animal.sale_price ?? animal.revenu) || revenueForAnimal(salesOrders, animalId);
  const cost = purchaseCost + feedCost + healthCost + transportCost;
  const missing = [];
  if (!purchaseCost) missing.push('achat');
  if (!feedCost) missing.push('alimentation');
  if (!healthCost) missing.push('santé');

  return {
    id: animalId,
    name: label(animal),
    purchaseCost,
    feedCost,
    healthCost,
    transportCost,
    cost,
    revenue,
    margin: revenue - cost,
    reliable: missing.length < 2 && (cost > 0 || revenue > 0),
    missing,
    sources: {
      feedFromLogs: feedCostForTarget(feedLogs, animalId),
      healthFromLogs: healthCostForTarget(healthLogs, animalId),
      revenueFromSales: revenueForAnimal(salesOrders, animalId),
    },
  };
}

export function buildProfitabilitySnapshot(context = {}) {
  const lots = arr(context.lots || context.avicole).map((lot) => rollupLotCosts(lot, context));
  const animals = arr(context.animaux).map((animal) => rollupAnimalCosts(animal, context));
  const reliable = [...lots, ...animals].filter((row) => row.reliable);
  const unreliable = [...lots, ...animals].filter((row) => !row.reliable);
  const totalMargin = reliable.reduce((sum, row) => sum + n(row.margin), 0);
  return {
    lots,
    animals,
    reliable,
    unreliable,
    totalMargin,
    reliableCount: reliable.length,
    unreliableCount: unreliable.length,
  };
}
