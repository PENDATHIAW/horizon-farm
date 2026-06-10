import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine.js';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../utils/avicoleMetrics.js';
import { buildBovinKpis, buildChairKpis, isBovinAnimal, isCaprinAnimal, isChairLot, isOvinAnimal, isPondeuseLot } from './elevageActivityPnl.js';
import { summarizeProductionStock } from './productionStockCatalog.js';
import { isSaleReady } from './saleReadiness.js';
import { tabletsFromEggs } from './elevageWorkflow.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

const weekAgo = () => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const isClosedAnimal = (row = {}) =>
  ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((w) =>
    lower(row.status || row.statut).includes(w));

const isChairReady = (lot = {}, productionLogs = []) => {
  if (!avicoleHasActiveBirds(lot)) return false;
  const decision = buildAvicoleLotDecision(lot, productionLogs);
  const progress = n(decision?.progress);
  return isSaleReady(lot) || (isChairLot(lot) && progress >= 100);
};

const isTransformRow = (row = {}) => {
  const kind = lower(row.kind || row.kindLabel || '');
  return ['abattage', 'transformation', 'reforme', 'viande'].some((k) => kind.includes(k))
    || /abattage|transformation|viande/.test(lower(`${row.event_type || ''} ${row.title || ''} ${row.type_evenement || ''}`));
};

export function buildProductionHubSnapshot({
  lots = [],
  animaux = [],
  productionLogs = [],
  stocks = [],
  transformationRows = [],
  documents = [],
  opportunities = [],
  marginContext = {},
} = {}) {
  const since = weekAgo();
  const periodLogs = arr(productionLogs).filter(
    (row) => String(row.date || row.created_at || '').slice(0, 10) >= since,
  );
  const eggsProduced = periodLogs.reduce((s, row) => s + n(row.oeufs_produits ?? row.eggs_count ?? row.oeufs), 0);
  const eggsBroken = periodLogs.reduce((s, row) => s + n(row.oeufs_casses ?? row.broken_eggs), 0);
  const eggsSellable = Math.max(0, eggsProduced - eggsBroken);
  const tabletEst = tabletsFromEggs(eggsSellable);

  const stockSummary = summarizeProductionStock(stocks);
  const meatStockQty = stockSummary.viande_avicole.qty + stockSummary.viande_animale.qty;

  const pondeuseLots = arr(lots).filter(isPondeuseLot);
  const chairLots = arr(lots).filter(isChairLot).filter(avicoleHasActiveBirds);
  const chairReady = chairLots.filter((lot) => isChairReady(lot, productionLogs));
  const chairKpis = chairLots.slice(0, 5).map((lot) => buildChairKpis(lot, marginContext));

  const activeBovins = arr(animaux).filter((a) => isBovinAnimal(a) && !isClosedAnimal(a));
  const bovinKpis = activeBovins.map((animal) => buildBovinKpis(animal, marginContext));
  const bovinsNearTarget = bovinKpis.filter((k) => k.readyToSell || (k.targetWeight > 0 && k.weight >= k.targetWeight * 0.9));

  const activeOvins = arr(animaux).filter((a) => isOvinAnimal(a) && !isClosedAnimal(a));
  const ovinKpis = activeOvins.map((animal) => buildBovinKpis(animal, marginContext));
  const ovinsNearTarget = ovinKpis.filter((k) => k.readyToSell || (k.targetWeight > 0 && k.weight >= k.targetWeight * 0.9));

  const activeCaprins = arr(animaux).filter((a) => isCaprinAnimal(a) && !isClosedAnimal(a));
  const caprinKpis = activeCaprins.map((animal) => buildBovinKpis(animal, marginContext));
  const caprinsNearTarget = caprinKpis.filter((k) => k.readyToSell || (k.targetWeight > 0 && k.weight >= k.targetWeight * 0.9));

  const transformRecent = arr(transformationRows)
    .filter(isTransformRow)
    .slice(0, 6);
  const sanitaryDocs = arr(documents).filter((doc) =>
    /sanitaire|abattage|veterinaire|vétérinaire|certificat/.test(
      lower(`${doc.document_category || ''} ${doc.title || ''} ${doc.categorie || ''}`),
    ),
  ).slice(0, 3);

  const eggOpportunities = arr(opportunities).filter((opp) =>
    /oeuf|œuf|tablette|pondeuse/.test(lower(`${opp.title || ''} ${opp.source_type || ''} ${opp.produit || ''}`)),
  ).length;

  const chairWithWeight = chairKpis.filter((k) => k.avgWeight > 0);
  const avgChairWeight = chairWithWeight.length
    ? chairWithWeight.reduce((s, k) => s + n(k.avgWeight), 0) / chairWithWeight.length
    : 0;
  const avgChairMortality = chairLots.length
    ? chairLots.reduce((s, lot) => s + n(lot.mortality ?? lot.morts), 0) / chairLots.length
    : 0;

  return {
    eggs: {
      produced7d: eggsProduced,
      broken7d: eggsBroken,
      sellable7d: eggsSellable,
      tablettesEst: tabletEst.tablettes,
      oeufsRestants: tabletEst.oeufs_restants,
      ramassageCount: periodLogs.length,
      stockQty: stockSummary.oeufs.qty,
      stockLines: stockSummary.oeufs.lines,
      recentLogs: periodLogs.slice(0, 5),
      eggOpportunities,
    },
    chair: {
      activeLots: chairLots.length,
      readyLots: chairReady.length,
      readyList: chairReady.slice(0, 4).map((lot) => ({
        id: lot.id,
        name: lot.name || lot.nom || lot.id,
        effectif: avicoleActiveCount(lot),
        weight: n(lot.weight_avg ?? lot.poids_moyen ?? lot.poids),
      })),
      avgWeight: avgChairWeight,
      avgMortality: avgChairMortality,
      hasData: chairLots.length > 0,
    },
    bovins: {
      activeCount: activeBovins.length,
      nearTargetCount: bovinsNearTarget.length,
      nearTargetList: bovinsNearTarget.slice(0, 4),
      avgWeight: (() => {
        const withW = bovinKpis.filter((k) => k.weight > 0);
        return withW.length ? withW.reduce((s, k) => s + n(k.weight), 0) / withW.length : 0;
      })(),
      hasData: activeBovins.length > 0,
    },
    ovins: {
      activeCount: activeOvins.length,
      nearTargetCount: ovinsNearTarget.length,
      nearTargetList: ovinsNearTarget.slice(0, 4),
      avgWeight: (() => {
        const withW = ovinKpis.filter((k) => k.weight > 0);
        return withW.length ? withW.reduce((s, k) => s + n(k.weight), 0) / withW.length : 0;
      })(),
      hasData: activeOvins.length > 0,
    },
    caprins: {
      activeCount: activeCaprins.length,
      nearTargetCount: caprinsNearTarget.length,
      nearTargetList: caprinsNearTarget.slice(0, 4),
      avgWeight: (() => {
        const withW = caprinKpis.filter((k) => k.weight > 0);
        return withW.length ? withW.reduce((s, k) => s + n(k.weight), 0) / withW.length : 0;
      })(),
      hasData: activeCaprins.length > 0,
    },
    transformation: {
      recentCount: transformRecent.length,
      recent: transformRecent,
      meatStockKg: meatStockQty,
      meatStockLines: stockSummary.viande_avicole.lines + stockSummary.viande_animale.lines,
      sanitaryDocs,
      hasData: transformRecent.length > 0 || meatStockQty > 0,
    },
    meta: {
      pondeuseLots: pondeuseLots.length,
      totalRamassages: arr(productionLogs).length,
    },
  };
}
