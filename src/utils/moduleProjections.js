/**
 * Projections par module - réutilise les mêmes moteurs que l'Accueil dirigeant.
 */
import { buildCommercialObjectivesView } from './commercialPilotageMetrics.js';
import { buildCashFlowForecast } from './financePilotageV2.js';
import { filterRowsByPeriodScope, normalizePeriodScope } from './periodScope.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rowDate(row = {}) {
  return row.date || row.date_commande || row.created_at || row.date_mouvement;
}

function stockQty(row = {}) {
  return n(row.quantite ?? row.quantity ?? row.stock);
}

function stockThreshold(row = {}) {
  return n(row.seuil ?? row.seuil_alerte ?? row.threshold);
}

function countStockRuptures(stocks = []) {
  return arr(stocks).filter((row) => {
    const threshold = stockThreshold(row);
    return threshold > 0 && stockQty(row) <= threshold;
  }).length;
}

function baseItem(id, label, value, format, hint, tone = 'neutral', navigate = null) {
  return { id, label, value, format, hint, tone, navigate };
}

/** Commercial - CA fin de mois, restant objectif. */
export function buildCommercialModuleProjections(props = {}, periodScope = {}) {
  const scope = normalizePeriodScope(periodScope);
  const orders = filterRowsByPeriodScope(arr(props.salesOrdersAll || props.salesOrders), scope);
  const objectives = buildCommercialObjectivesView(orders, { monthTarget: props.monthTarget });
  const items = [];

  if (objectives.projectionEndOfMonth > 0 || objectives.actual > 0) {
    items.push(baseItem(
      'ca-projection',
      'CA fin de mois (proj.)',
      objectives.projectionEndOfMonth,
      'currency',
      objectives.onTrack ? 'Sur la bonne voie' : 'Sous l\'objectif mensuel',
      objectives.onTrack ? 'good' : 'warn',
      { module: 'commercial', tab: 'Pilotage' },
    ));
  }
  if (objectives.remaining > 0) {
    items.push(baseItem(
      'ca-remaining',
      'CA restant (objectif)',
      objectives.remaining,
      'currency',
      `${objectives.attainment}% atteint`,
      objectives.attainment >= 80 ? 'good' : 'warn',
      { module: 'commercial', tab: 'Pilotage' },
    ));
  }
  if (objectives.actual > 0) {
    items.push(baseItem(
      'ca-realized',
      'CA réalisé période',
      objectives.actual,
      'currency',
      objectives.label || 'Mois courant',
      'good',
      { module: 'commercial', tab: 'Pilotage' },
    ));
  }

  return { items, hasData: items.length > 0 };
}

/** Finance - trésorerie J+30/60, créances. */
export function buildFinanceModuleProjections(props = {}) {
  const forecast = buildCashFlowForecast({
    salesOrders: props.salesOrdersAll || props.salesOrders,
    payments: props.paymentsAll || props.payments,
    transactions: props.transactionsAll || props.transactions || props.finances,
    finances: props.transactionsAll || props.transactions || props.finances,
    bpRecurringCosts: props.bpRecurringCosts,
    clients: props.clients,
  }, props.forecastOptions || {});

  const items = [];
  if (forecast.ready && forecast.projection30 != null) {
    items.push(baseItem(
      'treasury-30',
      'Trésorerie J+30',
      forecast.projection30,
      'currency',
      forecast.riskLabel || 'Prévision échéancier',
      forecast.risk === 'high' ? 'warn' : forecast.risk === 'medium' ? 'neutral' : 'good',
      { module: 'finance_pilotage', tab: 'Trésorerie' },
    ));
  }
  if (forecast.ready && forecast.projection60 != null) {
    items.push(baseItem(
      'treasury-60',
      'Trésorerie J+60',
      forecast.projection60,
      'currency',
      'Projection charges récurrentes incluse',
      'neutral',
      { module: 'finance_pilotage', tab: 'Trésorerie' },
    ));
  }
  const receivable = n(props.receivable ?? props.receivables);
  if (receivable > 0) {
    items.push(baseItem(
      'receivables',
      'Créances à encaisser',
      receivable,
      'currency',
      'Relancer les clients en retard',
      'neutral',
      { module: 'finance_pilotage', tab: 'Créances & dettes' },
    ));
  }

  return { items, hasData: items.length > 0 };
}

/** Achats & Stock - ruptures, dettes, péremption. */
export function buildStockModuleProjections(props = {}) {
  const stocks = arr(props.stocks);
  const ruptures = countStockRuptures(stocks);
  const lowStock = arr(props.lowStock).length || ruptures;
  const debt = n(props.debt ?? props.supplierDebt);
  const expirySoon = n(props.expirySoon ?? props.expiry?.soon?.length);

  const items = [];
  if (lowStock > 0) {
    items.push(baseItem(
      'ruptures',
      'Produits sous seuil',
      lowStock,
      'count',
      'Réapprovisionner en priorité',
      'warn',
      { module: 'achats_stock', tab: 'Réceptions & achats' },
    ));
  }
  if (debt > 0) {
    items.push(baseItem(
      'supplier-debt',
      'Dettes fournisseurs',
      debt,
      'currency',
      'Échéances à planifier',
      'neutral',
      { module: 'achats_stock', tab: 'Fournisseurs & dettes' },
    ));
  }
  if (expirySoon > 0) {
    items.push(baseItem(
      'expiry',
      'DLC proches (7j)',
      expirySoon,
      'count',
      'Écouler ou transformer',
      'warn',
      { module: 'achats_stock', tab: 'Inventaire' },
    ));
  }

  return { items, hasData: items.length > 0 };
}

/** Élevage - production œufs projetée, lots sous traitement. */
export function buildElevageModuleProjections(props = {}) {
  const prodLogs = arr(props.productionLogs);
  const weekAgo = Date.now() - 7 * 86400000;
  const eggsWeek = prodLogs
    .filter((row) => {
      const t = parseDate(rowDate(row))?.getTime() || 0;
      return t >= weekAgo;
    })
    .reduce((sum, row) => sum + n(row.oeufs_produits ?? row.eggs_count ?? row.quantite), 0);
  const eggsDailyAvg = eggsWeek > 0 ? Math.round(eggsWeek / 7) : 0;
  const eggsMonthProjection = eggsDailyAvg * 30;

  const lotsUnderTreatment = arr(props.lots || props.avicole)
    .filter((lot) => ['traitement', 'sous_traitement', 'malade'].some((t) => String(lot.health_status || lot.statut || '').toLowerCase().includes(t))).length;

  const items = [];
  if (eggsMonthProjection > 0) {
    items.push(baseItem(
      'eggs-30',
      'Œufs (proj. 30 j)',
      eggsMonthProjection,
      'units',
      `Moyenne ${eggsDailyAvg.toLocaleString('fr-FR')} / jour`,
      'good',
      { module: 'elevage', tab: 'Lots & bandes' },
    ));
  }
  if (lotsUnderTreatment > 0) {
    items.push(baseItem(
      'lots-treatment',
      'Lots sous traitement',
      lotsUnderTreatment,
      'count',
      'Suivi sanitaire actif',
      'warn',
      { module: 'elevage', tab: 'Santé' },
    ));
  }

  return { items, hasData: items.length > 0 };
}

/** Cultures - parcelles à surveiller, récoltes attendues. */
export function buildCulturesModuleProjections(props = {}) {
  const cultures = arr(props.cultures);
  const parcelsWatch = cultures.filter((row) => {
    const status = String(row.statut || row.status || '').toLowerCase();
    return ['surveiller', 'stress', 'irrigation', 'alerte'].some((t) => status.includes(t));
  }).length;

  const harvestReady = cultures.filter((row) => {
    const status = String(row.statut || row.status || '').toLowerCase();
    return status.includes('recolte') || status.includes('récolte') || status.includes('matur');
  }).length;

  const items = [];
  if (parcelsWatch > 0) {
    items.push(baseItem(
      'parcels-watch',
      'Parcelles à surveiller',
      parcelsWatch,
      'count',
      'Irrigation, ravageurs ou météo',
      'warn',
      { module: 'cultures', tab: 'Parcelles & campagnes' },
    ));
  }
  if (harvestReady > 0) {
    items.push(baseItem(
      'harvest-ready',
      'Récoltes imminentes',
      harvestReady,
      'count',
      'Préparer stock et commercial',
      'good',
      { module: 'cultures', tab: 'Récoltes' },
    ));
  }

  return { items, hasData: items.length > 0 };
}
