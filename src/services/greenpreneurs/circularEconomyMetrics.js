import {
  CIRCULAR_BUSINESS_EVENT_TYPES,
  CIRCULAR_SIMULATION_MONTHLY_KG,
  CIRCULAR_STOCK_CATEGORIES,
  DERFJ_GREENPRENEURS_PROFILE,
  ORGALOOP_EFFLUENT_CHANNEL,
} from '../../config/derfjGreenpreneurs.config.js';
import { computeOrgaloopEffluentMetrics } from './orgaloopEffluentChannel.js';
import { computeManureFertilizerEconomy } from '../../utils/manureFertilizerEconomy.js';
import { DEFAULT_ENGRAIS_SAC_PRICE_FCFA } from '../../utils/farmAgronomyConstants.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function stockQtyByCategory(stocks = [], patterns = []) {
  return arr(stocks)
    .filter((row) => {
      const text = norm(`${row.categorie || ''} ${row.produit || ''} ${row.type || ''}`);
      return patterns.some((p) => text.includes(norm(p)));
    })
    .reduce((sum, row) => sum + toNumber(row.quantite ?? row.quantity), 0);
}

function eventsByTypes(events = [], types = []) {
  const typeSet = new Set(types.map(norm));
  return arr(events).filter((e) => typeSet.has(norm(e.event_type)));
}

function sumEventQty(events = []) {
  return events.reduce((s, e) => s + toNumber(e.quantity ?? e.qty ?? e.fumier_sacs), 0);
}

function sumEventSavings(events = []) {
  return events.reduce((s, e) => s + toNumber(e.estimated_savings_fcfa ?? e.economie_fcfa), 0);
}

function countParcellesFertilisees(events = [], cultures = []) {
  const parcelleIds = new Set();
  eventsByTypes(events, ['parcelle_fertilisee', 'effluent_utilise_culture']).forEach((e) => {
    if (e.entity_id) parcelleIds.add(String(e.entity_id));
  });
  arr(cultures).forEach((c) => {
    if (toNumber(c.fumier_utilise ?? c.quantite_fumier) > 0 || norm(c.fertilisation_source).includes('fumier')) {
      parcelleIds.add(String(c.id || c.parcelle_id || c.nom));
    }
  });
  return parcelleIds.size;
}

function detectRealData(events, stocks, cultures) {
  const circularEvents = eventsByTypes(events, CIRCULAR_BUSINESS_EVENT_TYPES);
  const stockCircular = stockQtyByCategory(stocks, CIRCULAR_STOCK_CATEGORIES.concat(['fumier', 'compost', 'fiente']));
  const cultureUse = arr(cultures).some((c) => toNumber(c.fumier_utilise ?? c.quantite_fumier) > 0);
  return circularEvents.length > 0 || stockCircular > 0 || cultureUse;
}

function buildSimulationEstimates() {
  const targets = DERFJ_GREENPRENEURS_PROFILE.targetProduction;
  return {
    fientesPondeuses: { availableKg: CIRCULAR_SIMULATION_MONTHLY_KG.fientes_pondeuses, unit: 'kg', sourceType: 'simulation' },
    litiereChair: { availableKg: CIRCULAR_SIMULATION_MONTHLY_KG.litiere_chair, unit: 'kg', sourceType: 'simulation' },
    fumierBovin: { availableKg: CIRCULAR_SIMULATION_MONTHLY_KG.fumier_bovin, unit: 'kg', sourceType: 'simulation' },
    compost: { availableKg: Math.round(CIRCULAR_SIMULATION_MONTHLY_KG.litiere_chair * 0.6), unit: 'kg', sourceType: 'simulation' },
    coproduits: {
      suifKg: targets.bovinsPerMonth * CIRCULAR_SIMULATION_MONTHLY_KG.suif_par_bovin,
      osKg: targets.bovinsPerMonth * CIRCULAR_SIMULATION_MONTHLY_KG.os_par_bovin,
      sourceType: 'simulation',
    },
    targets,
  };
}

/**
 * KPI économie circulaire — données ERP réelles ou estimation BP DER/FJ.
 */
export function computeCircularEconomyMetrics(dataMap = {}, options = {}) {
  const events = arr(dataMap.business_events);
  const stocks = arr(dataMap.stocks);
  const cultures = arr(dataMap.cultures);
  const hasRealData = detectRealData(events, stocks, cultures);
  const forcedSimulation = options.simulatedMode === true;

  const manure = computeManureFertilizerEconomy({
    stocks,
    salesOrders: dataMap.sales_orders,
    cultures,
    businessEvents: events,
    dataMap,
  });

  let sourceType = 'erp_real';
  if (!hasRealData || forcedSimulation) sourceType = forcedSimulation ? 'simulation' : (hasRealData ? 'erp_real' : 'simulation');

  const sim = buildSimulationEstimates();

  const fienteEvents = eventsByTypes(events, ['effluent_produit', 'effluent_stocke', 'fumier_collecte']);
  const fientesKg = hasRealData
    ? sumEventQty(fienteEvents) + stockQtyByCategory(stocks, ['fiente', 'effluent'])
    : sim.fientesPondeuses.availableKg;

  const litiereKg = hasRealData
    ? stockQtyByCategory(stocks, ['litiere', 'litière', 'compost']) + sumEventQty(eventsByTypes(events, ['compost_produit']))
    : sim.litiereChair.availableKg;

  const fumierKg = hasRealData
    ? manure.producedSacs * 25 + stockQtyByCategory(stocks, ['fumier', 'fertilisant'])
    : sim.fumierBovin.availableKg;

  const compostKg = hasRealData
    ? stockQtyByCategory(stocks, ['compost', 'fertilisant_naturel']) + sumEventQty(eventsByTypes(events, ['compost_produit']))
    : sim.compost.availableKg;

  const usedOnCulturesKg = hasRealData
    ? sumEventQty(eventsByTypes(events, ['effluent_utilise_culture', 'parcelle_fertilisee']))
    : 0;

  const parcellesFertilisees = countParcellesFertilisees(events, cultures);
  const engraisSavingsFcfa = hasRealData
    ? sumEventSavings(eventsByTypes(events, ['engrais_chimique_evite'])) || manure.economieFcfa
    : Math.round((fumierKg + fientesKg) / 25 * DEFAULT_ENGRAIS_SAC_PRICE_FCFA * 0.3);

  const fertilisantStockKg = stockQtyByCategory(stocks, ['fertilisant_naturel', 'compost', 'fumier', 'fiente']);

  const suifKg = hasRealData
    ? stockQtyByCategory(stocks, ['suif', 'coproduit_bovin']) + sumEventQty(eventsByTypes(events, ['suif_collecte', 'coproduit_bovin_collecte']))
    : sim.coproduits.suifKg;

  const osKg = hasRealData
    ? stockQtyByCategory(stocks, ['os']) + sumEventQty(eventsByTypes(events, ['os_collectes']))
    : sim.coproduits.osKg;

  const orgaloop = computeOrgaloopEffluentMetrics(dataMap);
  const orgaloopPrimary = ORGALOOP_EFFLUENT_CHANNEL.strategy === 'vente_directe_orgaloop';

  const circularityScore = Math.min(100, Math.round(
    (orgaloopPrimary && orgaloop.soldKg > 0 ? 25 : parcellesFertilisees > 0 ? 25 : 0)
    + (orgaloopPrimary && orgaloop.revenueFcfa > 0 ? 20 : usedOnCulturesKg > 0 ? 20 : 0)
    + (orgaloopPrimary && orgaloop.soldKg > 0 ? 20 : engraisSavingsFcfa > 0 ? 20 : 0)
    + (hasRealData ? 20 : 10)
    + (fumierKg + fientesKg > 0 ? 15 : 0),
  ));

  const plannedCircularImpact = Math.round(
    (sim.fientesPondeuses.availableKg + sim.fumierBovin.availableKg) / 25 * DEFAULT_ENGRAIS_SAC_PRICE_FCFA * 0.25,
  );

  return {
    sourceType: hasRealData && !forcedSimulation ? 'erp_real' : (forcedSimulation ? 'simulation' : (hasRealData ? 'erp_real' : 'simulation')),
    sourceLabel: hasRealData && !forcedSimulation ? 'ERP réel' : 'Simulation / hypothèse',
    hasRealData: hasRealData && !forcedSimulation,
    fientesPondeuses: { availableKg: fientesKg, unit: 'kg', sourceType },
    litiereChair: { availableKg: litiereKg, unit: 'kg', sourceType },
    fumierBovin: { availableKg: fumierKg, unit: 'kg', sourceType },
    compost: { availableKg: compostKg, unit: 'kg', sourceType },
    usedOnCulturesKg,
    parcellesFertilisees,
    engraisSavingsFcfa,
    fertilisantStockKg,
    coproduits: { suifKg, osKg, sourceType },
    orgaloop,
    orgaloopPrimary,
    circularityScore,
    plannedVsRealized: {
      plannedSavingsFcfa: plannedCircularImpact,
      realizedSavingsFcfa: engraisSavingsFcfa,
      plannedFertilizedParcels: Math.max(1, Math.round(DERFJ_GREENPRENEURS_PROFILE.targetProduction.bovinsPerMonth)),
      realizedFertilizedParcels: parcellesFertilisees,
    },
    fluxCount: eventsByTypes(events, CIRCULAR_BUSINESS_EVENT_TYPES).length,
    targets: DERFJ_GREENPRENEURS_PROFILE.targetProduction,
  };
}
