import { buildGoalPerformance, classifySaleActivity } from '../growthDecisionEngine.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';
import { summarizeAnimalCosts } from '../../utils/costEngine.js';
import { getBreedStock, inferWorkshopFromLot } from './breedStockReferential.js';
import { buildLotPivotContext, buildWorkshopFinancialTargets, computeAgeDays, resolvePivotDate } from './datePivotEngine.js';
import { buildPricingMatrix } from './dynamicPricingEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function currentCount(lot = {}) {
  const initial = num(lot.initial_count ?? lot.effectif_initial);
  const exits = num(lot.mortality) + num(lot.vendus) + num(lot.reformes) + num(lot.abattus);
  return Math.max(0, num(lot.current_count ?? lot.effectif_actuel) || initial - exits);
}

function lotBuildingKey(lot = {}) {
  return norm(lot.batiment || lot.building || lot.localisation || lot.name || lot.nom || lot.id);
}

/** Taux de ponte réel sur une fenêtre (jours). */
function computeRealLayingRate(lot, productionLogs = [], windowDays = 7) {
  const lotId = String(lot.id);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const logs = arr(productionLogs).filter((row) => String(row.lot_id) === lotId && new Date(row.date) >= cutoff);
  const eggs = logs.reduce((s, r) => s + num(r.oeufs_produits ?? r.eggs), 0);
  const birds = currentCount(lot);
  if (!birds || !logs.length) return { rate: num(lot.taux_ponte), eggs, birds, windowDays };
  const days = Math.max(1, new Set(logs.map((r) => r.date)).size);
  return { rate: Math.round((eggs / (birds * days)) * 1000) / 10, eggs, birds, windowDays: days };
}

function computeRealGmq(lot = {}, animaux = [], alimentationLogs = [], vaccins = []) {
  const workshop = inferWorkshopFromLot(lot);
  if (workshop === 'bovins') {
    const linked = arr(animaux).filter((a) => String(a.lot_id || a.lot_avicole_id) === String(lot.id) || norm(a.type).includes('bovin'));
    const summary = summarizeAnimalCosts({ rows: linked.length ? linked : arr(animaux).slice(0, 5), alimentationLogs, vaccins });
    return summary.averageGMQ || num(lot.gmq ?? lot.gmq_reel);
  }
  const weight = num(lot.poids_moyen_actuel ?? lot.poids_moyen ?? lot.poids_actuel);
  const age = computeAgeDays(lot);
  const startWeight = workshop === 'poulets_chair' ? 0.042 : num(lot.poids_entree ?? lot.poids_initial);
  if (weight > 0 && age > 0) {
    const wKg = workshop === 'poulets_chair' ? weight / 1000 : weight;
    const sKg = workshop === 'poulets_chair' ? startWeight : startWeight;
    return Math.round(((wKg - sKg) / age) * 1000);
  }
  return num(lot.gmq);
}

function zootechnicalGapStatus(real, theoretical, tolerancePct = 5) {
  if (theoretical == null || theoretical === 0) return { status: 'neutral', gap: 0, gapPct: 0 };
  const gap = real - theoretical;
  const gapPct = theoretical !== 0 ? (gap / theoretical) * 100 : 0;
  if (Math.abs(gapPct) <= tolerancePct) return { status: 'ok', gap, gapPct };
  if (gapPct < -tolerancePct) return { status: gapPct < -(tolerancePct * 2) ? 'critical' : 'warning', gap, gapPct };
  return { status: 'ok', gap, gapPct };
}

function correlatePonteDrop(lot, productionLogs, alimentationLogs, sante, dropPct) {
  if (dropPct < 3) return null;
  const lotId = String(lot.id);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);
  const feedDeliveries = arr(alimentationLogs).filter((row) => {
    const d = new Date(row.date || row.created_at);
    return d >= cutoff && (String(row.lot_id) === lotId || norm(row.lot || row.lot_name).includes(norm(lot.name || lot.nom)));
  });
  const vetEvents = arr(sante).filter((row) => {
    const d = new Date(row.date || row.date_intervention || row.created_at);
    return d >= cutoff && (String(row.lot_id) === lotId || String(row.related_id) === lotId);
  });
  const causes = [];
  if (feedDeliveries.length === 0) causes.push('Aucune livraison aliment enregistrée sur 5 jours');
  else if (feedDeliveries.length < 2) causes.push(`${feedDeliveries.length} livraison(s) aliment sur 5 jours — ration à vérifier`);
  if (vetEvents.length) causes.push(`${vetEvents.length} intervention(s) vétérinaire récente(s)`);
  return {
    dropPct,
    feedDeliveries: feedDeliveries.length,
    vetEvents: vetEvents.length,
    hypothesis: causes.length ? causes.join(' · ') : 'Vérifier stress thermique, eau et lumière',
  };
}

export function buildZootechnicalAnalysis(dataMap = {}, referenceDate = new Date()) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const sante = arr(dataMap.sante || dataMap.vaccins);
  const animaux = arr(dataMap.animaux);

  const rows = lots.map((lot) => {
    const pivot = buildLotPivotContext(lot, referenceDate);
    const breed = getBreedStock(pivot.breedCode);
    const workshop = pivot.workshop;

    if (workshop === 'pondeuses') {
      const real7 = computeRealLayingRate(lot, productionLogs, 7);
      const real2 = computeRealLayingRate(lot, productionLogs, 2);
      const theoretical = pivot.theoretical;
      const gap = zootechnicalGapStatus(real7.rate, theoretical, breed?.tolerancePct ?? 5);
      const drop48h = real7.rate > 0 && real2.rate > 0 ? real7.rate - real2.rate : 0;
      const correlation = drop48h >= 3 ? correlatePonteDrop(lot, productionLogs, alimentationLogs, sante, drop48h) : null;
      const feedOvercost = gap.status !== 'ok' && breed
        ? Math.round(Math.abs(gap.gapPct) * (breed.feedOvercostPerPointPct || 0) * currentCount(lot) / 100)
        : 0;

      return {
        ...pivot,
        workshop,
        metricLabel: 'Taux de ponte',
        realValue: real7.rate,
        theoreticalValue: theoretical,
        unit: '%',
        gap,
        alertLevel: gap.status === 'critical' ? 'red' : gap.status === 'warning' ? 'orange' : 'green',
        feedOvercostFcfa: feedOvercost,
        drop48h,
        correlation,
      };
    }

    if (workshop === 'poulets_chair' || workshop === 'bovins') {
      const realWeight = workshop === 'poulets_chair'
        ? num(lot.poids_moyen_actuel ?? lot.poids_moyen)
        : num(lot.poids_moyen_actuel ?? lot.poids_moyen ?? lot.poids_actuel);
      const theoretical = pivot.theoretical;
      const gmq = computeRealGmq(lot, animaux, alimentationLogs, sante);
      const gmqTarget = breed?.gmqTargetG || (workshop === 'poulets_chair' ? 55 : 800);
      const weightGap = zootechnicalGapStatus(realWeight, theoretical, breed?.tolerancePct ?? 8);
      const delayDays = theoretical && realWeight < theoretical * (1 - (breed?.tolerancePct ?? 8) / 100)
        ? Math.max(0, Math.round((theoretical - realWeight) / (gmq || 1)))
        : 0;
      const feedOvercost = delayDays * (breed?.feedOvercostPerDayDelay || 0) * currentCount(lot);

      return {
        ...pivot,
        workshop,
        metricLabel: workshop === 'poulets_chair' ? 'Poids moyen' : 'Poids vif',
        realValue: realWeight,
        theoreticalValue: theoretical,
        gmqReal: gmq,
        gmqTarget,
        unit: workshop === 'poulets_chair' ? 'g' : 'kg',
        gap: weightGap,
        alertLevel: weightGap.status === 'critical' ? 'red' : weightGap.status === 'warning' ? 'orange' : 'green',
        delayDays,
        feedOvercostFcfa: feedOvercost,
      };
    }

    return { ...pivot, workshop, metricLabel: '—', alertLevel: 'neutral' };
  });

  return rows.filter((r) => r.workshop);
}

export function buildFinancialGapAnalysis(dataMap = {}, referenceDate = new Date()) {
  const goals = buildGoalPerformance(dataMap);
  const workshopTargets = buildWorkshopFinancialTargets(dataMap);
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);



  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const monthIdx = now.getMonth();

  const activityRealized = {};
  salesOrders.forEach((order) => {
    const act = classifySaleActivity(order, dataMap);
    const amt = num(order.montant_total ?? order.total ?? order.amount);
    activityRealized[act] = (activityRealized[act] || 0) + amt;
  });

  const pricing = buildPricingMatrix({ dataMap, referenceDate: now });

  const workshops = workshopTargets.map((ws) => {
    const realized = activityRealized[ws.activity] || 0;
    const monthTarget = ws.monthly[monthIdx]?.caTarget || 0;
    const marginTarget = ws.monthly[monthIdx]?.marginTarget || 0;
    const marginRealized = Math.round(realized * (ws.marginPctTarget / 100));
    const priceRow = pricing.find((p) => p.activity === ws.activity);

    return {
      ...ws,
      caRealized: realized,
      caTargetMonth: monthTarget,
      caGap: monthTarget - realized,
      caAttainment: monthTarget > 0 ? Math.round((realized / monthTarget) * 100) : 0,
      marginRealized,
      marginTargetMonth: marginTarget,
      marginGap: marginTarget - marginRealized,
      marginAttainment: marginTarget > 0 ? Math.round((marginRealized / marginTarget) * 100) : 0,
      pricing: priceRow,
      mispricingAlert: priceRow?.mispricingRisk || false,
    };
  });

  return {
    global: goals.global,
    activities: goals.activities,
    workshops,
    pricing,
    mispricingAlerts: pricing.filter((p) => p.mispricingRisk),
  };
}

const SANITARY_MIN_DAYS = 10;

export function buildSanitaryVacuumAlerts(lots = []) {
  const byBuilding = new Map();
  arr(lots).forEach((lot) => {
    const key = lotBuildingKey(lot);
    if (!byBuilding.has(key)) byBuilding.set(key, []);
    byBuilding.get(key).push(lot);
  });

  const alerts = [];
  byBuilding.forEach((buildingLots, building) => {
    const sorted = [...buildingLots].sort((a, b) => String(resolvePivotDate(a)).localeCompare(String(resolvePivotDate(b))));
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevEnd = prev.date_fin || prev.date_cloture || prev.updated_at;
      const gap = prevEnd
        ? Math.floor((new Date(resolvePivotDate(curr)).getTime() - new Date(prevEnd).getTime()) / 86400000)
        : computeAgeDays(curr) - computeAgeDays(prev);
      const configured = num(curr.vide_sanitaire_jours ?? prev.vide_sanitaire_jours);
      const effectiveGap = configured > 0 ? configured : gap;
      if (effectiveGap < SANITARY_MIN_DAYS) {
        alerts.push({
          id: `sanitary-${building}-${curr.id}`,
          building,
          lotId: curr.id,
          lotName: curr.name || curr.nom,
          gapDays: effectiveGap,
          requiredDays: SANITARY_MIN_DAYS,
          blocking: true,
          message: `Vide sanitaire insuffisant (${effectiveGap}j < ${SANITARY_MIN_DAYS}j) entre deux lots dans ${building}.`,
        });
      }
    }
  });
  return alerts;
}

/** Seuil de rentabilité mensuel — calculé le 28 ou à la demande. */
export function computeMonthlyBreakEven(dataMap = {}, referenceDate = new Date()) {
  const fixedAnnual = num(HORIZON_FARM_OFFICIAL_BP.fixedCosts?.annualByYear?.[0]) + num(HORIZON_FARM_OFFICIAL_BP.payroll?.annualTotal);
  const fixedMonthly = fixedAnnual / 12;
  const variableMonthly = num(HORIZON_FARM_OFFICIAL_BP.variableCosts?.correctedAnnualTotal) / 12;
  const settings = dataMap.growth_settings || {};
  const netMarginTargetPct = num(settings.target_net_margin_pct ?? 12) / 100;
  const grossMarginPct = num(settings.target_gross_margin_pct ?? 35) / 100;

  const breakEvenCa = Math.round((fixedMonthly + variableMonthly) / Math.max(0.01, grossMarginPct));
  const targetCaForNetMargin = Math.round((fixedMonthly + variableMonthly) / Math.max(0.01, grossMarginPct - netMarginTargetPct));

  const goals = buildGoalPerformance(dataMap);
  const realized = num(goals.global?.realized);

  return {
    computedOnDay: referenceDate.getDate(),
    fixedMonthly,
    variableMonthly,
    grossMarginPct: grossMarginPct * 100,
    netMarginTargetPct: netMarginTargetPct * 100,
    breakEvenCa,
    targetCaForNetMargin,
    caRealizedMonth: realized,
    gapToBreakEven: breakEvenCa - realized,
    gapToNetTarget: targetCaForNetMargin - realized,
    isProfitable: realized >= breakEvenCa,
  };
}

export function simulateMaraichageSandbox({
  baseCharges = 0,
  extraCharges = 0,
  yieldKg = 0,
  marketPriceA = 800,
  marketPriceB = 650,
  costPerKg = 400,
} = {}) {
  const totalCost = baseCharges + extraCharges + yieldKg * costPerKg;
  const revenueA = yieldKg * marketPriceA;
  const revenueB = yieldKg * marketPriceB;
  return {
    totalCost,
    marketA: { price: marketPriceA, revenue: revenueA, margin: revenueA - totalCost },
    marketB: { price: marketPriceB, revenue: revenueB, margin: revenueB - totalCost },
    breakEvenKgA: marketPriceA > costPerKg ? Math.ceil(totalCost / (marketPriceA - costPerKg)) : null,
    breakEvenKgB: marketPriceB > costPerKg ? Math.ceil(totalCost / (marketPriceB - costPerKg)) : null,
  };
}

/** Plan décisionnel complet pour Objectifs & Croissance. */
export function buildObjectifsDecisionPlan(dataMap = {}, options = {}) {
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const zootechnical = buildZootechnicalAnalysis(dataMap, referenceDate);
  const financial = buildFinancialGapAnalysis(dataMap, referenceDate);
  const workshopTargets = buildWorkshopFinancialTargets(dataMap);
  const breakEven = computeMonthlyBreakEven(dataMap, referenceDate);
  const sanitaryAlerts = buildSanitaryVacuumAlerts(arr(dataMap.avicole || dataMap.lots));
  const lotPivots = arr(dataMap.avicole || dataMap.lots).map((lot) => buildLotPivotContext(lot, referenceDate));

  return {
    generatedAt: referenceDate.toISOString(),
    referenceDate: referenceDate.toISOString().slice(0, 10),
    zootechnical,
    financial,
    workshopTargets,
    breakEven,
    sanitaryAlerts,
    lotPivots,
    chartData: buildChartDataset(dataMap, { zootechnical, financial, breakEven, lotPivots, referenceDate }),
  };
}

function buildChartDataset(dataMap, { zootechnical, financial, breakEven, lotPivots }) {
  const monthlyBp = HORIZON_FARM_OFFICIAL_BP.revenue.monthly || [];
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const monthLabels = monthlyBp.map((_, i) => `M${i + 1}`);

  const caRealByMonth = monthLabels.map((_, i) => {
    const key = String(i + 1).padStart(2, '0');
    return salesOrders
      .filter((o) => String(o.date || o.created_at || '').includes(`-${key}-`) || false)
      .reduce((s, o) => s + num(o.montant_total ?? o.total), 0);
  });

  const pondeuseLots = zootechnical.filter((z) => z.workshop === 'pondeuses');
  const chairLots = zootechnical.filter((z) => z.workshop === 'poulets_chair');

  return {
    g1: {
      ages: Object.keys(getBreedStock('PONDEUSE_RHODE')?.curve || {}).map(Number),
      theoretical: pondeuseLots[0] ? Object.values(getBreedStock('PONDEUSE_RHODE').curve) : [],
      real: pondeuseLots.map((l) => ({ lot: l.lotName, rate: l.realValue, age: l.ageDays })),
    },
    g2: chairLots.map((l) => ({
      lot: l.lotName,
      real: l.realValue,
      theoretical: l.theoreticalValue,
      gap: l.gap?.gapPct ?? 0,
      conform: l.alertLevel === 'green',
    })),
    g3: {
      months: monthLabels,
      caReal: caRealByMonth,
      breakEvenLine: monthLabels.map(() => breakEven.breakEvenCa),
      caTarget: monthlyBp.map((r) => r.total),
    },
    g4: lotPivots.map((l) => ({
      lot: l.lotName,
      building: l.lotId,
      start: l.pivotDate,
      ageDays: l.ageDays,
      workshop: l.workshop,
    })),
    g5: financial.workshops.map((w) => ({
      workshop: w.label,
      marginTarget: w.marginTargetMonth,
      marginReal: w.marginRealized,
    })),
    g6: {
      annualTarget: num(financial.global?.annualTarget ?? HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal),
      annualReal: num(financial.global?.year1Actual ?? financial.global?.realized),
      attainment: num(financial.global?.annualAttainment ?? financial.global?.attainment),
    },
    g7: financial.pricing.map((p) => ({
      activity: p.activity,
      cost: p.unitCost,
      market: p.adjustedMarketPrice,
      practiced: p.practicedPrice,
      months: monthLabels,
    })),
  };
}

export default buildObjectifsDecisionPlan;
