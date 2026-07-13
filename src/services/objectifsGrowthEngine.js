import { daysBetween, normalizeWeightHistory } from './avicoleLivingTargets.js';
import { calculateAnimalCost } from '../utils/costEngine.js';
import { avicoleActiveCount } from '../utils/avicoleMetrics.js';
import { filterLotsByActivity } from '../utils/avicoleActivity.js';
import { SANITARY_VACUUM_DAYS, SOUCHE_REFERENTIAL } from '../config/soucheReferential.js';
import {
  buildAnimauxPivotContexts,
  buildLotsPivotContexts,
  getAgeDays,
  getAgeWeeks,
  getPivotDate,
} from './objectifsPivotEngine.js';
import { theoreticalGmq, theoreticalLayingPct, resolveSoucheCode } from '../config/soucheReferential.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const safeDiv = (a, b) => (b > 0 ? a / b : 0);
const todayIso = () => new Date().toISOString().slice(0, 10);
const lotLabel = (lot = {}) => lot.name || lot.nom || lot.code || lot.id || 'Lot';
const animalLabel = (a = {}) => a.name || a.nom || a.numero || a.id || 'Animal';
const buildingOf = (row = {}) => row.batiment || row.nom_batiment || row.logement || row.site || 'Bâtiment non renseigné';
const logDate = (row = {}) => String(row.date || row.event_date || row.created_at || row.date_realisation || '').slice(0, 10);
const lotIdOf = (row = {}) => String(row.lot_id || row.cible_id || row.entity_id || row.related_id || '');
const animalIdOf = (row = {}) => String(row.animal_id || row.cible_id || row.entity_id || row.related_id || '');
const eggs = (log = {}) => n(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
const amount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.montant_paye);
const isExpense = (row = {}) => low(row.type || row.categorie || '').includes('sortie') || low(row.type || row.categorie || '').includes('charge') || low(row.type || row.categorie || '').includes('depense');
const isRevenue = (row = {}) => low(row.type || row.categorie || '').includes('entree') || low(row.type || row.categorie || '').includes('recette') || low(row.type || row.categorie || '').includes('vente');
const FEED_PATTERNS = ['aliment', 'provende', 'feed', 'mais', 'son'];


function toneFromDeviationPct(devPct) {
  if (devPct >= -1.9) return 'good';
  if (devPct >= -4.9) return 'warn';
  return 'bad';
}

function gmqToneFromDeviation(devPct) {
  if (devPct >= -2) return 'good';
  if (devPct >= -6) return 'warn';
  return 'bad';
}

function feedPricePerKg(stocks = []) {
  const feeds = arr(stocks).filter((s) => FEED_PATTERNS.some((p) => low(`${s.nom || ''} ${s.produit || ''}`).includes(p)));
  if (!feeds.length) return 185;
  const totalQty = feeds.reduce((s, f) => s + n(f.quantite ?? f.quantity), 0);
  const totalVal = feeds.reduce((s, f) => s + n(f.valeur ?? f.valeur_stock ?? f.prix_unitaire ?? f.unit_price) * n(f.quantite ?? f.quantity), 0);
  return totalQty > 0 ? totalVal / totalQty : n(feeds[0]?.prix_unitaire ?? feeds[0]?.unit_price ?? 185);
}

function dailyFeedKgForLot(lot, alimentationLogs = []) {
  const logs = arr(alimentationLogs).filter((log) => lotIdOf(log) === String(lot.id));
  if (!logs.length) {
    const birds = avicoleActiveCount(lot);
    const gPerBird = n(lot.aliment_g_par_poule ?? lot.feed_g_per_bird_day) || (low(lot.type).includes('ponde') ? 115 : 100);
    return (birds * gPerBird) / 1000;
  }
  const recent = logs.slice(-14);
  const total = recent.reduce((s, log) => s + n(log.quantite ?? log.quantity), 0);
  const days = new Set(recent.map(logDate).filter(Boolean)).size || 1;
  return total / days;
}

function correlateRedZone({ lotId, animalId, alimentationLogs = [], sante = [], achats = [], days = 5 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString().slice(0, 10);
  const hits = [];
  arr(alimentationLogs).forEach((log) => {
    const d = logDate(log);
    if (d >= sinceIso && (lotIdOf(log) === String(lotId) || !lotId)) {
      hits.push(`Livraison aliment ${log.produit || log.product || 'aliment'} le ${d}${log.fournisseur ? ` (${log.fournisseur})` : ''}`);
    }
  });
  arr(achats).forEach((row) => {
    const d = logDate(row);
    if (d >= sinceIso && FEED_PATTERNS.some((p) => low(`${row.produit || ''} ${row.libelle || ''}`).includes(p))) {
      hits.push(`Achat aliment ${row.produit || row.libelle || 'intrant'} le ${d}${row.fournisseur ? ` (${row.fournisseur})` : ''}`);
    }
  });
  arr(sante).forEach((row) => {
    const d = logDate(row);
    const match = lotId ? lotIdOf(row) === String(lotId) : animalIdOf(row) === String(animalId);
    if (d >= sinceIso && match) {
      hits.push(`Passage ${row.veterinaire || row.veto || 'vétérinaire'} le ${d} · ${row.type_soin || row.type_intervention || 'intervention'}`);
    }
  });
  return hits.slice(0, 4);
}

function layingRateForDay(lot, productionLogs = [], day = todayIso()) {
  const birds = avicoleActiveCount(lot);
  if (!birds) return { realRate: 0, eggs: 0 };
  const logs = arr(productionLogs).filter((log) => lotIdOf(log) === String(lot.id) || !lotIdOf(log));
  const dayLogs = logs.filter((log) => {
    const start = logDate(log);
    const end = String(log.date_fin || log.end_date || start).slice(0, 10);
    return day >= start && day <= end;
  });
  const totalEggs = dayLogs.reduce((s, log) => s + eggs(log), 0) || logs.filter((log) => logDate(log) === day).reduce((s, log) => s + eggs(log), 0);
  return { realRate: safeDiv(totalEggs, birds) * 100, eggs: totalEggs, birds };
}

function buildPondeuseRows({ lots, productionLogs, alimentationLogs, sante, achats }) {
  return filterLotsByActivity(lots, 'Pondeuse').map((lot) => {
    const pivot = buildLotsPivotContexts([lot])[0];
    const code = resolveSoucheCode(lot);
    const theoretical = theoreticalLayingPct(code, pivot.ageWeeks);
    const { realRate, birds } = layingRateForDay(lot, productionLogs);
    const deviation = realRate - theoretical;
    const devPct = theoretical > 0 ? (deviation / theoretical) * 100 : 0;
    const tone = toneFromDeviationPct(devPct);
    let message = 'Ponte conforme au standard souche.';
    if (tone === 'warn') message = 'Vérifier litière et eau';
    if (tone === 'bad') message = 'Protocole corrélation activé';
    const correlations = tone === 'bad' ? correlateRedZone({ lotId: lot.id, alimentationLogs, sante, achats }) : [];
    const correlationText = correlations.length
      ? `Alerte : Chute suite à ${correlations.join(' / ')}`
      : tone === 'bad' ? 'Alerte : écart ≥ 5% — contrôler alimentation et santé récentes.' : null;
    return {
      id: lot.id,
      label: lotLabel(lot),
      souche: pivot.soucheLabel,
      pivotDate: pivot.pivotDate,
      ageWeeks: pivot.ageWeeks,
      birds,
      realRate,
      theoretical,
      deviation,
      devPct,
      tone,
      message,
      correlationText,
      correlations,
    };
  });
}

function buildChairBovinRows({ lots, animaux, alimentationLogs, sante, stocks }) {
  const rows = [];
  const feedPrice = feedPricePerKg(stocks);

  filterLotsByActivity(lots, 'Chair').forEach((lot) => {
    const code = resolveSoucheCode(lot);
    const ageDays = getAgeDays(lot);
    const theoretical = theoreticalGmq(code, ageDays);
    const history = normalizeWeightHistory(lot);
    const last = history[history.length - 1];
    const prev = history.length >= 2 ? history[history.length - 2] : null;
    const elapsed = prev && last ? Math.max(1, daysBetween(prev.date, last.date)) : Math.max(1, ageDays);
    const realGmq = prev && last ? ((last.poids - prev.poids) * 1000) / elapsed : n(lot.gain_reel_jour) * 1000 || 0;
    const deviation = realGmq - theoretical;
    const devPct = theoretical > 0 ? (deviation / theoretical) * 100 : 0;
    const tone = gmqToneFromDeviation(devPct);
    const dailyFeed = dailyFeedKgForLot(lot, alimentationLogs);
    const delayDays = tone === 'bad' && theoretical > 0 && realGmq > 0
      ? Math.max(1, Math.round((theoretical - realGmq) / Math.max(1, theoretical / Math.max(1, 45 - ageDays))))
      : 0;
    const surcout = tone === 'bad' ? delayDays * dailyFeed * feedPrice : 0;
    rows.push({
      id: lot.id,
      label: lotLabel(lot),
      kind: 'Chair',
      souche: SOUCHE_REFERENTIAL[code]?.label || 'Cobb 500',
      pivotDate: getPivotDate(lot),
      ageDays,
      realGmq,
      theoretical,
      devPct,
      tone,
      message: tone === 'warn' ? 'Croissance légèrement en retard' : tone === 'bad' ? 'Retard significatif — surcoût estimé' : 'GMQ conforme',
      surcout,
      delayDays,
      correlations: tone === 'bad' ? correlateRedZone({ lotId: lot.id, alimentationLogs, sante }) : [],
    });
  });

  arr(animaux).filter((a) => low(`${a.type || ''} ${a.espece || ''}`).includes('bovin')).forEach((animal) => {
    const code = resolveSoucheCode(animal);
    const ageDays = getAgeDays(animal);
    const theoretical = theoreticalGmq(code, ageDays);
    const cost = calculateAnimalCost({ animal, alimentationLogs });
    const realGmq = cost.gmq || 0;
    const deviation = realGmq - theoretical;
    const devPct = theoretical > 0 ? (deviation / theoretical) * 100 : 0;
    const tone = gmqToneFromDeviation(devPct);
    const dailyFeed = safeDiv(cost.realFeedCost || cost.estimatedFeedCost, Math.max(1, cost.elapsedDays));
    const delayDays = tone === 'bad' && theoretical > 0 && realGmq > 0 ? Math.max(1, Math.round((theoretical - realGmq) / 20)) : 0;
    const surcout = tone === 'bad' ? delayDays * dailyFeed * feedPrice : 0;
    rows.push({
      id: animal.id,
      label: animalLabel(animal),
      kind: 'Embouche',
      souche: SOUCHE_REFERENTIAL[code]?.label || 'Goba',
      pivotDate: getPivotDate(animal),
      ageDays,
      realGmq,
      theoretical,
      devPct,
      tone,
      message: tone === 'warn' ? 'GMQ sous la cible souche' : tone === 'bad' ? 'Retard embouche — surcoût aliment' : 'Embouche conforme',
      surcout,
      delayDays,
      correlations: tone === 'bad' ? correlateRedZone({ animalId: animal.id, alimentationLogs, sante }) : [],
    });
  });

  return rows;
}

function buildMaraichageRows(cultures = []) {
  return arr(cultures).map((culture) => {
    const surface = n(culture.surface_m2 ?? culture.surface ?? culture.superficie);
    const harvested = n(culture.quantite_recoltee ?? culture.recolte_kg ?? culture.harvest_kg);
    const targetYield = n(culture.rendement_cible_kg_m2 ?? culture.target_yield ?? culture.rendement_objectif ?? 0);
    const realYield = safeDiv(harvested, surface);
    const deviation = targetYield > 0 ? ((realYield - targetYield) / targetYield) * 100 : 0;
    const tone = deviation >= -5 ? 'good' : deviation >= -15 ? 'warn' : 'bad';
    return {
      id: culture.id,
      label: culture.nom || culture.name || culture.culture || culture.id,
      surface,
      harvested,
      targetYield,
      realYield,
      deviation,
      tone,
      mode: surface > 0 ? 'actif' : 'veille',
    };
  });
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildBreakEven({ transactions = [], salesOrders = [], marketPrices = [] }) {
  const now = new Date();
  const day = now.getDate();
  const useCurrentMonth = day >= 28;
  const refMonth = monthKey(now);
  const tx = arr(transactions);
  const revenue = tx.filter((row) => monthKey(new Date(row.date || row.created_at)) === refMonth && isRevenue(row)).reduce((s, row) => s + amount(row), 0)
    + arr(salesOrders).filter((row) => String(row.date_commande || row.created_at || '').slice(0, 7) === refMonth).reduce((s, row) => s + amount(row), 0);
  const variable = tx.filter((row) => monthKey(new Date(row.date || row.created_at)) === refMonth && isExpense(row)).filter((row) => {
    const cat = low(`${row.categorie || ''} ${row.libelle || ''}`);
    return cat.includes('aliment') || cat.includes('intrant') || cat.includes('commission') || cat.includes('transport');
  }).reduce((s, row) => s + amount(row), 0);
  const fixed = tx.filter((row) => monthKey(new Date(row.date || row.created_at)) === refMonth && isExpense(row)).filter((row) => {
    const cat = low(`${row.categorie || ''} ${row.libelle || ''}`);
    return cat.includes('salaire') || cat.includes('electric') || cat.includes('amort') || cat.includes('loyer') || cat.includes('maintenance');
  }).reduce((s, row) => s + amount(row), 0) || Math.max(0, tx.filter(isExpense).reduce((s, row) => s + amount(row), 0) * 0.35);
  const mcvRate = revenue > 0 ? safeDiv(revenue - variable, revenue) : 0;
  const breakEven = mcvRate > 0 ? fixed / mcvRate : 0;
  const eggPrice = n(marketPrices.find((p) => low(p.product_name || p.produit || '').includes('oeuf'))?.price_fcfa ?? 2500);
  const meatPrice = n(marketPrices.find((p) => low(p.product_name || p.produit || '').includes('poulet'))?.price_fcfa ?? 3200);
  const eggsNeeded = eggPrice > 0 ? Math.ceil(breakEven / (eggPrice * 30)) : 0;
  const meatKgNeeded = meatPrice > 0 ? Math.ceil(breakEven / meatPrice) : 0;
  return {
    recalculatedOnDay28: useCurrentMonth,
    month: refMonth,
    revenue,
    variable,
    fixed,
    mcvRate,
    breakEven,
    eggsNeeded,
    meatKgNeeded,
    businessText: breakEven > 0
      ? `Pour couvrir vos charges ce mois-ci, vous devez vendre au minimum ${eggsNeeded.toLocaleString('fr-FR')} plaquettes d'œufs ou ${meatKgNeeded.toLocaleString('fr-FR')} kg de viande.`
      : 'Complétez ventes et charges pour calculer le point mort du mois.',
  };
}

function buildCapacityAlerts(lots = []) {
  const alerts = [];
  const byBuilding = new Map();
  arr(lots).forEach((lot) => {
    const b = buildingOf(lot);
    const entry = byBuilding.get(b) || { building: b, lots: [] };
    entry.lots.push(lot);
    byBuilding.set(b, entry);
  });
  byBuilding.forEach(({ building, lots: buildingLots }) => {
    buildingLots.forEach((lot, index) => {
      const exitDate = lot.date_sortie_prevue || lot.date_fin_prevue || lot.date_sortie;
      if (!exitDate) return;
      const freeDate = new Date(exitDate);
      freeDate.setDate(freeDate.getDate() + SANITARY_VACUUM_DAYS);
      buildingLots.slice(index + 1).forEach((next) => {
        const nextStart = getPivotDate(next);
        if (!nextStart) return;
        if (new Date(nextStart) < freeDate) {
          alerts.push({
            id: `${building}-${lot.id}-${next.id}`,
            building,
            lot: lotLabel(lot),
            nextLot: lotLabel(next),
            exitDate,
            freeDate: freeDate.toISOString().slice(0, 10),
            nextStart,
            message: `Erreur : Capacité saturée sur le Bâtiment ${building} — vide sanitaire ${SANITARY_VACUUM_DAYS} j non respecté.`,
            tone: 'bad',
          });
        }
      });
    });
  });
  return alerts;
}

export function validateBuildingCapacityForChickOrder({ lots = [], building, plannedStartDate }) {
  if (!building || !plannedStartDate) return { ok: true };
  const conflicts = buildCapacityAlerts(lots).filter((a) => a.building === building && a.nextStart === plannedStartDate);
  if (conflicts.length) return { ok: false, message: conflicts[0].message, alerts: conflicts };

  const planned = new Date(plannedStartDate);
  for (const lot of arr(lots)) {
    if (buildingOf(lot) !== building) continue;
    const exitDate = lot.date_sortie_prevue || lot.date_fin_prevue || lot.date_sortie || lot.date_fin_reelle;
    if (!exitDate) continue;
    const freeDate = new Date(exitDate);
    freeDate.setDate(freeDate.getDate() + SANITARY_VACUUM_DAYS);
    if (planned < freeDate) {
      return {
        ok: false,
        message: `Erreur : Capacité saturée sur le Bâtiment ${building} — vide sanitaire ${SANITARY_VACUUM_DAYS} j non respecté (libre après ${freeDate.toISOString().slice(0, 10)}).`,
        alerts: conflicts,
      };
    }
  }
  return { ok: true };
}

export function simulateSandboxBreakEven(breakEvenBase = {}, sandbox = {}) {
  const surface = n(sandbox.surfaceM2);
  const seedCost = n(sandbox.seedCost);
  const salaries = n(sandbox.salaries);
  const extraFixed = seedCost + salaries + surface * n(sandbox.costPerM2);
  const fixed = breakEvenBase.fixed + extraFixed;
  const mcvRate = breakEvenBase.mcvRate || 0.4;
  const breakEven = mcvRate > 0 ? fixed / mcvRate : 0;
  const delta = breakEven - (breakEvenBase.breakEven || 0);
  return {
    ...breakEvenBase,
    fixed,
    breakEven,
    delta,
    sandboxSurface: surface,
    businessText: breakEven > 0
      ? `Avec le maraîchage simulé (${surface} m²), le point mort monte à ${Math.round(breakEven).toLocaleString('fr-FR')} FCFA (+${Math.round(delta).toLocaleString('fr-FR')} FCFA).`
      : breakEvenBase.businessText,
  };
}

function buildChartData({ lots, productionLogs, animaux, alimentationLogs, transactions, salesOrders, breakEven }) {
  const pondeuses = filterLotsByActivity(lots, 'Pondeuse');
  const primaryLot = pondeuses[0];
  const code = primaryLot ? resolveSoucheCode(primaryLot) : 'novogen-brown';
  const g1 = Array.from({ length: 60 }, (_, week) => {
    const theoretical = theoreticalLayingPct(code, week + 18);
    let real = null;
    if (primaryLot) {
      const ageWeeks = getAgeWeeks(primaryLot);
      if (week + 18 === ageWeeks || Math.abs(week + 18 - ageWeeks) <= 1) {
        real = layingRateForDay(primaryLot, productionLogs).realRate;
      }
    }
    return { week: week + 18, theoretical, real };
  }).filter((row) => row.week <= 80);

  const g2 = [
    ...filterLotsByActivity(lots, 'Chair').map((lot) => {
      const codeLot = resolveSoucheCode(lot);
      const theoretical = theoreticalGmq(codeLot, getAgeDays(lot));
      const history = normalizeWeightHistory(lot);
      const last = history[history.length - 1];
      const prev = history.length >= 2 ? history[history.length - 2] : null;
      const realGmq = prev && last ? ((last.poids - prev.poids) * 1000) / Math.max(1, daysBetween(prev.date, last.date)) : 0;
      const devPct = theoretical > 0 ? ((realGmq - theoretical) / theoretical) * 100 : 0;
      return { id: lotLabel(lot), devPct, tone: devPct >= -5 ? 'good' : 'bad' };
    }),
    ...arr(animaux).slice(0, 6).map((animal) => {
      const codeA = resolveSoucheCode(animal);
      const theoretical = theoreticalGmq(codeA, getAgeDays(animal));
      const cost = calculateAnimalCost({ animal, alimentationLogs });
      const devPct = theoretical > 0 ? ((cost.gmq - theoretical) / theoretical) * 100 : 0;
      return { id: animalLabel(animal), devPct, tone: devPct >= -5 ? 'good' : 'bad' };
    }),
  ];

  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    const ca = arr(transactions).filter((row) => monthKey(new Date(row.date || row.created_at)) === key && isRevenue(row)).reduce((s, row) => s + amount(row), 0)
      + arr(salesOrders).filter((row) => String(row.date_commande || row.created_at || '').slice(0, 7) === key).reduce((s, row) => s + amount(row), 0);
    months.push({ month: key, revenue: ca, breakEven: breakEven.breakEven || 0 });
  }

  const g4 = [];
  const buildings = [...new Set(arr(lots).map(buildingOf))];
  buildings.forEach((building) => {
    arr(lots).filter((lot) => buildingOf(lot) === building).forEach((lot) => {
      const start = getPivotDate(lot);
      const end = lot.date_sortie_prevue || lot.date_fin_prevue || lot.date_sortie;
      const vacuumEnd = end ? (() => { const d = new Date(end); d.setDate(d.getDate() + SANITARY_VACUUM_DAYS); return d.toISOString().slice(0, 10); })() : null;
      g4.push({ building, lot: lotLabel(lot), start, end, vacuumEnd, status: avicoleActiveCount(lot) > 0 ? 'occupied' : end ? 'vacuum' : 'empty' });
    });
  });

  return { g1, g2, g3: months, g4 };
}

export function buildObjectifsCroissanceData(props = {}) {
  const lots = arr(props.lots);
  const animaux = arr(props.animaux);
  const productionLogs = arr(props.productionLogs);
  const alimentationLogs = arr(props.alimentationLogs);
  const sante = arr(props.sante);
  const cultures = arr(props.cultures);
  const stocks = arr(props.stocks);
  const transactions = arr(props.transactions || props.transactionsAll);
  const salesOrders = arr(props.salesOrders || props.salesOrdersAll);
  const achats = arr(props.achats || props.alimentationLogs);
  const marketPrices = arr(props.marketPrices);

  const zootechnie = {
    pondeuses: buildPondeuseRows({ lots, productionLogs, alimentationLogs, sante, achats }),
    croissance: buildChairBovinRows({ lots, animaux, alimentationLogs, sante, stocks }),
    maraichage: buildMaraichageRows(cultures),
    pivotSummary: buildLotsPivotContexts(lots).concat(buildAnimauxPivotContexts(animaux)),
  };

  const breakEven = buildBreakEven({ transactions, salesOrders, stocks, marketPrices });
  const economie = {
    breakEven,
    capacityAlerts: buildCapacityAlerts(lots),
    sandboxDefaults: { surfaceM2: 500, seedCost: 250000, salaries: 180000, costPerM2: 1200 },
  };

  const graphiques = buildChartData({ lots, productionLogs, animaux, alimentationLogs, transactions, salesOrders, breakEven });

  const alertCounts = {
    zootechnie: zootechnie.pondeuses.filter((r) => r.tone !== 'good').length + zootechnie.croissance.filter((r) => r.tone !== 'good').length,
    economie: economie.capacityAlerts.length + (breakEven.breakEven > breakEven.revenue ? 1 : 0),
  };

  return { zootechnie, economie, graphiques, alertCounts };
}
