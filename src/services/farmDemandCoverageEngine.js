import { demandLevelToFactor, getCommercialMonth } from './horizonCommercialCalendar';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total);

export const activityDemandLabels = {
  oeufs: 'Œufs / Pondeuses',
  poulets_chair: 'Poulets de chair',
  bovins: 'Bovins',
  ovins: 'Ovins',
  caprins: 'Caprins',
  cultures: 'Cultures',
  stock: 'Stock / Produits',
};

const defaultUnitPrices = {
  oeufs: 2500,
  poulets_chair: 3500,
  bovins: 350000,
  ovins: 90000,
  caprins: 50000,
  cultures: 500,
  stock: 1000,
};

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function classifySaleActivity(order = {}) {
  const raw = norm(`${order.activite || ''} ${order.source_type || ''} ${order.type_vente || ''} ${order.product_type || ''} ${order.product_name || ''} ${order.libelle || ''} ${order.espece || ''} ${order.type_animal || ''}`);
  if (raw.includes('oeuf') || raw.includes('tablette') || raw.includes('pondeuse')) return 'oeufs';
  if (raw.includes('chair') || raw.includes('poulet')) return 'poulets_chair';
  if (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('vache') || raw.includes('taureau') || raw.includes('veau')) return 'bovins';
  if (raw.includes('ovin') || raw.includes('mouton') || raw.includes('belier') || raw.includes('brebis')) return 'ovins';
  if (raw.includes('caprin') || raw.includes('chevre') || raw.includes('bouc')) return 'caprins';
  if (raw.includes('culture') || raw.includes('tomate') || raw.includes('pomme') || raw.includes('poivron') || raw.includes('recolte')) return 'cultures';
  return 'stock';
}

function avgUnitPrice(activity, dataMap = {}) {
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders).filter((sale) => classifySaleActivity(sale) === activity);
  const values = sales.map((sale) => {
    const qty = num(sale.quantite || sale.quantity || sale.nombre || sale.count);
    return qty > 0 ? amount(sale) / qty : 0;
  }).filter((value) => value > 0);
  if (!values.length) return defaultUnitPrices[activity] || 1000;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function eventBoost(activity, monthDate, events = []) {
  const key = monthKey(monthDate);
  const monthEvents = arr(events).filter((event) => monthKey(new Date(event.date)) === key && arr(event.activities).includes(activity));
  if (!monthEvents.length) return { factor: 1, events: [] };
  const strongest = monthEvents.some((event) => ['tabaski', 'fin', 'ramadan', 'korite', 'gamou', 'magal', 'noel', 'noël'].some((term) => norm(event.label || event.id).includes(term)));
  return { factor: strongest ? 1.18 : 1.08, events: monthEvents.map((event) => event.label) };
}

function demandLevelFromIndex(index) {
  if (index >= 1.2) return 'forte';
  if (index <= 0.85) return 'faible';
  return 'normale';
}

export function buildMonthlyDemandForecast(dataMap = {}, events = [], options = {}) {
  const referenceDate = options.date || new Date();
  const annualTarget = num(options.annualTarget || dataMap?.growth_settings?.annual_ca_target || 120000000);
  const mix = dataMap?.growth_settings?.annual_mix || { oeufs: 0.32, poulets_chair: 0.22, bovins: 0.12, ovins: 0.09, caprins: 0.05, cultures: 0.15, stock: 0.05 };
  const months = Array.from({ length: options.months || 12 }).map((_, index) => addMonths(referenceDate, index));

  return months.map((date) => {
    const monthRef = getCommercialMonth(date.getMonth() + 1);
    const activities = Object.keys(mix).map((activity) => {
      const baseLevel = monthRef?.demand?.[activity] || 'normale';
      const baseFactor = demandLevelToFactor(baseLevel);
      const boost = eventBoost(activity, date, events);
      const demandIndex = Number((baseFactor * boost.factor).toFixed(2));
      const finalLevel = demandLevelFromIndex(demandIndex);
      const monthlyRevenueTarget = (annualTarget * num(mix[activity])) / 12 * demandIndex;
      const unitPrice = avgUnitPrice(activity, dataMap);
      return {
        activity,
        label: activityDemandLabels[activity] || activity,
        demandIndex,
        demandLevel: finalLevel,
        baseDemandLevel: baseLevel,
        revenueTarget: Math.round(monthlyRevenueTarget),
        events: boost.events,
        season: monthRef?.season || '',
        monthActions: monthRef?.actions || [],
        monthRisks: monthRef?.risks || [],
        crops: monthRef?.crops || [],
        unitPrice,
        estimatedUnits: Math.ceil(monthlyRevenueTarget / Math.max(1, unitPrice)),
      };
    });
    return {
      month: monthKey(date),
      label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      commercialMonth: monthRef,
      activities,
    };
  });
}

function animalSpecies(row = {}) {
  const raw = norm(`${row.type || ''} ${row.espece || ''} ${row.categorie || ''} ${row.nom || ''}`);
  if (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('vache') || raw.includes('taureau') || raw.includes('veau')) return 'bovins';
  if (raw.includes('ovin') || raw.includes('mouton') || raw.includes('belier') || raw.includes('brebis')) return 'ovins';
  if (raw.includes('caprin') || raw.includes('chevre') || raw.includes('bouc')) return 'caprins';
  return '';
}

function isActive(row = {}) {
  const status = norm(row.statut || row.status || row.etat || 'actif');
  return !['vendu', 'perdu', 'termine', 'terminé', 'mort', 'reforme', 'réformé'].includes(status);
}

export function buildFarmSupplyCoverage(dataMap = {}, demandForecast = []) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animals = arr(dataMap.animaux);
  const cultures = arr(dataMap.cultures);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const productionLogs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const recentEggs = productionLogs.slice(-14).reduce((sum, row) => sum + num(row.quantite || row.eggs || row.total_oeufs || row.oeufs), 0);
  const avgEggsDay = productionLogs.length ? recentEggs / Math.min(14, productionLogs.length) : 0;
  const activeLayers = lots
    .filter((lot) => /pondeuse|oeuf/.test(norm(`${lot.type || ''} ${lot.nom || ''} ${lot.name || ''}`)) && isActive(lot))
    .reduce((sum, lot) => sum + num(lot.current_count ?? lot.effectif_actuel ?? lot.count ?? lot.initial_count), 0);
  const eggsDay = avgEggsDay || activeLayers * 0.72;
  const broilersReady = lots
    .filter((lot) => /chair|poulet/.test(norm(`${lot.type || ''} ${lot.nom || ''} ${lot.name || ''}`)) && isActive(lot) && (num(lot.age_days || lot.age_jours) >= 35 || num(lot.poids_moyen || lot.average_weight) >= 1.5))
    .reduce((sum, lot) => sum + num(lot.current_count ?? lot.effectif_actuel ?? lot.count ?? lot.initial_count), 0);

  const supplyUnits = {
    oeufs: Math.round((eggsDay / 30) * 30),
    poulets_chair: broilersReady,
    bovins: animals.filter((animal) => animalSpecies(animal) === 'bovins' && isActive(animal)).length,
    ovins: animals.filter((animal) => animalSpecies(animal) === 'ovins' && isActive(animal)).length,
    caprins: animals.filter((animal) => animalSpecies(animal) === 'caprins' && isActive(animal)).length,
    cultures: cultures.reduce((sum, culture) => sum + num(culture.quantite_disponible ?? culture.quantite_recoltee ?? culture.rendement_reel), 0),
    stock: stocks.reduce((sum, stock) => sum + num(stock.quantite ?? stock.quantity), 0),
  };

  return demandForecast.map((month) => ({
    ...month,
    activities: month.activities.map((activity) => {
      const availableUnits = supplyUnits[activity.activity] || 0;
      const availableRevenue = availableUnits * num(activity.unitPrice);
      const coverageRate = activity.revenueTarget > 0 ? Math.round((availableRevenue / activity.revenueTarget) * 100) : 0;
      const gapRevenue = Math.max(0, activity.revenueTarget - availableRevenue);
      const gapUnits = Math.max(0, activity.estimatedUnits - availableUnits);
      let coverageStatus = 'insuffisant';
      if (coverageRate >= 100) coverageStatus = 'couvert';
      else if (coverageRate >= 60) coverageStatus = 'partiel';
      return { ...activity, availableUnits, availableRevenue, coverageRate, gapRevenue, gapUnits, coverageStatus };
    }),
  }));
}

export function findDemandCoverageForActivity(coverage = [], activity, targetDate) {
  const key = targetDate ? String(targetDate).slice(0, 7) : coverage[0]?.month;
  return coverage.find((month) => month.month === key)?.activities.find((row) => row.activity === activity) || coverage[0]?.activities.find((row) => row.activity === activity) || null;
}

export default { buildMonthlyDemandForecast, buildFarmSupplyCoverage, findDemandCoverageForActivity };
