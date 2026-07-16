/**
 * Moteur décisionnel stratégique Centre décisionnel :
 * QUAND VENDRE, QUAND LANCER, audit stock, BFR, ITH, calendrier religieux, effet ciseau.
 */

import { buildMarketEvents } from './growthDecisionEngine.js';
import { calculateAnimalCost } from '../utils/costEngine.js';
import { avicoleActiveCount, avicoleDeadCount, avicoleInitialCount } from '../utils/avicoleMetrics.js';
import { inferWorkshopFromLot } from './objectifsDecision/breedStockReferential.js';
import { buildLotPivotContext } from './objectifsDecision/datePivotEngine.js';
import { buildSanitaryVacuumAlerts } from './objectifsDecision/objectifsDecisionEngine.js';


const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const safeDiv = (a, b) => (b > 0 ? a / b : 0);
const iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const daysBetween = (a, b) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const BOVIN_CYCLE_DAYS = 90;
const BROILER_CYCLE_DAYS = 40;
const HEAT_FORECAST_THRESHOLD = 38;
const ITH_STRESS_THRESHOLD = 29;
const STOCK_AUDIT_THRESHOLD_PCT = 10;
const STOCK_AUDIT_CONSECUTIVE_DAYS = 3;
const BFR_MIN_COVERAGE_PCT = 50;

const FESTIVAL_LAUNCH_LINES = {
  tabaski: [
    { activity: 'bovins', cycleDays: BOVIN_CYCLE_DAYS, label: 'Bœufs / moutons', action: 'Acheter broutards ou finaliser les bêtes prêtes' },
    { activity: 'poulets_chair', cycleDays: BROILER_CYCLE_DAYS, label: 'Poulets de chair', action: 'Lancer la bande chair' },
    { activity: 'oeufs', cycleDays: 30, label: 'Œufs / tablettes', action: 'Monter précommandes et production œufs' },
  ],
  magal: [
    { activity: 'bovins', cycleDays: BOVIN_CYCLE_DAYS, label: 'Bœufs / moutons', action: 'Acheter broutards ou finaliser les bêtes prêtes' },
    { activity: 'poulets_chair', cycleDays: BROILER_CYCLE_DAYS, label: 'Poulets de chair', action: 'Lancer la bande chair' },
    { activity: 'oeufs', cycleDays: 30, label: 'Œufs / tablettes', action: 'Monter précommandes et production œufs' },
  ],
  gamou: [
    { activity: 'bovins', cycleDays: BOVIN_CYCLE_DAYS, label: 'Bœufs / moutons', action: 'Acheter broutards ou finaliser les bêtes prêtes' },
    { activity: 'poulets_chair', cycleDays: BROILER_CYCLE_DAYS, label: 'Poulets de chair', action: 'Lancer la bande chair' },
    { activity: 'oeufs', cycleDays: 30, label: 'Œufs / tablettes', action: 'Monter précommandes et production œufs' },
  ],
  korite: [
    { activity: 'poulets_chair', cycleDays: BROILER_CYCLE_DAYS, label: 'Poulets de chair', action: 'Lancer la bande chair' },
    { activity: 'oeufs', cycleDays: 30, label: 'Œufs / tablettes', action: 'Renforcer stock œufs et tablettes' },
  ],
  fin_annee: [
    { activity: 'poulets_chair', cycleDays: BROILER_CYCLE_DAYS, label: 'Poulets de chair', action: 'Lancer la bande chair' },
    { activity: 'oeufs', cycleDays: 30, label: 'Œufs / tablettes', action: 'Renforcer stock œufs' },
    { activity: 'bovins', cycleDays: BOVIN_CYCLE_DAYS, label: 'Bœufs / moutons', action: 'Vérifier bêtes prêtes à la vente' },
  ],
};

function speciesLabel(animal = {}) {
  const raw = norm(`${animal.type || ''} ${animal.espece || ''} ${animal.categorie || ''}`);
  if (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('vache') || raw.includes('veau')) return 'Bovin embouche';
  if (raw.includes('ovin') || raw.includes('mouton')) return 'Ovin';
  if (raw.includes('caprin') || raw.includes('chevre')) return 'Caprin';
  return 'Animal';
}

function animalDisplayName(animal = {}) {
  const base = animal.name || animal.nom || animal.tag || animal.id;
  const tag = animal.tag && String(animal.tag) !== String(base) ? ` (#${animal.tag})` : '';
  return `${speciesLabel(animal)} ${base}${tag}`;
}

function bandeDisplayName(lot = {}) {
  const workshop = inferWorkshopFromLot(lot);
  const base = lot.name || lot.nom || lot.id;
  if (workshop === 'pondeuses') return `Bande pondeuses ${base}`;
  if (workshop === 'poulets_chair') return `Bande chair ${base}`;
  return `Bande avicole ${base}`;
}

function hasActiveStockForLine(line = {}, dataMap = {}, eventDate = new Date()) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  if (line.activity === 'bovins') {
    return animaux.some((a) => norm(`${a.type || ''} ${a.espece || ''}`).includes('bovin')
      && daysBetween(a.date_entree || a.created_at, eventDate) >= line.cycleDays - 15);
  }
  if (line.activity === 'poulets_chair') {
    return lots.some((l) => inferWorkshopFromLot(l) === 'poulets_chair'
      && daysBetween(l.date_debut || l.date_entree || l.created_at, eventDate) >= line.cycleDays - 10);
  }
  if (line.activity === 'oeufs') {
    return lots.some((l) => {
      const label = norm(`${l.type || ''} ${l.name || ''} ${l.nom || ''}`);
      return (label.includes('pondeuse') || label.includes('oeuf')) && avicoleActiveCount(l) > 0;
    });
  }
  return false;
}

function festivalKeyFromEvent(event = {}) {
  const key = event.key || '';
  if (key) return key;
  const label = norm(event.label || '');
  if (label.includes('tabaski')) return 'tabaski';
  if (label.includes('magal')) return 'magal';
  if (label.includes('gamou')) return 'gamou';
  if (label.includes('korite')) return 'korite';
  if (label.includes('fin') && label.includes('annee')) return 'fin_annee';
  return '';
}

const FEED_PATTERNS = ['aliment', 'provende', 'feed', 'mais', 'son'];
const logDate = (r = {}) => String(r.date || r.event_date || r.created_at || '').slice(0, 10);
const lotIdOf = (r = {}) => String(r.lot_id || r.lot || r.cible_id || '');
const amount = (r = {}) => num(r.montant_total ?? r.total ?? r.amount ?? r.montant ?? r.montant_paye);
const buildingOf = (r = {}) => r.batiment || r.building || r.nom_batiment || 'Bâtiment';

function pilotageSettings(dataMap = {}) {
  const s = dataMap.growth_settings || {};
  return {
    sanitaryMinDays: num(s.sanitary_min_days) || 10,
    mortalityThresholdPct: num(s.mortality_threshold_pct) || 5,
    extraVacuumDays: num(s.extra_vacuum_days) || 7,
    bfrMinCoveragePct: num(s.bfr_min_coverage_pct) || BFR_MIN_COVERAGE_PCT,
    ithStressThreshold: num(s.ith_stress_threshold) || ITH_STRESS_THRESHOLD,
    vipClientIds: new Set(arr(s.vip_client_ids).map(String)),
  };
}



function feedStandardKgPerBird(workshop, ageDays) {
  if (workshop === 'pondeuses') return ageDays > 150 ? 0.135 : 0.110;
  if (workshop === 'poulets_chair') {
    if (ageDays <= 14) return 0.055;
    if (ageDays <= 28) return 0.095;
    return 0.120;
  }
  return 0.1;
}

function feedPricePerKg(stocks = [], defaultPrice = 185) {
  const feeds = arr(stocks).filter((s) => FEED_PATTERNS.some((p) => norm(`${s.nom || ''} ${s.categorie || ''}`).includes(p)));
  if (!feeds.length) return defaultPrice;
  const totalQty = feeds.reduce((s, f) => s + num(f.quantite ?? f.quantity), 0);
  const totalVal = feeds.reduce((s, f) => s + num(f.prix_unitaire ?? f.unit_price ?? 0) * num(f.quantite ?? f.quantity), 0);
  return totalQty > 0 ? totalVal / totalQty : defaultPrice;
}

/** Indice Température-Humidité simplifié (stress thermique volaille). */
export function computeITH(temperature, humidity) {
  const t = num(temperature);
  const h = num(humidity);
  return Math.round((t + (h / 100) * (t - 14.4)) * 10) / 10;
}

function smoothedGmqKg(animalOrLot, alimentationLogs = [], kind = 'bovin') {
  if (kind === 'bovin') {
    const cost = calculateAnimalCost({ animal: animalOrLot, alimentationLogs });
    return cost.gmq || 0;
  }
  const history = arr(animalOrLot.weight_history || animalOrLot.historique_poids);
  if (history.length >= 2) {
    const last3 = history.slice(-3);
    let totalGmq = 0;
    let count = 0;
    for (let i = 1; i < last3.length; i += 1) {
      const days = Math.max(1, daysBetween(last3[i - 1].date, last3[i].date));
      const g = ((num(last3[i].poids) - num(last3[i - 1].poids)) / days) * (num(last3[i].poids) < 10 ? 1000 : 1);
      totalGmq += g / 1000;
      count += 1;
    }
    if (count) return totalGmq / count;
  }
  const pivot = buildLotPivotContext(animalOrLot);
  const weightKg = num(animalOrLot.poids_moyen_actuel ?? animalOrLot.poids_moyen) / 1000;
  return pivot.ageDays > 0 ? weightKg / pivot.ageDays : 0;
}

function dailyFeedKgForEntity(entity, alimentationLogs = [], workshop) {
  const id = String(entity.id);
  const logs = arr(alimentationLogs).filter((l) => lotIdOf(l) === id || String(l.animal_id) === id);
  if (logs.length) {
    const recent = logs.slice(-7);
    const total = recent.reduce((s, l) => s + num(l.quantite ?? l.quantity), 0);
    const days = new Set(recent.map(logDate).filter(Boolean)).size || 1;
    return total / days;
  }
  const pivot = buildLotPivotContext(entity);
  const birds = avicoleActiveCount(entity) || 1;
  return birds * feedStandardKgPerBird(workshop || inferWorkshopFromLot(entity), pivot.ageDays);
}

/** 1. ALGORITHME QUAND VENDRE - loi des rendements décroissants. */
export function evaluateSellNowDecisions(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const marketPrices = arr(dataMap.market_prices || dataMap.marketPrices);
  const feedPrice = feedPricePerKg(stocks, options.feedPricePerKg ?? 185);

  const marketKgPrice = num(
    marketPrices.find((p) => norm(p.produit || p.product || '').includes('boeuf') || norm(p.produit || '').includes('viande'))?.prix
    ?? options.marketKgPrice
    ?? 3500,
  );

  const alerts = [];

  animaux.filter((a) => norm(`${a.type || ''} ${a.espece || ''}`).includes('bovin')).forEach((animal) => {
    const gmqSmoothed = smoothedGmqKg(animal, alimentationLogs, 'bovin');
    const priceKg = num(animal.prix_kg_marche ?? animal.prix_vente_kg ?? marketKgPrice);
    const gainValeurJour = gmqSmoothed * priceKg;
    const coutRationJour = dailyFeedKgForEntity(animal, alimentationLogs, 'bovins') * feedPrice;

    if (gmqSmoothed > 0 && coutRationJour > 0 && gainValeurJour < coutRationJour) {
      const displayName = animalDisplayName(animal);
      const item = {
        id: `sell-now-bovin-${animal.id}`,
        animalId: animal.id,
        entityId: animal.id,
        entityType: 'animal',
        lotId: animal.id,
        lotName: displayName,
        subjectLabel: displayName,
        type: 'bovins',
        activity: 'bovins',
        module: 'elevage',
        navModule: 'elevage',
        navTab: 'Animaux',
        openLabel: 'Ouvrir animal',
        status: `URGENCE VENTE - ${displayName}`,
        title: `URGENCE VENTE - ${displayName}`,
        gainValeurJour: Math.round(gainValeurJour),
        coutRationJour: Math.round(coutRationJour),
        gmqSmoothedKg: Math.round(gmqSmoothed * 1000) / 1000,
        priority: 'critique',
        message: `VENDRE MAINTENANT ${displayName}. Le gain de valeur viande du jour (${Math.round(gainValeurJour)} FCFA) est inférieur au coût de sa ration (${Math.round(coutRationJour)} FCFA). Rester en embouche vous fait perdre de l'argent.`,
      };
      console.warn('[evaluateSellNowDecisions]', item);
      alerts.push(item);
    }
  });

  lots.filter((l) => inferWorkshopFromLot(l) === 'poulets_chair').forEach((lot) => {
    const gmqSmoothed = smoothedGmqKg(lot, alimentationLogs, 'chair');
    const priceKg = num(lot.prix_vente_kg ?? marketKgPrice ?? 1900);
    const gainValeurJour = gmqSmoothed * avicoleActiveCount(lot) * priceKg;
    const coutRationJour = dailyFeedKgForEntity(lot, alimentationLogs, 'poulets_chair') * feedPrice;

    if (gmqSmoothed > 0 && coutRationJour > 0 && gainValeurJour < coutRationJour) {
      const displayName = bandeDisplayName(lot);
      const item = {
        id: `sell-now-chair-${lot.id}`,
        lotId: lot.id,
        entityId: lot.id,
        entityType: 'bande_chair',
        lotName: displayName,
        subjectLabel: displayName,
        type: 'poulets_chair',
        activity: 'poulets_chair',
        module: 'elevage',
        navModule: 'elevage',
        navTab: 'Avicole',
        openLabel: 'Ouvrir bande',
        status: `URGENCE VENTE - ${displayName}`,
        title: `URGENCE VENTE - ${displayName}`,
        gainValeurJour: Math.round(gainValeurJour),
        coutRationJour: Math.round(coutRationJour),
        priority: 'critique',
        message: `${displayName} consomme plus de valeur alimentaire (${Math.round(coutRationJour)} FCFA/j) qu'elle ne produit de valeur viande (${Math.round(gainValeurJour)} FCFA/j). Rentabilité négative. Vendre immédiatement.`,
      };
      console.warn('[evaluateSellNowDecisions]', item);
      alerts.push(item);
    }
  });

  console.info('[evaluateSellNowDecisions]', { alerts: alerts.length });
  return alerts;
}

/** 2. ALGORITHME QUAND LANCER - calendrier religieux, climat, ITH. */
export function evaluateLaunchTimingDecisions(dataMap = {}, options = {}) {
  const ps = pilotageSettings(dataMap);


  const meteo = options.meteo || dataMap.meteo || {};
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();


  const events = buildMarketEvents(refDate, dataMap);
  const alerts = [];
  const cycleDecisions = [];

  events.forEach((event) => {
    if (event.skipLaunch) return;
    const festKey = festivalKeyFromEvent(event);
    const lines = FESTIVAL_LAUNCH_LINES[festKey];
    if (!lines?.length) return;

    const eventDate = event.date;
    const activityLines = lines.map((line) => {
      const pivotDate = addDays(eventDate, -line.cycleDays);
      const pivotIso = iso(pivotDate);
      const daysUntilPivot = daysBetween(refDate, pivotDate);
      const hasActiveLot = hasActiveStockForLine(line, dataMap, eventDate);
      return {
        ...line,
        pivotDate: pivotIso,
        daysUntilPivot,
        hasActiveLot,
        priority: daysUntilPivot <= 0 && !hasActiveLot ? 'critique' : daysUntilPivot <= 14 ? 'haute' : 'moyenne',
      };
    });

    const missing = activityLines.filter((line) => !line.hasActiveLot && line.daysUntilPivot <= 14);
    const worst = activityLines.reduce((acc, line) => {
      const rank = { critique: 3, haute: 2, moyenne: 1 };
      return (rank[line.priority] || 0) > (rank[acc] || 0) ? line.priority : acc;
    }, 'moyenne');

    const lineMessages = activityLines.map((line) => {
      const suffix = line.daysUntilPivot <= 0 && !line.hasActiveLot
        ? `(date pivot ${line.pivotDate} dépassée - rien en place)`
        : `(pivot ${line.pivotDate}, cycle ${line.cycleDays} j)`;
      return `${line.label} : ${line.action} ${suffix}`;
    });

    const decision = {
      id: `launch-${event.id}`,
      eventLabel: event.label,
      eventKey: festKey,
      eventDate: iso(eventDate),
      activityLines,
      activities: activityLines.map((line) => line.activity),
      pivotDate: activityLines.map((line) => line.pivotDate).join(' · '),
      cycleDays: activityLines.map((line) => line.cycleDays).join('/'),
      activity: activityLines.map((line) => line.activity).join(', '),
      daysUntilPivot: Math.min(...activityLines.map((line) => line.daysUntilPivot)),
      hasActiveLot: missing.length === 0,
      priority: worst,
      category: 'launch_timing',
      module: 'centre_decisionnel',
      navModule: 'elevage',
      navTab: 'Cycles & Reproduction',
      openLabel: 'Voir calendrier',
      message: `Pour ${event.label}, vendre bœufs, poulets et œufs : ${lineMessages.join(' · ')}`,
    };
    cycleDecisions.push(decision);

    if (missing.some((line) => line.priority === 'critique')) {
      alerts.push({ ...decision, type: 'launch_deadline_missed' });
    } else if (missing.length) {
      alerts.push({ ...decision, type: 'launch_deadline_approaching' });
    }
  });

  const temp = num(meteo.temperature ?? meteo.temp ?? 28);
  const humidity = num(meteo.humidity ?? meteo.humidite ?? 60);
  const ith = computeITH(temp, humidity);
  const forecast = arr(meteo.forecast || options.weatherForecast || meteo.previsions);

  const hotDays = forecast.filter((f) => num(f.temp ?? f.temperature) >= HEAT_FORECAST_THRESHOLD).length;
  const isHotSeason = hotDays >= 3 || temp >= HEAT_FORECAST_THRESHOLD || ith >= ps.ithStressThreshold;

  if (isHotSeason) {
    const heatDecision = {
      id: 'launch-heat-stress',
      type: 'stress_thermique',
      ith,
      currentTemp: temp,
      hotForecastDays: hotDays,
      priority: 'haute',
      densityReductionPct: 15,
      delayDays: 14,
      message: ith >= ps.ithStressThreshold
        ? `ITH ${ith} (canicule). Décaler le lancement poulets de chair de 14 jours OU réduire la densité de 15% pour protéger la marge aliment.`
        : `Prévisions chaleur (${hotDays} j ≥ ${HEAT_FORECAST_THRESHOLD}°C). Envisager décalage lancement ou densité -15%.`,
    };
    cycleDecisions.push(heatDecision);
    alerts.push(heatDecision);
  }

  console.info('[evaluateLaunchTimingDecisions]', { decisions: cycleDecisions.length, alerts: alerts.length });
  return { alerts, cycleDecisions, ith, currentTemp: temp };
}

/** 3. Audit stock aliment - détection coulage/vol. */
export function auditFeedStockConsumption(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const alimentationLogs = arr(dataMap.alimentation_logs || dataMap.alimentationLogs);
  const businessEvents = arr(dataMap.business_events || dataMap.businessEvents);

  const byBuilding = new Map();
  lots.forEach((lot) => {
    const b = buildingOf(lot);
    if (!byBuilding.has(b)) byBuilding.set(b, []);
    byBuilding.get(b).push(lot);
  });

  const alerts = [];
  const dailyAudit = [];

  const lastDays = options.auditDays ?? 7;
  for (let i = 0; i < lastDays; i += 1) {
    const day = iso(addDays(new Date(), -i));
    byBuilding.forEach((buildingLots, building) => {
      let theoretical = 0;
      buildingLots.forEach((lot) => {
        const pivot = buildLotPivotContext(lot);
        const birds = avicoleActiveCount(lot);
        theoretical += birds * feedStandardKgPerBird(pivot.workshop, pivot.ageDays);
      });
      const actual = alimentationLogs
        .filter((l) => logDate(l) === day)
        .filter((l) => buildingLots.some((lot) => lotIdOf(l) === String(lot.id)) || norm(l.batiment || l.building || '').includes(norm(building)))
        .reduce((s, l) => s + num(l.quantite ?? l.quantity), 0)
        + businessEvents
          .filter((e) => logDate(e) === day && norm(e.type || e.categorie || '').includes('sortie'))
          .filter((e) => FEED_PATTERNS.some((p) => norm(`${e.libelle || ''} ${e.description || ''}`).includes(p)))
          .reduce((s, e) => s + num(e.quantite ?? e.qty ?? 0), 0);

      if (theoretical > 0 && actual > 0) {
        const overPct = safeDiv(actual - theoretical, theoretical) * 100;
        dailyAudit.push({ day, building, theoretical: Math.round(theoretical), actual: Math.round(actual), overPct: Math.round(overPct * 10) / 10 });
      }
    });
  }

  const byBuildingConsecutive = new Map();
  dailyAudit
    .sort((a, b) => a.day.localeCompare(b.day))
    .forEach((row) => {
      if (row.overPct <= STOCK_AUDIT_THRESHOLD_PCT) {
        byBuildingConsecutive.set(row.building, 0);
        return;
      }
      const streak = (byBuildingConsecutive.get(row.building) || 0) + 1;
      byBuildingConsecutive.set(row.building, streak);
      if (streak >= STOCK_AUDIT_CONSECUTIVE_DAYS) {
        alerts.push({
          id: `stock-audit-${row.building}`,
          building: row.building,
          severity: 'orange',
          overPct: row.overPct,
          theoreticalKg: row.theoretical,
          actualKg: row.actual,
          consecutiveDays: streak,
          message: `Anomalie : Surconsommation de stock suspecte sur le bâtiment ${row.building} (+${row.overPct}% vs théorique sur ${streak} jours). Vérifier le coulage, le gaspillage ou l'intégrité du stockage.`,
        });
      }
    });

  console.info('[auditFeedStockConsumption]', { alerts: alerts.length });
  return { alerts, dailyAudit: dailyAudit.slice(-21) };
}

/** 4. Validation BFR avant lancement de bande. */
export function validateCycleBfrCoverage(dataMap = {}, options = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrdersAll || dataMap.salesOrders);

  const transactions = arr(dataMap.finances || dataMap.transactions);
  const clients = arr(dataMap.clients);

  const settings = dataMap.growth_settings || {};
  const explicitlyConfigured = options.plannedHeadcount != null || settings.pilotage_configured === true;
  const plannedHeadcount = explicitlyConfigured
    ? num(options.plannedHeadcount ?? settings.next_band_size)
    : 0;
  if (plannedHeadcount <= 0) {
    return {
      evaluable: false,
      blocked: false,
      coveragePct: null,
      coutEstimeCycle: 0,
      treasury: 0,
      vipReceivables: 0,
      totalAvailable: 0,
      feedAutonomyDays: null,
      vipPending: [],
      plannedHeadcount: 0,
      message: 'BFR non évalué : renseigner la prochaine bande dans les paramètres de pilotage.',
    };
  }

  const feedPrice = feedPricePerKg(stocks);
  const workshop = options.workshop ?? 'poulets_chair';
  const cycleDays = workshop === 'bovins' ? BOVIN_CYCLE_DAYS : workshop === 'pondeuses' ? 365 : BROILER_CYCLE_DAYS;
  const avgDailyFeedPerHead = workshop === 'bovins' ? 4.5 : workshop === 'pondeuses' ? 0.135 : 0.095;
  const coutEstimeCycle = plannedHeadcount * avgDailyFeedPerHead * cycleDays * feedPrice;

  const income = transactions.filter((t) => norm(t.type || t.categorie || '').includes('entree')).reduce((s, t) => s + amount(t), 0);
  const expenses = transactions.filter((t) => norm(t.type || t.categorie || '').includes('sortie')).reduce((s, t) => s + amount(t), 0);
  const treasury = income - expenses;

  const ps = pilotageSettings(dataMap);
  const vipClients = clients.filter((c) => ps.vipClientIds.has(String(c.id)) || norm(c.segment || c.type_client || c.categorie || '').includes('vip') || num(c.score_fidelite) >= 80);
  const vipNames = new Set(vipClients.map((c) => String(c.id)));
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const safeReferenceDate = Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate;
  const in7days = addDays(safeReferenceDate, 7);

  let vipReceivables = 0;
  const vipPending = [];
  salesOrders.forEach((order) => {
    const clientId = String(order.client_id || '');
    const isVip = vipNames.has(clientId) || norm(order.client_nom || '').includes('vip');
    if (!isVip) return;
    const due = order.date_echeance || order.due_date;
    const remaining = amount(order) - num(order.montant_paye);
    if (remaining > 0 && (!due || new Date(due) <= in7days)) {
      vipReceivables += remaining;
      vipPending.push({ client: order.client_nom || clientId, amount: remaining });
    }
  });

  const totalAvailable = Math.max(0, treasury) + vipReceivables;
  const coveragePct = coutEstimeCycle > 0 ? (totalAvailable / coutEstimeCycle) * 100 : 100;
  const blocked = coveragePct < ps.bfrMinCoveragePct;

  const feedAutonomyDays = (() => {
    const feedStock = stocks.filter((s) => FEED_PATTERNS.some((p) => norm(`${s.nom || ''}`).includes(p))).reduce((s, st) => s + num(st.quantite ?? st.quantity), 0);
    const dailyNeed = lots.reduce((sum, lot) => {
      const pivot = buildLotPivotContext(lot);
      return sum + avicoleActiveCount(lot) * feedStandardKgPerBird(pivot.workshop, pivot.ageDays);
    }, 0) || plannedHeadcount * avgDailyFeedPerHead;
    return dailyNeed > 0 ? Math.floor(feedStock / dailyNeed) : null;
  })();

  const result = {
    evaluable: true,
    blocked,
    coveragePct: Math.round(coveragePct),
    coutEstimeCycle: Math.round(coutEstimeCycle),
    treasury: Math.round(treasury),
    vipReceivables: Math.round(vipReceivables),
    totalAvailable: Math.round(totalAvailable),
    feedAutonomyDays,
    vipPending,
    plannedHeadcount,
    message: blocked
      ? `Lancement suspendu : Trésorerie insuffisante pour garantir l'achat des aliments de la bande (couverture ${Math.round(coveragePct)}% < ${ps.bfrMinCoveragePct}%). Relancer d'abord les créances${vipPending.length ? ` des clients ${vipPending.map((v) => v.client).join(', ')}` : ' en souffrance'}.`
      : `Couverture BFR OK (${Math.round(coveragePct)}%) - trésorerie + créances VIP couvrent le cycle.`,
  };

  if (blocked) console.warn('[validateCycleBfrCoverage] BLOQUÉ', result);
  else console.info('[validateCycleBfrCoverage]', result);
  return result;
}


function enrichSanitaryAlert(alert, refDate = new Date()) {
  const isMortality = String(alert.id || '').includes('sanitary-extended');
  const required = alert.requiredDays || 10;
  const extra = alert.extraVacuumDays || 0;

  if (isMortality) {
    const totalWait = required + extra;
    const earliest = addDays(refDate, extra);
    return {
      ...alert,
      type: 'historique_pathologique',
      title: `Bâtiment ${alert.building} - mortalité élevée sur bande précédente`,
      explanation: `La dernière bande dans ${alert.building} a enregistré ${alert.mortalityRate}% de mortalité (seuil alerte : 5 %). Des germes peuvent persister dans le sol. Il faut prolonger le vide sanitaire avant toute nouvelle bande.`,
      actions: [
        `Attendre ${totalWait} jours minimum sans animaux (${required} j standard + ${extra} j supplémentaires)`,
        'Retirer ou brûler la litière, puis désinfecter le sol et les équipements',
        'Faire valider le bâtiment par le vétérinaire avant commande de poussins',
        `Ne pas lancer de nouvelle bande dans ${alert.building} avant le ${iso(earliest)}`,
      ],
      earliestLaunchDate: iso(earliest),
      priority: 'critique',
    };
  }

  const delayDays = Math.max(0, required - (alert.gapDays || 0));
  const earliest = addDays(refDate, delayDays);
  return {
    ...alert,
    type: 'vide_insuffisant',
    title: `Bâtiment ${alert.building} - pause entre bandes trop courte`,
    explanation: `Seulement ${alert.gapDays} jours entre la bande précédente et le lot « ${alert.lotName || alert.lotId} ». Le vide sanitaire minimum est de ${required} jours pour désinfecter le bâtiment.`,
    actions: [
      delayDays > 0 ? `Reporter la mise en place du lot ${alert.lotName || alert.lotId} de ${delayDays} jours` : 'Vérifier les dates de fin de bande précédente',
      'Nettoyer, laver et désinfecter le sol et les abreuvoirs',
      'Laisser sécher le bâtiment avant introduction des poussins',
      delayDays > 0 ? `Lancement possible après le ${iso(earliest)}` : "Consigner la date de fin de bande dans l'ERP",
    ],
    earliestLaunchDate: delayDays > 0 ? iso(earliest) : null,
    priority: 'critique',
  };
}


/** Vide sanitaire prolongé si mortalité élevée sur bâtiment. */
export function buildExtendedSanitaryAlerts(dataMap = {}) {
  const ps = pilotageSettings(dataMap);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const baseAlerts = buildSanitaryVacuumAlerts(lots).map((alert) => ({
    ...alert,
    requiredDays: ps.sanitaryMinDays,
    blocking: (alert.gapDays ?? alert.requiredDays ?? 0) < ps.sanitaryMinDays,
    message: alert.message || `Vide sanitaire insuffisant dans ${alert.building}.`,
  }));
  const alerts = [...baseAlerts];

  const byBuilding = new Map();
  lots.forEach((lot) => {
    const b = buildingOf(lot);
    if (!byBuilding.has(b)) byBuilding.set(b, []);
    byBuilding.get(b).push(lot);
  });

  byBuilding.forEach((buildingLots, building) => {
    const closedLots = buildingLots.filter((l) => l.date_fin || l.date_cloture || norm(l.statut || '').includes('clos'));
    const lastClosed = closedLots.sort((a, b) => String(b.date_fin || b.date_cloture).localeCompare(String(a.date_fin || a.date_cloture)))[0];
    if (!lastClosed) return;
    const dead = avicoleDeadCount(lastClosed);
    const initial = avicoleInitialCount(lastClosed) || 1;
    const mortalityRate = (dead / initial) * 100;
    if (mortalityRate > ps.mortalityThresholdPct) {
      const extraDays = ps.extraVacuumDays;
      alerts.push({
        id: `sanitary-extended-${building}`,
        building,
        lotId: lastClosed.id,
        mortalityRate: Math.round(mortalityRate * 10) / 10,
        extraVacuumDays: extraDays,
        blocking: true,
        message: `Alerte : Ne pas lancer la bande au bout des 10 jours standards. L'historique pathologique du ${building} (${mortalityRate.toFixed(1)}% mortalité) exige un vide sanitaire prolongé de ${extraDays} jours supplémentaires avec traitement thermique du sol.`,
      });
    }
  });

  return alerts;
}

/** Effet ciseau - hausse prix intrants aliment. */
export function buildScissorsEffectAlert(dataMap = {}) {
  const marketPrices = arr(dataMap.market_prices || dataMap.marketPrices);
  const transactions = arr(dataMap.finances || dataMap.transactions);
  const stocks = arr(dataMap.stock || dataMap.stocks);

  const commodities = ['mais', 'maïs', 'soja', 'tourteau'];
  const trends = commodities.map((name) => {
    const prices = marketPrices
      .filter((p) => norm(p.produit || p.product || '').includes(name))
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    if (prices.length < 2) return null;
    const first = num(prices[0].prix ?? prices[0].price);
    const last = num(prices[prices.length - 1].prix ?? prices[prices.length - 1].price);
    const months = Math.max(1, prices.length);
    const monthlyPct = first > 0 ? ((last - first) / first) * 100 / months : 0;
    return { name, first, last, monthlyPct, projected3mPct: monthlyPct * 3 };
  }).filter(Boolean);

  const rising = trends.filter((t) => t.monthlyPct >= 5);
  if (!rising.length) return null;

  const avgRise = rising.reduce((s, t) => s + t.projected3mPct, 0) / rising.length;
  const feedStock = stocks.filter((s) => FEED_PATTERNS.some((p) => norm(`${s.nom || ''}`).includes(p))).reduce((s, st) => s + num(st.quantite ?? st.quantity), 0);
  const feedPrice = feedPricePerKg(stocks);
  const economieEstimee = Math.round(feedStock * feedPrice * (avgRise / 100) * 0.5);

  const income = transactions.filter((t) => norm(t.type || '').includes('entree')).reduce((s, t) => s + amount(t), 0);
  const expenses = transactions.filter((t) => norm(t.type || '').includes('sortie')).reduce((s, t) => s + amount(t), 0);
  const hasTreasurySurplus = income - expenses > economieEstimee;

  return {
    id: 'scissors-effect',
    commodities: rising,
    projectedRisePct: Math.round(avgRise),
    economieEstimee,
    hasTreasurySurplus,
    priority: avgRise >= 15 ? 'haute' : 'moyenne',
    message: `Recommandation : Les projections montrent une hausse de ~${Math.round(avgRise)}% du prix de l'aliment d'ici 3 mois. ${hasTreasurySurplus ? `Utilisez votre excédent de trésorerie pour acheter 3 mois de stock d'intrants au prix actuel. Économie estimée : ${economieEstimee.toLocaleString('fr-FR')} FCFA.` : 'Anticiper les commandes groupées avant la hausse.'}`,
  };
}

/** Arbitrage transformation œuf vs poussin (si incubateur). */
export function buildTransformationArbitrage(dataMap = {}) {
  const marketPrices = arr(dataMap.market_prices || dataMap.marketPrices);

  const settings = dataMap.growth_settings || {};

  const eggTrayPrice = num(
    marketPrices.find((p) => norm(p.produit || '').includes('oeuf') || norm(p.produit || '').includes('tablette'))?.prix
    ?? settings.egg_tray_price
    ?? 900,
  );
  const chickPrice = num(
    marketPrices.find((p) => norm(p.produit || '').includes('poussin'))?.prix
    ?? settings.chick_day_old_price
    ?? 350,
  );
  const incubatorCostPerEgg = num(settings.incubator_cost_per_egg ?? 15);
  const hatchRate = num(settings.hatch_rate ?? 0.82);

  const netEggMargin = eggTrayPrice;
  const netChickMargin = chickPrice * hatchRate - incubatorCostPerEgg;
  const diffPct = netEggMargin > 0 ? ((netChickMargin - netEggMargin) / netEggMargin) * 100 : 0;

  if (Math.abs(diffPct) < 5) return null;

  const incubatePct = diffPct > 0 ? Math.min(80, Math.round(50 + diffPct / 2)) : 0;
  return {
    id: 'transform-arbitrage',
    eggTrayPrice,
    chickPrice,
    netChickMargin: Math.round(netChickMargin),
    netEggMargin: Math.round(netEggMargin),
    diffPct: Math.round(diffPct),
    incubatePct,
    message: diffPct > 0
      ? `Ce mois-ci, incubez ${incubatePct}% de votre ponte. La marge nette au poussin est supérieure de ${Math.round(diffPct)}% à la vente directe de l'œuf de consommation.`
      : `Vente directe des œufs plus rentable (+${Math.round(Math.abs(diffPct))}%) que l'incubation ce mois-ci.`,
  };
}

/** Plan stratégique complet pour le Centre décisionnel. */
export function buildStrategicDecisionPlan(dataMap = {}, options = {}) {
  const sellNow = evaluateSellNowDecisions(dataMap, options);
  const launch = evaluateLaunchTimingDecisions(dataMap, options);
  const stockAudit = auditFeedStockConsumption(dataMap, options);
  const bfr = validateCycleBfrCoverage(dataMap, options);
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const sanitary = buildExtendedSanitaryAlerts(dataMap).map((alert) => enrichSanitaryAlert(alert, refDate));
  const scissors = buildScissorsEffectAlert(dataMap);
  const transformation = buildTransformationArbitrage(dataMap);

  const recommendations = [
    ...sellNow.map((a) => ({
      id: a.id,
      title: a.status,
      activity: a.type,
      priority: 'haute',
      timing: 'Immédiat',
      recommendation: a.message,
      strategic: true,
      category: 'sell_now',
    })),
    ...launch.alerts.map((a) => ({
      id: a.id,
      title: a.eventLabel || 'Timing lancement',
      activity: a.activity || 'poulets_chair',
      priority: a.priority || 'haute',
      timing: a.pivotDate || a.eventDate || 'À planifier',
      recommendation: a.message,
      strategic: true,
      category: 'launch_timing',
    })),
    ...(bfr.blocked ? [{
      id: 'bfr-block',
      title: 'Lancement suspendu - BFR',
      activity: 'global',
      priority: 'haute',
      timing: 'Avant toute commande',
      recommendation: bfr.message,
      strategic: true,
      category: 'bfr',
    }] : []),
    ...stockAudit.alerts.map((a) => ({
      id: a.id,
      title: `Audit stock - ${a.building}`,
      activity: 'stock',
      priority: 'moyenne',
      timing: `${a.consecutiveDays} jours consécutifs`,
      recommendation: a.message,
      strategic: true,
      category: 'stock_audit',
    })),
    ...sanitary.filter((s) => s.blocking).map((s) => ({
      id: s.id,
      title: 'Vide sanitaire prolongé',
      activity: 'avicole',
      priority: 'haute',
      timing: 'Avant lancement',
      recommendation: s.message,
      strategic: true,
      category: 'sanitary',
    })),
    ...(scissors ? [{
      id: scissors.id,
      title: 'Effet ciseau - intrants',
      activity: 'achats_stock',
      priority: scissors.priority,
      timing: '3 mois',
      recommendation: scissors.message,
      strategic: true,
      category: 'scissors',
    }] : []),
    ...(transformation ? [{
      id: transformation.id,
      title: 'Arbitrage œuf vs poussin',
      activity: 'oeufs',
      priority: 'moyenne',
      timing: 'Hebdomadaire',
      recommendation: transformation.message,
      strategic: true,
      category: 'transformation',
    }] : []),
  ];

  const risks = [
    ...sellNow.map((a) => ({
      id: a.id,
      domain: 'Technico-économique',
      title: a.title || a.status,
      cause: `${a.subjectLabel || a.lotName || 'Entité'} - gain ${a.gainValeurJour} FCFA/j < coût ${a.coutRationJour} FCFA/j`,
      impact: 'Perte nette si maintien en élevage',
      action: 'Vendre immédiatement',
      module: a.navModule || 'elevage',
      navTab: a.navTab || (a.entityType === 'animal' ? 'Animaux' : 'Avicole'),
      entityType: a.entityType,
      entityId: a.entityId || a.animalId || a.lotId,
      severity: 'Critique',
      tone: 'bad',
      financialImpact: `${a.coutRationJour - a.gainValeurJour} FCFA/j`,
    })),
    ...stockAudit.alerts.map((a) => ({
      id: a.id,
      domain: 'Audit stock',
      title: `Surconsommation ${a.building}`,
      cause: `+${a.overPct}% vs théorique souche`,
      impact: 'Coulage, gaspillage ou vol suspecté',
      action: 'Contrôler stockage et distribution',
      module: 'achats_stock',
      navTab: 'Stock',
      severity: 'Moyenne',
      tone: 'warn',
    })),
    ...(bfr.blocked ? [{
      id: 'bfr-risk',
      domain: 'Finance',
      title: 'Trésorerie insuffisante pour lancer',
      cause: `Couverture ${bfr.coveragePct}% < ${pilotageSettings(dataMap).bfrMinCoveragePct}%`,
      impact: 'Rupture aliment possible en cours de cycle',
      action: 'Relancer créances VIP',
      module: 'finance_pilotage',
      navTab: 'Trésorerie',
      severity: 'Critique',
      tone: 'bad',
      financialImpact: `${bfr.coutEstimeCycle - bfr.totalAvailable} FCFA manquants`,
    }] : []),
  ];

  console.info('[buildStrategicDecisionPlan]', {
    sellNow: sellNow.length,
    launch: launch.alerts.length,
    stockAudit: stockAudit.alerts.length,
    bfrBlocked: bfr.blocked,
  });

  return {
    sellNow,
    launch,
    stockAudit,
    bfr,
    sanitary,
    scissors,
    transformation,
    recommendations,
    risks,
    ith: launch.ith,
    generated_at: new Date().toISOString(),
  };
}

export default buildStrategicDecisionPlan;
