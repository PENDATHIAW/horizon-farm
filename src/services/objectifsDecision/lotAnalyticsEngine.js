import { calculateAnimalCost, calculateAvicoleLotCost, feedCostFromLog } from '../../utils/costEngine.js';
import { avicoleActiveCount, avicoleDeadCount } from '../../utils/avicoleMetrics.js';
import { buildLotPivotContext } from './datePivotEngine.js';
import { getBreedStock, inferWorkshopFromLot } from './breedStockReferential.js';
import { buildSanitaryVacuumAlerts } from './objectifsDecisionEngine.js';
import { checkThermalStress, calculateBiomassValue } from './predictiveAnalysisEngine.js';
import { buildCrossAnalyticsPlan } from './crossAnalyticsEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function currentCount(lot = {}) {
  const initial = num(lot.initial_count ?? lot.effectif_initial);
  const exits = num(lot.mortality) + num(lot.vendus) + num(lot.reformes);
  return Math.max(0, num(lot.current_count ?? lot.effectif_actuel) || initial - exits);
}

function lotFeedKg(lotId, alimentationLogs = []) {
  return arr(alimentationLogs)
    .filter((l) => String(l.lot_id || l.lot) === String(lotId))
    .reduce((s, l) => s + num(l.quantite_kg ?? l.quantite ?? l.qty ?? 0), 0);
}

function lotFeedCost(alimentationLogs = [], lotId) {
  return arr(alimentationLogs)
    .filter((l) => String(l.lot_id || l.lot) === String(lotId))
    .reduce((s, l) => s + feedCostFromLog(l), 0);
}

function realLayingRate(lot, productionLogs = [], days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const logs = arr(productionLogs).filter((r) => String(r.lot_id) === String(lot.id) && new Date(r.date) >= cutoff);
  const eggs = logs.reduce((s, r) => s + num(r.oeufs_produits ?? r.eggs), 0);
  const birds = currentCount(lot);
  const d = Math.max(1, new Set(logs.map((r) => r.date)).size);
  return birds && logs.length ? Math.round((eggs / (birds * d)) * 1000) / 10 : num(lot.taux_ponte);
}

/** Onglet 1 — Rentabilité par lot et cycle. */
export function buildRentabilityAnalysis(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const sante = arr(dataMap.sante || dataMap.vaccins);
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const eggPrice = num(options.eggPrice ?? dataMap.growth_settings?.egg_unit_price ?? 25);

  const rows = lots.map((lot) => {
    const workshop = inferWorkshopFromLot(lot);
    const cost = calculateAvicoleLotCost({
      lot,
      alimentationLogs,
      productionLogs,
      healthEvents: sante,
    });
    const feedCost = lotFeedCost(alimentationLogs, lot.id) || cost.feedCostUsed;
    const liveWeight = num(lot.poids_moyen_actuel ?? lot.poids_moyen) / (workshop === 'poulets_chair' ? 1000 : 1);
    const subjects = Math.max(1, currentCount(lot));
    const eggs7 = arr(productionLogs)
      .filter((r) => String(r.lot_id) === String(lot.id))
      .slice(-7)
      .reduce((s, r) => s + num(r.oeufs_produits ?? r.eggs), 0);

    let revenueEstimate = 0;
    if (workshop === 'pondeuses') revenueEstimate = eggs7 * eggPrice;
    else if (workshop === 'poulets_chair') revenueEstimate = subjects * liveWeight * num(lot.prix_vente_kg ?? 1900);
    else revenueEstimate = num(lot.ca_estime);

    const mca = feedCost > 0 ? Math.round(((revenueEstimate - feedCost) / feedCost) * 100) : 0;
    const unitLabel = workshop === 'pondeuses' ? 'œuf' : 'kg';
    const unitCost = workshop === 'pondeuses'
      ? (eggs7 > 0 ? Math.round(cost.totalCost / eggs7) : 0)
      : (liveWeight > 0 ? Math.round(cost.totalCost / (subjects * liveWeight)) : 0);

    return {
      lotId: lot.id,
      lotName: lot.name || lot.nom || lot.id,
      workshop,
      totalCost: Math.round(cost.totalCost),
      feedCost: Math.round(feedCost),
      revenueEstimate: Math.round(revenueEstimate),
      mcaPct: mca,
      unitCost,
      unitLabel,
      supplierHint: lot.fournisseur_aliment || lot.fournisseur || lot.code_souche || '—',
    };
  });

  const bovinRows = animaux.filter((a) => norm(a.type).includes('bovin')).slice(0, 20).map((animal) => {
    const cost = calculateAnimalCost({ animal, alimentationLogs, vaccins: sante });
    const sale = num(animal.prix_vente ?? animal.sale_price);
    const feedCost = cost.realFeedCost;
    const mca = feedCost > 0 && sale > 0 ? Math.round(((sale - feedCost) / feedCost) * 100) : 0;
    return {
      lotId: animal.id,
      lotName: animal.name || animal.nom || animal.id,
      workshop: 'bovins',
      totalCost: Math.round(cost.totalCost),
      feedCost: Math.round(feedCost),
      revenueEstimate: Math.round(sale),
      mcaPct: mca,
      unitCost: cost.kg > 0 ? Math.round(cost.totalCost / cost.kg) : 0,
      unitLabel: 'kg',
      supplierHint: animal.fournisseur || animal.provenance || '—',
    };
  });

  const supplierRanking = [...rows, ...bovinRows]
    .filter((r) => r.supplierHint && r.supplierHint !== '—')
    .reduce((map, row) => {
      const key = row.supplierHint;
      if (!map[key]) map[key] = { supplier: key, lots: 0, avgMca: 0, totalCost: 0 };
      map[key].lots += 1;
      map[key].avgMca += row.mcaPct;
      map[key].totalCost += row.totalCost;
      return map;
    }, {});

  const suppliers = Object.values(supplierRanking).map((s) => ({
    ...s,
    avgMca: s.lots ? Math.round(s.avgMca / s.lots) : 0,
  })).sort((a, b) => b.avgMca - a.avgMca);

  return { lots: [...rows, ...bovinRows], suppliers };
}

/** Onglet 2 — Efficacité technique & conversion. */
export function buildTechnicalEfficiencyAnalysis(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const sante = arr(dataMap.sante || dataMap.vaccins);
  const currentTemp = num(options.currentTemp ?? dataMap.meteo?.temperature ?? dataMap.meteo?.temp ?? 28);
  const eggPrice = num(options.eggPrice ?? 25);

  const lotRows = lots.map((lot) => {
    const pivot = buildLotPivotContext(lot);
    const workshop = pivot.workshop;
    const feedKg = lotFeedKg(lot.id, alimentationLogs);
    const realPonte = realLayingRate(lot, productionLogs);
    const theoretical = pivot.theoretical ?? 0;
    const thermal = workshop === 'pondeuses'
      ? checkThermalStress(lot.id, currentTemp, realPonte, theoretical, currentCount(lot), eggPrice)
      : { alert: false };

    let ic = null;
    let gmq = null;
    let gmqAlert = false;
    let optimalSaleHint = null;

    if (workshop === 'poulets_chair') {
      const weightKg = num(lot.poids_moyen_actuel ?? lot.poids_moyen) / 1000;
      const subjects = currentCount(lot);
      const totalLiveKg = weightKg * subjects;
      ic = totalLiveKg > 0 ? Math.round((feedKg / totalLiveKg) * 100) / 100 : null;
      gmq = pivot.ageDays > 0 ? Math.round((weightKg * 1000) / pivot.ageDays) : null;
    }

    if (workshop === 'bovins' || workshop === 'pondeuses') {
      /* chair handled above; bovins via animaux */
    }

    if (workshop === 'pondeuses') {
      const feedCostDay = lotFeedCost(alimentationLogs, lot.id) / Math.max(1, pivot.ageDays);
      const eggsDay = realPonte * currentCount(lot) / 100;
      const revenueDay = eggsDay * eggPrice;
      if (revenueDay < feedCostDay * 0.8 && pivot.ageDays > 200) {
        gmqAlert = true;
        optimalSaleHint = 'Envisager réforme — revenu journalier sous le coût alimentaire.';
      }
    }

    return {
      lotId: lot.id,
      lotName: pivot.lotName,
      workshop,
      ageDays: pivot.ageDays,
      ic,
      icTarget: workshop === 'poulets_chair' ? 1.75 : null,
      icAlert: ic != null && ic > 2.0,
      realPonte,
      theoreticalPonte: theoretical,
      ponteGap: theoretical ? Math.round((realPonte - theoretical) * 10) / 10 : 0,
      ponteAlert: theoretical && realPonte < theoretical - 3,
      gmq,
      gmqAlert,
      optimalSaleHint,
      thermal,
    };
  });

  const bovinRows = animaux.filter((a) => norm(a.type).includes('bovin')).map((animal) => {
    const cost = calculateAnimalCost({ animal, alimentationLogs, vaccins: sante });
    const feedCostDay = cost.elapsedDays > 0 ? cost.realFeedCost / cost.elapsedDays : 0;
    const valueGainDay = cost.gmq > 0 ? cost.gmq * num(animal.prix_kg_marche ?? 3500) / 1000 : 0;
    const gmqAlert = valueGainDay > 0 && feedCostDay > valueGainDay;
    return {
      lotId: animal.id,
      lotName: animal.name || animal.nom || animal.id,
      workshop: 'bovins',
      ageDays: cost.elapsedDays,
      ic: null,
      gmq: Math.round(cost.gmq * 1000),
      gmqAlert,
      optimalSaleHint: gmqAlert ? 'Point de vente optimal probable — GMQ ne compense plus le coût du jour.' : null,
      thermal: { alert: false },
    };
  });

  return { rows: [...lotRows, ...bovinRows], thermalAlerts: lotRows.filter((r) => r.thermal?.alert) };
}

/** Onglet 3 — Flux & équilibres logistiques. */
export function buildFluxEquilibresAnalysis(dataMap = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const animaux = arr(dataMap.animaux);

  const feedStock = stocks
    .filter((s) => norm(`${s.categorie || ''} ${s.nom || ''} ${s.name || ''}`).includes('aliment'))
    .reduce((sum, s) => sum + num(s.quantite ?? s.quantity), 0);

  const dailyFeedNeed = lots.reduce((sum, lot) => {
    const n = currentCount(lot);
    const w = inferWorkshopFromLot(lot);
    const kgPerBird = w === 'pondeuses' ? 0.135 : w === 'poulets_chair' ? 0.1 : 0;
    return sum + n * kgPerBird;
  }, 0) + animaux.length * 4.5;

  const feedAutonomyDays = dailyFeedNeed > 0 ? Math.floor(feedStock / dailyFeedNeed) : null;

  const occupancy = lots.map((lot) => {
    const pivot = buildLotPivotContext(lot);
    return {
      lotId: lot.id,
      lotName: pivot.lotName,
      building: lot.batiment || lot.building || '—',
      ageDays: pivot.ageDays,
      headCount: currentCount(lot),
      workshop: pivot.workshop,
      expectedEnd: lot.date_fin || lot.date_cloture || null,
    };
  });

  const sanitaryAlerts = buildSanitaryVacuumAlerts(lots);

  const mortalityRows = lots.map((lot) => {
    const dead = avicoleDeadCount(lot);
    const initial = num(lot.initial_count ?? lot.effectif_initial) || currentCount(lot) + dead;
    const rate = initial > 0 ? Math.round((dead / initial) * 1000) / 10 : 0;
    const unitCost = num(lot.cout_unitaire_sujet ?? lot.prix_unitaire_sujet ?? 800);
    return {
      lotId: lot.id,
      lotName: lot.name || lot.nom,
      mortalityRate: rate,
      deadCount: dead,
      lossValue: Math.round(dead * unitCost),
      alert: rate > 5,
    };
  });

  return {
    feedStockKg: Math.round(feedStock),
    dailyFeedNeedKg: Math.round(dailyFeedNeed),
    feedAutonomyDays,
    feedAlert: feedAutonomyDays != null && feedAutonomyDays < 5,
    occupancy,
    sanitaryAlerts,
    mortalityRows,
  };
}

/** Onglet 4 — Maraîchage & diversification. */
export function buildMaraichageAnalysis(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const poules = lots
    .filter((l) => inferWorkshopFromLot(l) === 'pondeuses')
    .reduce((s, l) => s + currentCount(l), 0);
  const bovins = animaux.filter((a) => norm(a.type).includes('bovin')).length
    + lots.filter((l) => inferWorkshopFromLot(l) === 'bovins').reduce((s, l) => s + currentCount(l), 0);

  const npkPrice = num(options.npkBagPrice ?? dataMap.growth_settings?.npk_bag_price ?? 15000);
  const biomass = calculateBiomassValue(poules, bovins, npkPrice);

  const cultures = [
    { name: 'Tomate', yieldKgM2: 8, priceKg: 900, costM2: 450 },
    { name: 'Oignon', yieldKgM2: 6, priceKg: 700, costM2: 320 },
    { name: 'Piment', yieldKgM2: 5, priceKg: 1200, costM2: 500 },
    { name: 'Laitue', yieldKgM2: 4, priceKg: 600, costM2: 280 },
  ].map((c) => {
    const surface = num(options.surfaceM2 ?? 100);
    const revenue = c.yieldKgM2 * surface * c.priceKg;
    const cost = c.costM2 * surface;
    const marginWithBiomass = revenue - cost + Math.round(biomass.economie_totale_fcfa / 12);
    return { ...c, surfaceM2: surface, revenue, cost, marginBrute: revenue - cost, marginWithBiomass };
  });

  return { biomass, cultures, poulesCount: poules, bovinsCount: bovins };
}

export function buildLotAnalyticsPlan(dataMap = {}, options = {}) {
  return {
    rentability: buildRentabilityAnalysis(dataMap, options),
    technical: buildTechnicalEfficiencyAnalysis(dataMap, options),
    flux: buildFluxEquilibresAnalysis(dataMap),
    maraichage: buildMaraichageAnalysis(dataMap, options),
    cross: buildCrossAnalyticsPlan(dataMap, options),
  };
}

export default buildLotAnalyticsPlan;
