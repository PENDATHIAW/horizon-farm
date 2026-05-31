import { toNumber } from '../../utils/format';
import {
  calculateAnimalCost,
  calculateAvicoleLotCost,
  lotTypeKey,
  summarizeAnimalCosts,
  summarizeAvicoleCosts,
} from '../../utils/costEngine';
import {
  avicoleActiveCount,
  avicoleDeadCount,
  avicoleInitialCount,
} from '../../utils/avicoleMetrics';
import { filterLotsByActivity } from '../../utils/avicoleActivity';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => toNumber(v);
const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const safeDiv = (a, b) => (b > 0 ? a / b : 0);

const DEFAULT_LAYER_PEAK_RATE = 0.88;
export const BROILER_IC_TARGET = { min: 1.6, max: 1.9 };
export const STOCK_CRITICAL_DAYS = 5;
const FEED_STOCK_PATTERNS = ['aliment', 'provende', 'feed', 'mais', 'son', 'tourteau', 'ration'];
const FERTILIZER_BAG_KG = 50;
const FERTILIZER_BAG_PRICE = 12000;

const lotLabel = (lot = {}) => lot.name || lot.nom || lot.code || lot.id || 'Lot';
const animalLabel = (a = {}) => a.name || a.nom || a.numero || a.id || 'Animal';
const lotSupplier = (lot = {}) => lot.fournisseur_poussins || lot.fournisseur || lot.supplier_name || lot.origine || 'Non renseigné';
const animalSupplier = (a = {}) => a.fournisseur_vendeur || a.origine || a.fournisseur || 'Non renseigné';
const buildingOf = (row = {}) => row.batiment || row.nom_batiment || row.logement || row.site || row.localisation || 'Bâtiment non renseigné';
const logDate = (row = {}) => row.date || row.event_date || row.created_at || '';
const logQty = (log = {}) => n(log.quantite ?? log.quantity ?? log.qty ?? log.amount);
const lotIdOf = (row = {}) => String(row.lot_id || row.cible_id || row.entity_id || row.related_id || row.source_record_id || '');
const animalIdOf = (row = {}) => String(row.animal_id || row.cible_id || row.entity_id || row.related_id || row.source_record_id || '');
const orderAmount = (o = {}) => n(o.montant_total ?? o.total ?? o.amount ?? o.ca ?? 0);
const isFeedStock = (stock = {}) => FEED_STOCK_PATTERNS.some((p) => low(`${stock.nom || ''} ${stock.produit || ''} ${stock.categorie || ''} ${stock.category || ''}`).includes(p));
const stockQtyKg = (stock = {}) => n(stock.quantite ?? stock.quantity ?? stock.stock);
const avgWeight = (lot = {}) => n(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.poids_moyen ?? lot.current_weight ?? lot.weight);
const theoreticalLayingRate = (lot = {}, ageWeeks = 0) => {
  const souche = low(lot.souche || lot.strain || lot.race || '');
  const peak = souche.includes('lohmann') ? 0.92 : souche.includes('isa') ? 0.90 : DEFAULT_LAYER_PEAK_RATE;
  if (ageWeeks <= 0) return peak * 100;
  if (ageWeeks < 20) return Math.min(peak, 0.1 + ageWeeks * 0.04) * 100;
  if (ageWeeks <= 40) return peak * 100;
  return Math.max(0.65, peak - (ageWeeks - 40) * 0.003) * 100;
};
const ageWeeksOf = (lot = {}) => {
  const days = n(lot.age_jours ?? lot.age_days);
  if (days > 0) return Math.floor(days / 7);
  const start = lot.date_debut || lot.date_entree || lot.created_at;
  if (!start) return 0;
  const diff = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
  return Math.floor(diff / 7);
};
const eggs = (log = {}) => n(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
const isCancelled = (row = {}) => ['annule', 'annulee', 'annulé', 'cancelled'].includes(low(row.statut || row.status || ''));

function revenueForLot(lotId, salesOrders = [], payments = []) {
  const id = String(lotId || '');
  let revenue = 0;
  arr(salesOrders).filter((o) => !isCancelled(o)).forEach((o) => {
    if (lotIdOf(o) === id) revenue += orderAmount(o);
  });
  arr(payments).forEach((p) => {
    if (lotIdOf(p) === id) revenue += n(p.montant_paye ?? p.montant ?? p.amount);
  });
  return revenue;
}

function revenueForAnimal(animalId, salesOrders = []) {
  const id = String(animalId || '');
  return arr(salesOrders).filter((o) => !isCancelled(o) && animalIdOf(o) === id).reduce((s, o) => s + orderAmount(o), 0);
}

function feedKgForLot(lotId, alimentationLogs = []) {
  return arr(alimentationLogs).filter((log) => lotIdOf(log) === String(lotId)).reduce((s, log) => s + logQty(log), 0);
}

function buildLotRentabilite({ lots, alimentationLogs, productionLogs, salesOrders, payments, healthEvents, directCharges }) {
  summarizeAvicoleCosts({ rows: lots, alimentationLogs, productionLogs, healthEvents, directCharges });
  return arr(lots).map((lot) => {
    const cost = calculateAvicoleLotCost({ lot, alimentationLogs, productionLogs, healthEvents, directCharges });
    const type = lotTypeKey(lot);
    const revenue = revenueForLot(lot.id, salesOrders, payments) || n(lot.ca_realise ?? lot.revenue ?? lot.chiffre_affaires);
    const feedCost = cost.realFeedCost || cost.estimatedFeedCost;
    const mca = revenue - feedCost;
    const feedKg = feedKgForLot(lot.id, alimentationLogs);
    let unitCost = 0;
    let unitLabel = '';
    if (type === 'ponte') {
      unitCost = cost.costPerEgg || safeDiv(cost.totalCost, cost.sellableEggs);
      unitLabel = 'Coût / œuf';
    } else {
      const liveWeight = avgWeight(lot) * cost.sellableSubjects;
      unitCost = liveWeight > 0 ? cost.totalCost / liveWeight : cost.costPerKg;
      unitLabel = 'Coût / kg vif';
    }
    const ic = type === 'chair' ? safeDiv(feedKg, avgWeight(lot) * cost.sellableSubjects) : safeDiv(feedKg, cost.sellableEggs / 12);
    return {
      id: lot.id,
      label: lotLabel(lot),
      type: type === 'ponte' ? 'Pondeuses' : 'Chair',
      supplier: lotSupplier(lot),
      revenue,
      totalCost: cost.totalCost,
      feedCost,
      mca,
      unitCost,
      unitLabel,
      ic,
      mortalityRate: safeDiv(avicoleDeadCount(lot), avicoleInitialCount(lot)) * 100,
      costComplete: cost.costComplete,
      tone: mca < 0 ? 'bad' : ic > BROILER_IC_TARGET.max && type === 'chair' ? 'warn' : 'good',
    };
  }).sort((a, b) => a.mca - b.mca);
}

function buildAnimalRentabilite({ animaux, alimentationLogs, salesOrders, vaccins, healthEvents, directCharges }) {
  summarizeAnimalCosts({ rows: animaux, alimentationLogs, vaccins, healthEvents, directCharges });
  return arr(animaux).map((animal) => {
    const cost = calculateAnimalCost({ animal, alimentationLogs, vaccins, healthEvents, directCharges });
    const revenue = revenueForAnimal(animal.id, salesOrders) || cost.salePrice;
    const feedCost = cost.realFeedCost || cost.estimatedFeedCost;
    const mca = revenue - feedCost - cost.baseCost;
    const saleEstimate = n(animal.prix_vente_estime ?? animal.prix_cible ?? animal.prix_vente ?? 0);
    const mcaFlash = saleEstimate - (cost.baseCost + feedCost);
    return {
      id: animal.id,
      label: animalLabel(animal),
      type: 'Embouche',
      supplier: animalSupplier(animal),
      revenue,
      totalCost: cost.totalCost,
      feedCost,
      mca,
      mcaFlash,
      saleEstimate,
      gmq: cost.gmq,
      costPerKg: cost.costPerKg,
      unitCost: cost.costPerKg,
      unitLabel: 'Coût / kg',
      costComplete: cost.costComplete,
      tone: mcaFlash < 0 ? 'bad' : cost.gmq < 400 ? 'warn' : 'good',
    };
  }).sort((a, b) => a.mcaFlash - b.mcaFlash);
}

function buildSupplierRanking(lotRows = [], animalRows = []) {
  const map = new Map();
  [...lotRows, ...animalRows].forEach((row) => {
    const key = row.supplier || 'Non renseigné';
    const prev = map.get(key) || { supplier: key, lots: 0, revenue: 0, cost: 0, mca: 0 };
    prev.lots += 1;
    prev.revenue += row.revenue;
    prev.cost += row.totalCost;
    prev.mca += row.mca ?? row.mcaFlash ?? 0;
    map.set(key, prev);
  });
  return [...map.values()].map((row) => ({
    ...row,
    marginPct: safeDiv(row.mca, row.revenue) * 100,
    tone: row.mca < 0 ? 'bad' : row.marginPct < 10 ? 'warn' : 'good',
  })).sort((a, b) => b.mca - a.mca);
}

function buildEfficacite({ lots, animaux, alimentationLogs, productionLogs }) {
  const icAlerts = [];
  const layingAlerts = [];
  const gmqAlerts = [];

  filterLotsByActivity(lots, 'Chair').forEach((lot) => {
    const feedKg = feedKgForLot(lot.id, alimentationLogs);
    const weight = avgWeight(lot) * Math.max(1, avicoleActiveCount(lot));
    const ic = safeDiv(feedKg, weight);
    if (ic > BROILER_IC_TARGET.max || (ic > 0 && ic < BROILER_IC_TARGET.min * 0.8)) {
      icAlerts.push({
        id: lot.id,
        label: lotLabel(lot),
        ic,
        target: `${BROILER_IC_TARGET.min}–${BROILER_IC_TARGET.max}`,
        tone: ic > BROILER_IC_TARGET.max ? 'bad' : 'warn',
        detail: ic > BROILER_IC_TARGET.max ? 'IC élevé — gaspillage aliment ou problème sanitaire probable.' : 'IC anormalement bas — vérifier les pesées.',
      });
    }
  });

  filterLotsByActivity(lots, 'Pondeuse').forEach((lot) => {
    const logs = arr(productionLogs).filter((log) => lotIdOf(log) === String(lot.id) || !lotIdOf(log));
    const birds = avicoleActiveCount(lot) || avicoleInitialCount(lot);
    const days = new Set(logs.map((log) => logDate(log)).filter(Boolean)).size || 1;
    const totalEggs = logs.reduce((s, log) => s + eggs(log), 0);
    const realRate = birds > 0 ? safeDiv(totalEggs, birds * days) * 100 : 0;
    const ageWeeks = ageWeeksOf(lot);
    const theoretical = theoreticalLayingRate(lot, ageWeeks);
    const deviation = realRate - theoretical;
    if (birds > 0 && Math.abs(deviation) > 8) {
      layingAlerts.push({
        id: lot.id,
        label: lotLabel(lot),
        realRate,
        theoretical,
        deviation,
        ageWeeks,
        tone: deviation < -8 ? 'bad' : 'warn',
        detail: deviation < 0 ? 'Ponte sous le standard souche — stress, maladie ou ration à contrôler.' : 'Ponte au-dessus du standard — vérifier comptage.',
      });
    }
  });

  arr(animaux).forEach((animal) => {
    const cost = calculateAnimalCost({ animal, alimentationLogs });
    const dailyFeed = safeDiv(cost.realFeedCost || cost.estimatedFeedCost, cost.elapsedDays);
    const marketPrice = n(animal.prix_kg_marche ?? animal.prix_vente_kg ?? 2500);
    const dailyGainValue = (cost.gmq / 1000) * marketPrice;
    const optimal = dailyGainValue > 0 && dailyFeed >= dailyGainValue;
    if (cost.gmq > 0 && (optimal || cost.gmq < 350)) {
      gmqAlerts.push({
        id: animal.id,
        label: animalLabel(animal),
        gmq: cost.gmq,
        dailyFeed,
        dailyGainValue,
        optimal,
        tone: optimal ? 'bad' : cost.gmq < 350 ? 'warn' : 'good',
        detail: optimal
          ? 'Le coût journalier dépasse le gain de valeur — vente recommandée.'
          : cost.gmq < 350 ? 'GMQ faible — ration ou santé à vérifier.' : 'Croissance conforme.',
      });
    }
  });

  return { icAlerts, layingAlerts, gmqAlerts };
}

function buildFlux({ lots, animaux, alimentationLogs, stocks }) {
  const dailyFeedKg = arr(alimentationLogs).slice(-30).reduce((s, log) => s + logQty(log), 0);
  const avgDailyConsumption = dailyFeedKg > 0 ? dailyFeedKg / Math.min(30, arr(alimentationLogs).length || 1) : 0;
  const fallbackDaily = arr(lots).reduce((s, lot) => {
    const birds = avicoleActiveCount(lot);
    const gPerBird = n(lot.aliment_g_par_poule ?? lot.feed_g_per_bird_day) || (lotTypeKey(lot) === 'ponte' ? 115 : 100);
    return s + (birds * gPerBird) / 1000;
  }, 0) + arr(animaux).reduce((s, a) => s + n(a.ration_kg_jour ?? a.feed_kg_day ?? 4.5), 0);

  const consumption = avgDailyConsumption || fallbackDaily || 1;
  const feedStocks = arr(stocks).filter(isFeedStock);
  const stockAutonomy = feedStocks.map((stock) => {
    const qty = stockQtyKg(stock);
    const daysLeft = safeDiv(qty, consumption);
    return {
      id: stock.id,
      label: stock.nom || stock.produit || stock.id,
      qtyKg: qty,
      daysLeft,
      tone: daysLeft < STOCK_CRITICAL_DAYS ? 'bad' : daysLeft < 10 ? 'warn' : 'good',
    };
  });
  if (!feedStocks.length) {
    const totalFeed = arr(stocks).filter((s) => stockQtyKg(s) > 0).reduce((s, st) => s + stockQtyKg(st), 0);
    stockAutonomy.push({
      id: 'total-aliment',
      label: 'Stock aliment (global)',
      qtyKg: totalFeed,
      daysLeft: safeDiv(totalFeed, consumption),
      tone: safeDiv(totalFeed, consumption) < STOCK_CRITICAL_DAYS ? 'bad' : 'warn',
    });
  }

  const buildingMap = new Map();
  arr(lots).forEach((lot) => {
    const b = buildingOf(lot);
    const entry = buildingMap.get(b) || { building: b, lots: [], effectif: 0, exitDates: [], entryDates: [] };
    entry.lots.push(lotLabel(lot));
    entry.effectif += avicoleActiveCount(lot);
    if (lot.date_sortie_prevue || lot.date_sortie) entry.exitDates.push(lot.date_sortie_prevue || lot.date_sortie);
    if (lot.date_debut || lot.date_entree) entry.entryDates.push(lot.date_debut || lot.date_entree);
    buildingMap.set(b, entry);
  });
  const buildingOccupancy = [...buildingMap.values()].map((row) => ({
    ...row,
    occupancyPct: Math.min(100, row.effectif > 0 ? Math.round(row.effectif / 500 * 100) : 0),
    tone: row.effectif === 0 ? 'warn' : row.effectif > 800 ? 'bad' : 'good',
    detail: row.effectif === 0 ? 'Bâtiment vide — planifier prochaine bande.' : `${row.effectif} sujets actifs.`,
  }));

  const materialBalance = arr(lots).map((lot) => {
    const initial = avicoleInitialCount(lot);
    const dead = avicoleDeadCount(lot);
    const cost = calculateAvicoleLotCost({ lot, alimentationLogs });
    const lossValue = dead * safeDiv(cost.totalCost, Math.max(1, initial));
    return {
      id: lot.id,
      label: lotLabel(lot),
      entrees: initial,
      sorties: n(lot.vendus ?? lot.sold_count) + avicoleActiveCount(lot),
      pertes: dead,
      lossValue,
      mortalityPct: safeDiv(dead, initial) * 100,
      tone: safeDiv(dead, initial) > 0.04 ? 'bad' : 'good',
    };
  });

  return { stockAutonomy, buildingOccupancy, materialBalance, dailyConsumption: consumption };
}

const DEFAULT_CROPS = [
  { key: 'tomate', label: 'Tomate', yieldKgM2: 8, seedCostM2: 1200, defaultPrice: 800 },
  { key: 'oignon', label: 'Oignon', yieldKgM2: 4.5, seedCostM2: 900, defaultPrice: 600 },
  { key: 'piment', label: 'Piment', yieldKgM2: 3.5, seedCostM2: 1500, defaultPrice: 1200 },
  { key: 'aubergine', label: 'Aubergine', yieldKgM2: 5, seedCostM2: 1100, defaultPrice: 700 },
  { key: 'chou', label: 'Chou', yieldKgM2: 6, seedCostM2: 800, defaultPrice: 500 },
];

function marketPriceFor(cropKey, marketPrices = []) {
  const match = arr(marketPrices).find((row) => low(row.product_name || row.produit || row.product_category || '').includes(cropKey));
  return n(match?.price_fcfa ?? match?.prix ?? match?.unit_price ?? 0);
}

function buildMaraichage({ lots, animaux, marketPrices }) {
  const pondeuseBirds = filterLotsByActivity(lots, 'Pondeuse').reduce((s, lot) => s + avicoleActiveCount(lot), 0);
  const bovineCount = arr(animaux).filter((a) => low(`${a.type || ''} ${a.espece || ''}`).includes('bovin')).length;
  const litterKgYear = pondeuseBirds * 0.08 * 365;
  const manureKgYear = bovineCount * 15 * 365;
  const totalEffluentKg = litterKgYear + manureKgYear;
  const bagsSaved = Math.floor(totalEffluentKg / FERTILIZER_BAG_KG);
  const fertilizerSavings = bagsSaved * FERTILIZER_BAG_PRICE;

  const cropSimulation = DEFAULT_CROPS.map((crop) => {
    const price = marketPriceFor(crop.key, marketPrices) || crop.defaultPrice;
    const revenueM2 = crop.yieldKgM2 * price;
    const marginM2 = revenueM2 - crop.seedCostM2;
    return {
      ...crop,
      priceKg: price,
      revenueM2,
      marginM2,
      marginHa: marginM2 * 10000,
      tone: marginM2 > crop.seedCostM2 ? 'good' : 'warn',
    };
  }).sort((a, b) => b.marginM2 - a.marginM2);

  return {
    cropSimulation,
    effluent: {
      litterKgYear,
      manureKgYear,
      totalEffluentKg,
      bagsSaved,
      fertilizerSavings,
      pondeuseBirds,
      bovineCount,
      active: pondeuseBirds > 0 || bovineCount > 0,
    },
  };
}

function buildGraphiquesData({ lots, animaux, alimentationLogs, productionLogs, stocks, flux, marketPrices }) {
  const pondeuses = filterLotsByActivity(lots, 'Pondeuse');
  const pondeuseIds = new Set(pondeuses.map((l) => String(l.id)));
  const dailyMap = new Map();

  arr(productionLogs).forEach((log) => {
    if (pondeuseIds.size && lotIdOf(log) && !pondeuseIds.has(lotIdOf(log))) return;
    const day = String(logDate(log)).slice(0, 10);
    if (!day) return;
    const bucket = dailyMap.get(day) || { date: day, eggs: 0, feedKg: 0 };
    bucket.eggs += eggs(log);
    dailyMap.set(day, bucket);
  });

  arr(alimentationLogs).forEach((log) => {
    const day = String(logDate(log)).slice(0, 10);
    if (!day) return;
    const isPondeuse = !lotIdOf(log) || pondeuseIds.has(lotIdOf(log)) || low(`${log.notes || ''} ${log.produit || ''}`).includes('pondeuse');
    if (!isPondeuse) return;
    const bucket = dailyMap.get(day) || { date: day, eggs: 0, feedKg: 0 };
    bucket.feedKg += logQty(log);
    dailyMap.set(day, bucket);
  });

  const birds = pondeuses.reduce((s, lot) => s + avicoleActiveCount(lot), 0);
  const avicoleDaily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map((row) => ({
    ...row,
    layingRate: birds > 0 ? safeDiv(row.eggs, birds) * 100 : 0,
    birds,
  }));

  const broilerIC = filterLotsByActivity(lots, 'Chair').map((lot) => {
    const feedKg = feedKgForLot(lot.id, alimentationLogs);
    const weight = avgWeight(lot) * Math.max(1, avicoleActiveCount(lot) + n(lot.vendus ?? lot.sold_count));
    return {
      id: lot.id,
      label: lotLabel(lot),
      feedKg,
      liveWeightKg: weight,
      ic: safeDiv(feedKg, weight),
      tone: safeDiv(feedKg, weight) > BROILER_IC_TARGET.max ? 'bad' : 'good',
    };
  });

  const cattleGMQ = arr(animaux).map((animal) => {
    const cost = calculateAnimalCost({ animal, alimentationLogs });
    const weeks = Math.max(1, Math.floor(cost.elapsedDays / 7));
    return {
      id: animal.id,
      label: animalLabel(animal),
      weeks,
      gmq: cost.gmq,
      mcaFlash: n(animal.prix_vente_estime ?? 0) - (cost.baseCost + cost.realFeedCost),
    };
  }).filter((row) => row.gmq > 0);

  const siloLevels = flux.stockAutonomy.map((row) => ({
    ...row,
    pct: Math.min(100, safeDiv(row.qtyKg, flux.dailyConsumption * 30) * 100),
  }));

  return { avicoleDaily, broilerIC, cattleGMQ, siloLevels, maraichage: buildMaraichage({ lots, animaux, marketPrices }) };
}

export function buildDecisionCenterData(props = {}) {
  const lots = arr(props.lots);
  const animaux = arr(props.animaux);
  const alimentationLogs = arr(props.alimentationLogs);
  const productionLogs = arr(props.productionLogs);
  const stocks = arr(props.stocks);
  const salesOrders = arr(props.salesOrders || props.salesOrdersAll);
  const payments = arr(props.payments || props.paymentsAll);
  const healthEvents = arr(props.sante);
  const directCharges = arr(props.businessEvents);
  const marketPrices = arr(props.marketPrices);

  const lotRentabilite = buildLotRentabilite({ lots, alimentationLogs, productionLogs, salesOrders, payments, healthEvents, directCharges });
  const animalRentabilite = buildAnimalRentabilite({ animaux, alimentationLogs, salesOrders, vaccins: healthEvents, healthEvents, directCharges });
  const supplierRanking = buildSupplierRanking(lotRentabilite, animalRentabilite);
  const efficacite = buildEfficacite({ lots, animaux, alimentationLogs, productionLogs });
  const flux = buildFlux({ lots, animaux, alimentationLogs, stocks });
  const maraichage = buildMaraichage({ lots, animaux, marketPrices });
  const graphiques = buildGraphiquesData({ lots, animaux, alimentationLogs, productionLogs, stocks, flux, marketPrices });

  const alertCounts = {
    rentabilite: lotRentabilite.filter((r) => r.tone === 'bad').length + animalRentabilite.filter((r) => r.tone === 'bad').length,
    efficacite: efficacite.icAlerts.length + efficacite.layingAlerts.filter((a) => a.tone === 'bad').length + efficacite.gmqAlerts.filter((a) => a.tone === 'bad').length,
    flux: flux.stockAutonomy.filter((s) => s.tone === 'bad').length + flux.materialBalance.filter((m) => m.tone === 'bad').length,
    maraichage: 0,
  };

  return {
    rentabilite: { lots: lotRentabilite, animaux: animalRentabilite, supplierRanking },
    efficacite,
    flux,
    maraichage,
    graphiques,
    alertCounts,
  };
}
