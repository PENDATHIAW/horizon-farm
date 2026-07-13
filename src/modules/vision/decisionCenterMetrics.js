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
      recommendedAction: mca < 0 ? 'Analyser coûts lot' : ic > BROILER_IC_TARGET.max && type === 'chair' ? 'Voir efficacité IC' : null,
      actionModule: mca < 0 ? 'elevage' : 'centre_ia',
      actionTab: mca < 0 ? 'Avicole' : 'Efficacité',
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
      recommendedAction: mcaFlash < 0 ? 'Revoir coûts embouche' : cost.gmq < 400 ? 'Vérifier ration' : null,
      actionModule: 'elevage',
      actionTab: 'Animaux',
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
      const icHigh = ic > BROILER_IC_TARGET.max;
      icAlerts.push({
        id: lot.id,
        label: lotLabel(lot),
        ic,
        target: `${BROILER_IC_TARGET.min}–${BROILER_IC_TARGET.max}`,
        tone: icHigh ? 'bad' : 'warn',
        detail: icHigh ? 'IC élevé — gaspillage aliment ou problème sanitaire probable.' : 'IC anormalement bas — vérifier les pesées.',
        recommendedAction: icHigh ? 'Contrôler ration & santé' : 'Vérifier pesées du lot',
        actionModule: 'elevage',
        actionTab: 'Avicole',
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
      const layingLow = deviation < 0;
      layingAlerts.push({
        id: lot.id,
        label: lotLabel(lot),
        realRate,
        theoretical,
        deviation,
        ageWeeks,
        tone: deviation < -8 ? 'bad' : 'warn',
        detail: layingLow ? 'Ponte sous le standard souche — stress, maladie ou ration à contrôler.' : 'Ponte au-dessus du standard — vérifier comptage.',
        recommendedAction: layingLow ? 'Contrôler ration & éclairage' : 'Vérifier comptage œufs',
        actionModule: 'elevage',
        actionTab: 'Production',
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
        recommendedAction: optimal ? 'Planifier la vente' : cost.gmq < 350 ? 'Vérifier ration & santé' : null,
        actionModule: 'elevage',
        actionTab: 'Animaux',
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
      recommendedAction: daysLeft < STOCK_CRITICAL_DAYS ? 'Commander aliment' : daysLeft < 10 ? 'Planifier achat' : null,
      actionModule: 'achats_stock',
      actionTab: daysLeft < STOCK_CRITICAL_DAYS ? 'Achats' : 'Stock',
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
      recommendedAction: safeDiv(dead, initial) > 0.04 ? 'Contrôler mortalité' : null,
      actionModule: 'elevage',
      actionTab: 'Avicole',
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

function buildGraphiquesData({ lots, animaux, alimentationLogs, productionLogs, flux, marketPrices }) {
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


function daysBetweenDates(start, end) {
  const a = new Date(start || 0);
  const b = new Date(end || 0);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}



function feedProductKey(log = {}) {
  return low(log.produit || log.product_name || log.nom || log.categorie || log.category || 'aliment');
}

function feedSupplierName(log = {}, fournisseurs = []) {
  const id = log.fournisseur_id || log.supplier_id;
  const match = arr(fournisseurs).find((f) => String(f.id) === String(id));
  return match?.nom || match?.name || log.fournisseur_nom || log.fournisseur || log.supplier_name || 'Fournisseur non renseigné';
}

function feedPricePerKg(log = {}) {
  const qty = logQty(log);
  const amount = n(log.montant_total ?? log.cout_total ?? log.total ?? log.montant ?? log.amount)
    || n(log.prix_unitaire ?? log.unit_price ?? log.price) * qty;
  if (qty > 0 && amount > 0) return amount / qty;
  return n(log.prix_unitaire ?? log.unit_price ?? log.price);
}

function buildFeedComparisons({ alimentationLogs = [], fournisseurs = [] }) {
  const purchases = arr(alimentationLogs)
    .map((log) => {
      const date = logDate(log);
      const qty = logQty(log);
      const pricePerKg = feedPricePerKg(log);
      if (!date || qty <= 0 || pricePerKg <= 0) return null;
      return {
        id: log.id,
        date,
        qty,
        pricePerKg,
        amount: pricePerKg * qty,
        product: feedProductKey(log),
        supplier: feedSupplierName(log, fournisseurs),
        category: low(log.categorie || log.category || ''),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  const now = Date.now();
  const ms30 = 30 * 86400000;
  const current = purchases.filter((p) => now - new Date(p.date).getTime() <= ms30);
  const previous = purchases.filter((p) => {
    const age = now - new Date(p.date).getTime();
    return age > ms30 && age <= ms30 * 2;
  });

  const periodAlerts = [];
  const productKeys = [...new Set(purchases.map((p) => p.product))];
  productKeys.forEach((product) => {
    const cur = current.filter((p) => p.product === product);
    const prev = previous.filter((p) => p.product === product);
    if (!cur.length || !prev.length) return;
    const curAvg = cur.reduce((s, p) => s + p.pricePerKg, 0) / cur.length;
    const prevAvg = prev.reduce((s, p) => s + p.pricePerKg, 0) / prev.length;
    if (prevAvg <= 0) return;
    const pct = ((curAvg - prevAvg) / prevAvg) * 100;
    if (Math.abs(pct) >= 5) {
      periodAlerts.push({
        id: `feed-period-${product}`,
        product,
        currentPrice: curAvg,
        previousPrice: prevAvg,
        pctChange: pct,
        currentQty: cur.reduce((s, p) => s + p.qty, 0),
        previousQty: prev.reduce((s, p) => s + p.qty, 0),
        tone: pct > 10 ? 'bad' : pct > 5 ? 'warn' : 'good',
        detail: pct > 0
          ? `+${pct.toFixed(1)}% vs période précédente (${fmtPct(curAvg, prevAvg)}).`
          : `${pct.toFixed(1)}% vs période précédente — prix en baisse.`,
      });
    }
  });

  const supplierByProduct = new Map();
  purchases.forEach((p) => {
    const key = p.product;
    const map = supplierByProduct.get(key) || new Map();
    const row = map.get(p.supplier) || { supplier: p.supplier, totalKg: 0, totalAmount: 0, count: 0 };
    row.totalKg += p.qty;
    row.totalAmount += p.amount;
    row.count += 1;
    map.set(p.supplier, row);
    supplierByProduct.set(key, map);
  });

  const supplierRankings = [];
  const supplierAlerts = [];
  supplierByProduct.forEach((map, product) => {
    const rows = [...map.values()]
      .map((row) => ({
        ...row,
        avgPricePerKg: row.totalKg > 0 ? row.totalAmount / row.totalKg : 0,
      }))
      .filter((row) => row.avgPricePerKg > 0)
      .sort((a, b) => a.avgPricePerKg - b.avgPricePerKg);
    if (rows.length < 2) return;
    supplierRankings.push({ product, rows });
    const best = rows[0];
    const worst = rows[rows.length - 1];
    const spread = worst.avgPricePerKg > 0 ? ((worst.avgPricePerKg - best.avgPricePerKg) / best.avgPricePerKg) * 100 : 0;
    if (spread >= 5) {
      supplierAlerts.push({
        id: `feed-supplier-${product}`,
        product,
        bestSupplier: best.supplier,
        bestPrice: best.avgPricePerKg,
        compareSupplier: worst.supplier,
        comparePrice: worst.avgPricePerKg,
        spreadPct: spread,
        tone: spread > 15 ? 'bad' : 'warn',
        detail: `${best.supplier} (${Math.round(best.avgPricePerKg)} F/kg) vs ${worst.supplier} (${Math.round(worst.avgPricePerKg)} F/kg) — écart ${spread.toFixed(0)}%.`,
      });
    }
  });

  return { purchases, periodAlerts, supplierRankings, supplierAlerts };
}

function fmtPct(cur, prev) {
  return `${Math.round(cur)} vs ${Math.round(prev)} FCFA/kg`;
}

function interventionKey(row = {}) {
  return low(row.type_intervention || row.type || row.nom || row.medicament || 'intervention');
}

function interventionLabel(row = {}) {
  return row.nom || row.type_intervention || row.type || row.medicament || 'Intervention';
}

function vetNameOf(row = {}, veterinaires = []) {
  if (row.vet) return row.vet;
  const match = arr(veterinaires).find((v) => String(v.id) === String(row.vet_id || row.veterinaire_id));
  return match?.nom || match?.name || 'Vétérinaire non renseigné';
}

function healthCost(row = {}) {
  return n(row.cout ?? row.cout_intervention ?? row.montant ?? row.amount ?? row.montant_total);
}

function isHealthDone(row = {}) {
  const st = low(row.statut || row.status);
  return Boolean(row.effectuee) || ['fait', 'realise', 'réalisé', 'termine', 'terminé', 'done'].some((x) => st.includes(x));
}

function recoveryDaysOf(row = {}) {
  const parsed = String(row.duree_traitement || '').match(/(\d+)/);
  if (parsed) return n(parsed[1]);
  const start = row.effectuee || row.date || row.prevue;
  const end = row.prochain_controle || row.prochaine_date_calculee || row.prochaine_action;
  const diff = daysBetweenDates(start, end);
  if (diff !== null && diff > 0) return diff;
  if (low(row.statut_sante_apres) === 'sain' && start) return 1;
  return null;
}

function buildVetComparisons({ sante = [], veterinaires = [] }) {
  const records = arr(sante)
    .filter((row) => isHealthDone(row) && healthCost(row) > 0)
    .map((row) => ({
      id: row.id,
      key: interventionKey(row),
      label: interventionLabel(row),
      vet: vetNameOf(row, veterinaires),
      cost: healthCost(row),
      recoveryDays: recoveryDaysOf(row),
      target: row.target_summary || row.animal || row.related_id || '—',
      recovered: low(row.statut_sante_apres) === 'sain',
      date: row.effectuee || row.date || row.prevue,
    }));

  const byType = new Map();
  records.forEach((row) => {
    const bucket = byType.get(row.key) || [];
    bucket.push(row);
    byType.set(row.key, bucket);
  });

  const rankings = [];
  const insights = [];

  byType.forEach((rows, key) => {
    const vetMap = new Map();
    rows.forEach((row) => {
      const prev = vetMap.get(row.vet) || { vet: row.vet, costs: [], recoveries: [], count: 0, recovered: 0 };
      prev.costs.push(row.cost);
      if (row.recoveryDays !== null) prev.recoveries.push(row.recoveryDays);
      if (row.recovered) prev.recovered += 1;
      prev.count += 1;
      vetMap.set(row.vet, prev);
    });
    const vetRows = [...vetMap.values()]
      .map((row) => ({
        ...row,
        avgCost: row.costs.length ? row.costs.reduce((s, v) => s + v, 0) / row.costs.length : 0,
        avgRecovery: row.recoveries.length ? row.recoveries.reduce((s, v) => s + v, 0) / row.recoveries.length : null,
        recoveryRate: row.count ? (row.recovered / row.count) * 100 : 0,
      }))
      .filter((row) => row.avgCost > 0)
      .sort((a, b) => a.avgCost - b.avgCost);

    if (vetRows.length < 2) return;
    rankings.push({ interventionKey: key, label: rows[0]?.label || key, vets: vetRows });

    const best = vetRows[0];
    const compare = vetRows[vetRows.length - 1];
    const costSave = compare.avgCost > 0 ? ((compare.avgCost - best.avgCost) / compare.avgCost) * 100 : 0;
    const faster = best.avgRecovery !== null && compare.avgRecovery !== null && compare.avgRecovery > best.avgRecovery
      ? compare.avgRecovery - best.avgRecovery
      : null;

    if (costSave >= 5 || (faster !== null && faster >= 2)) {
      insights.push({
        id: `vet-${key}`,
        intervention: rows[0]?.label || key,
        bestVet: best.vet,
        bestCost: best.avgCost,
        bestRecovery: best.avgRecovery,
        compareVet: compare.vet,
        compareCost: compare.avgCost,
        compareRecovery: compare.avgRecovery,
        costSavePct: costSave,
        recoveryGainDays: faster,
        tone: costSave > 20 ? 'good' : 'warn',
        detail: [
          costSave >= 5 ? `${best.vet} ~${costSave.toFixed(0)}% moins cher que ${compare.vet} pour la même intervention.` : null,
          faster !== null && faster >= 2 ? `Rétablissement ~${Math.round(faster)} j plus rapide (${Math.round(best.avgRecovery)} j vs ${Math.round(compare.avgRecovery)} j).` : null,
        ].filter(Boolean).join(' '),
      });
    }
  });

  return { records, rankings, insights };
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
  const fournisseurs = arr(props.fournisseurs);
  const veterinaires = arr(props.veterinaires);

  const lotRentabilite = buildLotRentabilite({ lots, alimentationLogs, productionLogs, salesOrders, payments, healthEvents, directCharges });
  const animalRentabilite = buildAnimalRentabilite({ animaux, alimentationLogs, salesOrders, vaccins: healthEvents, healthEvents, directCharges });
  const supplierRanking = buildSupplierRanking(lotRentabilite, animalRentabilite);
  const efficacite = buildEfficacite({ lots, animaux, alimentationLogs, productionLogs });
  const flux = buildFlux({ lots, animaux, alimentationLogs, stocks });
  const maraichage = buildMaraichage({ lots, animaux, marketPrices });
  const graphiques = buildGraphiquesData({ lots, animaux, alimentationLogs, productionLogs, stocks, flux, marketPrices });
  const comparatifs = {
    aliments: buildFeedComparisons({ alimentationLogs, fournisseurs }),
    veterinaires: buildVetComparisons({ sante: healthEvents, veterinaires }),
  };

  const alertCounts = {
    rentabilite: lotRentabilite.filter((r) => r.tone === 'bad').length + animalRentabilite.filter((r) => r.tone === 'bad').length,
    efficacite: efficacite.icAlerts.length + efficacite.layingAlerts.filter((a) => a.tone === 'bad').length + efficacite.gmqAlerts.filter((a) => a.tone === 'bad').length + comparatifs.veterinaires.insights.filter((i) => i.tone === 'good').length,
    flux: flux.stockAutonomy.filter((s) => s.tone === 'bad').length + flux.materialBalance.filter((m) => m.tone === 'bad').length + comparatifs.aliments.periodAlerts.filter((a) => a.tone !== 'good').length,
    maraichage: 0,
  };

  return {
    rentabilite: { lots: lotRentabilite, animaux: animalRentabilite, supplierRanking },
    efficacite,
    flux,
    maraichage,
    graphiques,
    comparatifs,
    alertCounts,
  };
}
