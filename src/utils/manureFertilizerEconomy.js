import {
  DEFAULT_ENGRAIS_SAC_PRICE_FCFA,
  MANURE_TO_FERTILIZER_SAC_RATIO,
} from './farmAgronomyConstants';
import { classifySaleActivity } from '../services/growthDecisionEngine';
import { toNumber } from './format';
import { isManureStock } from './manureWorkflows';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function stockSacs(stocks = []) {
  return arr(stocks)
    .filter(isManureStock)
    .reduce((sum, row) => sum + toNumber(row.quantite ?? row.quantity), 0);
}

function producedSacsFromEvents(events = []) {
  return arr(events)
    .filter((row) => norm(row.event_type) === 'entree_fumier' || norm(row.event_type) === 'fumier_collecte')
    .reduce((sum, row) => sum + toNumber(row.fumier_sacs ?? row.quantity ?? row.qty ?? 0), 0);
}

function soldSacsFromOrders(orders = [], dataMap = {}) {
  return arr(orders)
    .filter((row) => {
      const activity = classifySaleActivity(row, dataMap);
      return activity.startsWith('fumier_') || norm(`${row.product_name || ''} ${row.libelle || ''}`).includes('fumier');
    })
    .reduce((sum, row) => sum + toNumber(row.quantity ?? row.quantite ?? 1), 0);
}

function engraisSacsFromCultures(cultures = []) {
  return arr(cultures).reduce((sum, row) => sum + toNumber(row.cout_engrais), 0);
}

function resolveEngraisSacPrice(stocks = [], cultures = []) {
  const engraisStocks = arr(stocks).filter((row) => {
    const text = norm(`${row.categorie || ''} ${row.produit || ''}`);
    return text.includes('engrais') || text.includes('npk') || text.includes('uree');
  });
  const priced = engraisStocks
    .map((row) => toNumber(row.prixUnit ?? row.prix_unitaire ?? row.prix_vente))
    .filter((value) => value > 0);
  if (priced.length) {
    return priced.reduce((sum, value) => sum + value, 0) / priced.length;
  }
  const totalEngraisCost = engraisSacsFromCultures(cultures);
  if (totalEngraisCost > 0) {
    const estimatedSacs = Math.max(1, arr(cultures).length * 4);
    return totalEngraisCost / estimatedSacs;
  }
  return DEFAULT_ENGRAIS_SAC_PRICE_FCFA;
}

/**
 * Calcule l'économie engrais liée au fumier produit sur l'exploitation.
 * - fumier produit : événements entree_fumier + stock actuel + vendu
 * - sacs engrais économisés : fumier non vendu (utilisé / disponible pour maraîchage)
 * - économie FCFA : sacs × prix sac engrais (stock réel ou fallback)
 */
export function computeManureFertilizerEconomy({
  stocks = [],
  salesOrders = [],
  cultures = [],
  businessEvents = [],
  dataMap = {},
} = {}) {
  const stockSacsQty = stockSacs(stocks);
  const producedFromEvents = producedSacsFromEvents(businessEvents);
  const soldSacs = soldSacsFromOrders(salesOrders, dataMap);
  const producedSacs = Math.max(producedFromEvents, stockSacsQty + soldSacs);
  const internalSacs = Math.max(0, producedSacs - soldSacs);
  const sacsEngraisEconomises = Math.round(internalSacs * MANURE_TO_FERTILIZER_SAC_RATIO);
  const prixSacEngrais = resolveEngraisSacPrice(stocks, cultures);
  const economieFcfa = Math.round(sacsEngraisEconomises * prixSacEngrais);
  const coutEngraisBrut = engraisSacsFromCultures(cultures);
  const coutEngraisNet = Math.max(0, coutEngraisBrut - economieFcfa);

  return {
    producedSacs,
    stockSacs: stockSacsQty,
    soldSacs,
    internalSacs,
    sacsEngraisEconomises,
    prixSacEngrais,
    economieFcfa,
    coutEngraisBrut,
    coutEngraisNet,
    hasRealProducedData: producedFromEvents > 0 || stockSacsQty > 0,
  };
}

export function formatManureEconomySummary(economy = {}) {
  if (!economy.hasRealProducedData && economy.sacsEngraisEconomises <= 0) {
    return 'Enregistrez des sacs de fumier lors d’un nettoyage pour activer le suivi.';
  }
  return `Bonus effluents : ${economy.sacsEngraisEconomises.toLocaleString('fr-FR')} sacs d'engrais chimiques économisés → ${economy.economieFcfa.toLocaleString('fr-FR')} FCFA sur le coût maraîcher.`;
}
