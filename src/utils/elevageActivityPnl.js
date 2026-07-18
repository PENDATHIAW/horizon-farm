/**
 * Élevage V3 - P&L par activité (pondeuses, chair, bovins, ovins, caprins, etc.)
 */

import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../services/unifiedCostService.js';
import { fmtCurrency, fmtNumber, fmtPercent } from './format.js';
import { PRODUCTION_FINANCE_LABELS } from './productionFinancialTruth.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

const lotLabel = (row = {}) => lower(`${row.type || ''} ${row.type_lot || ''} ${row.production_type || ''} ${row.name || ''} ${row.nom || ''}`);
const animalLabel = (row = {}) => lower(`${row.type || ''} ${row.espece || ''} ${row.species || ''}`);

export function isPondeuseLot(row = {}) {
  const l = lotLabel(row);
  return l.includes('pondeuse') || l.includes('ponte') || l.includes('oeuf') || l.includes('œuf');
}

export function isChairLot(row = {}) {
  const l = lotLabel(row);
  return l.includes('chair') || l.includes('broiler');
}

export function isBovinAnimal(row = {}) {
  return animalLabel(row).includes('bovin');
}

export function isOvinAnimal(row = {}) {
  const l = animalLabel(row);
  return (l.includes('ovin') && !l.includes('bovin')) || l.includes('mouton');
}

export function isCaprinAnimal(row = {}) {
  return animalLabel(row).includes('caprin') || animalLabel(row).includes('chèvre') || animalLabel(row).includes('chevre');
}

export function revenueOfLot(lot = {}) {
  return n(lot.revenu ?? lot.revenue ?? lot.ca ?? lot.montant_vente ?? lot.prix_vente_reel ?? lot.sale_price ?? lot.prix_vente_prevu);
}

export function revenueOfAnimal(animal = {}) {
  return n(animal.prix_vente_reel ?? animal.sale_price ?? animal.prix_vente ?? animal.revenu);
}

export function mortalityCostOf(row = {}) {
  return n(row.valeur_perte_estimee ?? row.perte_estimee ?? row.montant_sinistre ?? row.pertes_mortalite_estimees);
}

function buildActivityRow({
  id,
  label,
  revenue = 0,
  feedingCost = 0,
  healthCost = 0,
  purchaseCost = 0,
  mortalityCost = 0,
  otherCost = 0,
  missing = [],
  entityCount = 0,
}) {
  const totalCost = feedingCost + healthCost + purchaseCost + mortalityCost + otherCost;
  const grossMargin = revenue > 0 ? revenue - totalCost : null;
  const marginRate = totalCost > 0 && grossMargin != null ? (grossMargin / totalCost) * 100 : null;
  const reliable = totalCost > 0 && missing.length < 2 && (revenue > 0 || entityCount > 0);
  const partial = totalCost > 0 && !reliable;
  let reliabilityLabel = 'Fiable';
  if (!totalCost && !revenue) reliabilityLabel = 'Aucune donnée';
  else if (partial) reliabilityLabel = 'Partielle';
  else if (!reliable) reliabilityLabel = 'Non fiable';

  const reliabilityMessage = partial || !reliable
    ? `${PRODUCTION_FINANCE_LABELS.marginGross} partielle : ${missing.length ? `données manquantes (${missing.join(', ')})` : 'revenus ou coûts incomplets'}.`
    : '';

  return {
    id,
    label,
    revenue,
    feedingCost,
    healthCost,
    purchaseCost,
    mortalityCost,
    otherCost,
    totalCost,
    grossMargin,
    marginRate,
    reliable,
    partial,
    reliabilityLabel,
    reliabilityMessage,
    entityCount,
    missing,
  };
}

function aggregateUnifiedRows(rows = [], computeFn, context = {}) {
  let revenue = 0;
  let feedingCost = 0;
  let healthCost = 0;
  let purchaseCost = 0;
  let mortalityCost = 0;
  let otherCost = 0;
  const missingSet = new Set();

  arr(rows).forEach((row) => {
    const unified = computeFn(row, context);
    revenue += revenueOfLot(row) || revenueOfAnimal(row);
    feedingCost += n(unified.feedingCost ?? unified.feedCostUsed ?? unified.realFeedCost);
    healthCost += n(unified.healthCost);
    purchaseCost += n(unified.purchaseCost);
    otherCost += n(unified.otherCost);
    mortalityCost += mortalityCostOf(row);
    if (!unified.costComplete) {
      if (n(unified.feedingCost) <= 0) missingSet.add('alimentation');
      if (n(unified.healthCost) <= 0) missingSet.add('santé');
      if (n(unified.purchaseCost) <= 0) missingSet.add('achat');
    }
  });

  return {
    revenue,
    feedingCost,
    healthCost,
    purchaseCost,
    mortalityCost,
    otherCost,
    missing: [...missingSet],
    entityCount: rows.length,
  };
}

export function buildElevageActivityPnl({
  lots = [],
  animaux = [],
  feedLogs = [],
  productionLogs = [],
  healthEvents = [],
  businessEvents = [],
  salesOrders = [],
} = {}) {
  const context = {
    alimentationLogs: feedLogs,
    feedLogs,
    productionLogs,
    healthEvents,
    vaccins: healthEvents,
    directCharges: businessEvents,
    businessEvents,
  };

  const pondeuseLots = arr(lots).filter(isPondeuseLot);
  const chairLots = arr(lots).filter(isChairLot);
  const bovins = arr(animaux).filter(isBovinAnimal);
  const ovins = arr(animaux).filter(isOvinAnimal);
  const caprins = arr(animaux).filter(isCaprinAnimal);
  const otherAnimals = arr(animaux).filter((a) => !isBovinAnimal(a) && !isOvinAnimal(a) && !isCaprinAnimal(a));

  const feedTotal = arr(feedLogs).reduce((s, r) => s + n(r.montant_total ?? r.cout_total ?? r.cost ?? r.montant), 0);
  const healthTotal = arr(healthEvents).reduce((s, r) => s + n(r.montant ?? r.cout ?? r.cost ?? r.montant_total), 0);
  const mortalityTotal = [...arr(lots), ...arr(animaux)].reduce((s, r) => s + mortalityCostOf(r), 0)
    + arr(businessEvents).filter((e) => /mort|deces|décès|perte/.test(lower(`${e.event_type} ${e.title}`)))
      .reduce((s, e) => s + n(e.amount ?? e.montant), 0);

  const activities = [
    buildActivityRow({
      id: 'pondeuses',
      label: 'Pondeuses / œufs',
      ...aggregateUnifiedRows(pondeuseLots, (lot, ctx) => calculateUnifiedLotCost({ lot, ...ctx }), context),
    }),
    buildActivityRow({
      id: 'chair',
      label: 'Poulets de chair',
      ...aggregateUnifiedRows(chairLots, (lot, ctx) => calculateUnifiedLotCost({ lot, ...ctx }), context),
    }),
    buildActivityRow({
      id: 'bovins',
      label: 'Bovins / embouche',
      ...aggregateUnifiedRows(bovins, (animal, ctx) => calculateUnifiedAnimalCost({ animal, ...ctx }), context),
    }),
    buildActivityRow({
      id: 'ovins',
      label: 'Ovins',
      ...aggregateUnifiedRows(ovins, (animal, ctx) => calculateUnifiedAnimalCost({ animal, ...ctx }), context),
    }),
    buildActivityRow({
      id: 'caprins',
      label: 'Caprins',
      ...aggregateUnifiedRows(caprins, (animal, ctx) => calculateUnifiedAnimalCost({ animal, ...ctx }), context),
    }),
  ];

  if (otherAnimals.length) {
    activities.push(buildActivityRow({
      id: 'autres_animaux',
      label: 'Autres animaux',
      ...aggregateUnifiedRows(otherAnimals, (animal, ctx) => calculateUnifiedAnimalCost({ animal, ...ctx }), context),
    }));
  }

  activities.push(buildActivityRow({
    id: 'alimentation',
    label: 'Alimentation (global)',
    feedingCost: feedTotal,
    entityCount: feedLogs.length,
    missing: feedTotal <= 0 ? ['distributions aliment'] : [],
  }));

  activities.push(buildActivityRow({
    id: 'sante',
    label: 'Santé (global)',
    healthCost: healthTotal,
    entityCount: healthEvents.length,
    missing: healthTotal <= 0 ? ['soins / vaccins'] : [],
  }));

  activities.push(buildActivityRow({
    id: 'mortalites',
    label: 'Mortalités / pertes',
    mortalityCost: mortalityTotal,
    entityCount: arr(lots).filter((l) => n(l.mortality ?? l.morts) > 0).length + arr(animaux).filter((a) => lower(a.status || a.statut).includes('mort')).length,
    missing: mortalityTotal <= 0 ? ['valeurs perte non renseignées'] : [],
  }));

  const totalRevenue = activities.reduce((s, a) => s + a.revenue, 0);
  const totalCost = activities.reduce((s, a) => s + a.totalCost, 0);
  const reliableCount = activities.filter((a) => a.reliable).length;
  const partialCount = activities.filter((a) => a.partial).length;

  // Marge RÉALISÉE : uniquement les ventes effectives, chaque unité vendue mise en
  // face de son propre coût. On exclut le cheptel vivant non vendu (c'est un stock,
  // pas une perte) et le capital des pondeuses (amorti sur la durée de ponte, pas
  // imputable au chiffre d'affaires œufs de la période) - sinon la « rentabilité »
  // paraît fortement négative alors que le cycle est simplement en cours.
  const realized = computeElevageRealizedMargin({ animaux, lots, context });

  return {
    activities: activities.filter((a) => a.entityCount > 0 || a.totalCost > 0 || a.revenue > 0),
    totals: {
      revenue: totalRevenue,
      totalCost,
      grossMargin: totalRevenue > 0 ? totalRevenue - totalCost : null,
      realizedMargin: realized.count > 0 ? realized.margin : null,
      realizedRevenue: realized.revenue,
      realizedCost: realized.cost,
      soldEntitiesCount: realized.count,
      inventoryAtCost: totalCost - realized.cost,
      reliableCount,
      partialCount,
      salesOrdersCount: arr(salesOrders).length,
    },
  };
}

/**
 * Marge réalisée sur les ventes effectives (animaux vendus entiers + lots chair
 * écoulés), chaque unité vendue rapprochée de son coût de revient unifié. Les
 * pondeuses (capital amorti) et le cheptel encore vivant sont volontairement exclus.
 */
export function computeElevageRealizedMargin({ animaux = [], lots = [], context = {} } = {}) {
  let revenue = 0;
  let cost = 0;
  let count = 0;

  arr(animaux).forEach((animal) => {
    const rev = revenueOfAnimal(animal);
    if (rev <= 0) return;
    const unified = calculateUnifiedAnimalCost({ animal, ...context });
    revenue += rev;
    cost += n(unified.totalCost);
    count += 1;
  });

  arr(lots).filter(isChairLot).forEach((lot) => {
    const sold = n(lot.vendus ?? lot.quantite_vendue);
    const unitPrice = n(lot.prix_vente_reel ?? lot.prix_vente_unitaire);
    const rev = sold > 0 && unitPrice > 0 ? sold * unitPrice : revenueOfLot(lot);
    if (rev <= 0 || sold <= 0) return;
    const unified = calculateUnifiedLotCost({ lot, ...context });
    revenue += rev;
    cost += n(unified.totalCost);
    count += 1;
  });

  return { revenue, cost, margin: revenue - cost, count };
}

export function buildPondeuseKpis(lot = {}, context = {}) {
  const unified = calculateUnifiedLotCost({ lot, alimentationLogs: context.feedLogs || [], productionLogs: context.productionLogs || [], healthEvents: context.healthEvents || [] });
  const eggsProduced = arr(context.productionLogs).filter((l) => String(l.lot_id) === String(lot.id))
    .reduce((s, l) => s + n(l.oeufs_produits ?? l.eggs_count), 0);
  const eggsBroken = arr(context.productionLogs).filter((l) => String(l.lot_id) === String(lot.id))
    .reduce((s, l) => n(l.oeufs_casses ?? l.broken_eggs), 0);
  const sellable = Math.max(0, eggsProduced - eggsBroken);
  const costPerEgg = unified.raw?.costPerEggWithoutPackaging ?? unified.raw?.costPerEgg ?? null;
  const costPerTablet = costPerEgg ? costPerEgg * 30 : null;
  const revenue = revenueOfLot(lot);
  const margin = revenue > 0 ? revenue - unified.totalCost : null;
  const reliable = unified.costComplete && revenue > 0;

  return {
    id: lot.id,
    name: lot.name || lot.nom || lot.id,
    costPerEgg,
    costPerTablet,
    layingRate: lot.taux_ponte ?? null,
    eggsProduced,
    eggsSellable: sellable,
    margin,
    reliable,
    missing: [
      !unified.feedingCost && 'alimentation',
      !unified.healthCost && 'santé',
      !revenue && 'vente',
    ].filter(Boolean),
  };
}

export function buildChairKpis(lot = {}, context = {}) {
  const unified = calculateUnifiedLotCost({ lot, alimentationLogs: context.feedLogs || [], productionLogs: context.productionLogs || [], healthEvents: context.healthEvents || [] });
  const effectif = n(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count);
  const mortality = n(lot.mortality ?? lot.morts);
  const weight = n(lot.weight_avg ?? lot.poids_moyen ?? lot.poids);
  const revenue = revenueOfLot(lot);
  const costPerChicken = effectif > 0 ? unified.totalCost / effectif : null;
  const costPerKg = weight > 0 && effectif > 0 ? unified.totalCost / (weight * effectif) : unified.raw?.costPerKg ?? null;
  const margin = revenue > 0 ? revenue - unified.totalCost : null;
  const reliable = unified.costComplete;

  return {
    id: lot.id,
    name: lot.name || lot.nom || lot.id,
    costPerChicken,
    costPerKg,
    avgWeight: weight,
    mortality,
    mortalityRate: n(lot.initial_count) > 0 ? (mortality / n(lot.initial_count)) * 100 : null,
    margin,
    reliable,
    missing: [
      !unified.feedingCost && 'alimentation',
      !unified.healthCost && 'santé',
      !weight && 'poids',
    ].filter(Boolean),
  };
}

export function buildBovinKpis(animal = {}, context = {}) {
  const unified = calculateUnifiedAnimalCost({ animal, alimentationLogs: context.feedLogs || [], vaccins: context.healthEvents || [], healthEvents: context.healthEvents || [] });
  const weight = n(animal.poids ?? animal.weight);
  const targetWeight = n(animal.poids_cible ?? animal.poids_objectif ?? animal.target_weight);
  const entryWeight = n(animal.poids_entree ?? animal.poids_initial ?? animal.poids_entree_ferme);
  const days = n(animal.age_days ?? animal.duree_embouche_jours);
  const gmq = days > 0 && weight > entryWeight ? ((weight - entryWeight) * 1000) / days : null;
  const revenue = revenueOfAnimal(animal);
  const costPerAnimal = unified.totalCost;
  const costPerKg = weight > 0 ? unified.totalCost / weight : unified.raw?.costPerKg ?? null;
  const margin = revenue > 0 ? revenue - unified.totalCost : null;
  const readyToSell = Boolean(animal.ready_to_sell) || (targetWeight > 0 && weight >= targetWeight * 0.95);

  return {
    id: animal.id,
    name: animal.name || animal.nom || animal.id,
    costPerAnimal,
    costPerKg,
    gmq,
    weight,
    targetWeight,
    margin,
    readyToSell,
    reliable: unified.costComplete,
    missing: [
      !unified.feedingCost && 'alimentation',
      !unified.healthCost && 'santé',
      !weight && 'poids',
    ].filter(Boolean),
  };
}

export function formatActivityPnlRow(row = {}) {
  if (!row.totalCost && !row.revenue) return '-';
  if (row.reliable && row.grossMargin != null) {
    return `${fmtCurrency(row.grossMargin)} (${fmtPercent(row.marginRate)})`;
  }
  return row.reliabilityMessage || `${PRODUCTION_FINANCE_LABELS.marginGross} partielle`;
}

export function formatKpiValue(value, suffix = '') {
  if (value == null || !Number(value)) return '-';
  return `${fmtNumber(value)}${suffix}`;
}
