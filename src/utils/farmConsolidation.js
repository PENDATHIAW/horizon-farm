/**
 * Consolidation et comparaison multi-fermes — Phase 5.
 */

import { normalizeFarmActivities } from '../config/farmActivities.js';
import {
  formatFarmActivitiesLabel,
  getFarmAlerts,
  getFarmKpis,
  getFarmQuickActions,
} from '../config/farmAdaptation.js';
import {
  computeCultureSummary,
  computeFarmHeadcount,
  computeStockSummary,
} from './farmMetricHelpers.js';
import { remainingForOrder } from './salesStatuses.js';
import { DEFAULT_FARM_ID, rowFarmId, shouldShowFarmSelector } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const orderAmount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const txAmount = (row = {}) => n(row.montant ?? row.amount ?? row.total);
const isIncomeTx = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(String(row.type || '').toLowerCase());
const isExpenseTx = (row = {}) => ['sortie', 'expense', 'out', 'charge', 'depense', 'dépense'].includes(String(row.type || '').toLowerCase());

function summarizeFarmFinance(slice = {}) {
  const ca = arr(slice.salesOrders).reduce((sum, row) => sum + orderAmount(row), 0);
  const cashNet = arr(slice.transactions).reduce((sum, row) => {
    if (isIncomeTx(row)) return sum + txAmount(row);
    if (isExpenseTx(row)) return sum - txAmount(row);
    return sum;
  }, 0);
  return { ca, cashNet };
}

const CLOSED_ALERT = ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'annule', 'annulé'];
const isOpenAlert = (row = {}) => !CLOSED_ALERT.includes(String(row.status || row.statut || 'nouvelle').toLowerCase());
const isOpenTask = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'clos'].includes(String(row.status || row.statut || '').toLowerCase());

export const ALL_FARMS_QUICK_ACTIONS = Object.freeze([
  { key: 'compare_farms', label: 'Comparer les fermes', module: 'gestion_systeme', tab: 'Fermes' },
  { key: 'global_alerts', label: 'Alertes globales', module: 'activite_suivi', tab: 'Alertes' },
  { key: 'consolidated_finance', label: 'Finances consolidées', module: 'finance_pilotage', tab: 'Trésorerie' },
  { key: 'critical_stock', label: 'Stocks critiques', module: 'achats_stock', tab: 'Stock' },
  { key: 'manage_farms', label: 'Gérer les fermes', module: 'gestion_systeme', tab: 'Fermes' },
]);

export const QUICK_ACTION_ROUTES = Object.freeze({
  create_lot: { module: 'elevage', tab: 'Avicole' },
  record_lay: { module: 'elevage', tab: 'Production' },
  record_mortality: { module: 'elevage', tab: 'Transformation' },
  add_feed: { module: 'achats_stock', tab: 'Stock' },
  create_egg_sale: { module: 'commercial', tab: 'Ventes' },
  create_broiler_batch: { module: 'elevage', tab: 'Avicole' },
  record_weight: { module: 'elevage', tab: 'Animaux' },
  create_broiler_sale: { module: 'commercial', tab: 'Ventes' },
  add_cattle: { module: 'elevage', tab: 'Animaux' },
  record_care: { module: 'elevage', tab: 'Santé' },
  record_live_sale: { module: 'commercial', tab: 'Ventes' },
  create_parcel: { module: 'cultures', tab: 'Résumé' },
  plan_sowing: { module: 'cultures', tab: 'Résumé' },
  record_treatment: { module: 'cultures', tab: 'Résumé' },
  record_harvest: { module: 'cultures', tab: 'Résumé' },
  compare_farms: { module: 'gestion_systeme', tab: 'Fermes' },
  global_alerts: { module: 'activite_suivi', tab: 'Alertes' },
  consolidated_finance: { module: 'finance_pilotage', tab: 'Trésorerie' },
  critical_stock: { module: 'achats_stock', tab: 'Stock' },
  manage_farms: { module: 'gestion_systeme', tab: 'Fermes' },
});

/** Lignes rattachées à une ferme — legacy sans farm_id → ferme par défaut. */
export function rowsForFarm(rows = [], farmId = '', legacyFarmId = DEFAULT_FARM_ID) {
  return arr(rows).filter((row) => {
    const ownFarm = rowFarmId(row);
    if (!ownFarm) return farmId === legacyFarmId;
    return ownFarm === farmId;
  });
}

export function sliceDataForFarm(farm = {}, dataProps = {}) {
  const farmId = farm.id;
  return {
    salesOrders: rowsForFarm(dataProps.salesOrdersAll || dataProps.salesOrders, farmId),
    payments: rowsForFarm(dataProps.paymentsAll || dataProps.payments, farmId),
    transactions: rowsForFarm(dataProps.transactionsAll || dataProps.transactions, farmId),
    stocks: rowsForFarm(dataProps.stocks, farmId),
    alertes: rowsForFarm(dataProps.alertes, farmId),
    taches: rowsForFarm(dataProps.taches, farmId),
    animaux: rowsForFarm(dataProps.animaux, farmId),
    lots: rowsForFarm(dataProps.lotsData || dataProps.lots, farmId),
    cultures: rowsForFarm(dataProps.cultures, farmId),
    productionLogs: rowsForFarm(dataProps.productionLogs, farmId),
    businessPlans: rowsForFarm(dataProps.businessPlans, farmId),
  };
}

export function computeFarmRowMetrics(farm = {}, dataProps = {}) {
  const slice = sliceDataForFarm(farm, dataProps);
  const finance = summarizeFarmFinance(slice);
  const stockSummary = computeStockSummary(slice.stocks);
  const headcount = computeFarmHeadcount({
    animaux: slice.animaux,
    lots: slice.lots,
    cultures: slice.cultures,
  });
  const cultureSummary = computeCultureSummary(slice.cultures);
  const openAlerts = slice.alertes.filter(isOpenAlert).length;
  const openTasks = slice.taches.filter(isOpenTask).length;
  const receivable = slice.salesOrders.reduce(
    (sum, order) => sum + remainingForOrder(order, slice.payments),
    0,
  );
  const ca = n(finance.ca);
  let exploitationScore = 78;
  if (openAlerts >= 4) exploitationScore -= 18;
  else if (openAlerts >= 2) exploitationScore -= 10;
  if (stockSummary.lowStockCount >= 3) exploitationScore -= 12;
  else if (stockSummary.lowStockCount >= 1) exploitationScore -= 6;
  if (finance.cashNet < 0) exploitationScore -= 15;
  if (ca <= 0 && headcount.total <= 0 && cultureSummary.parcelCount <= 0) exploitationScore = 45;
  exploitationScore = Math.max(0, Math.min(100, exploitationScore));

  const investorScore = Math.max(
    0,
    Math.min(100, exploitationScore + (slice.businessPlans.length ? 8 : 0) + (ca > 0 ? 5 : 0)),
  );
  const riskScore = openAlerts * 12 + stockSummary.lowStockCount * 8 + (finance.cashNet < 0 ? 25 : 0) + (receivable > ca * 0.5 && receivable > 0 ? 10 : 0);

  return {
    farmId: farm.id,
    name: farm.name,
    activities: formatFarmActivitiesLabel(farm.activity_type),
    activityTypes: normalizeFarmActivities(farm.activity_type),
    status: farm.status || 'active',
    region: farm.region || farm.location || '',
    country: farm.country || 'SN',
    location: farm.location || '',
    latitude: farm.latitude,
    longitude: farm.longitude,
    ca,
    cashNet: n(finance.cashNet),
    receivable,
    stockCritical: stockSummary.lowStockCount,
    stockValue: stockSummary.stockValue,
    alerts: openAlerts,
    tasks: openTasks,
    exploitationScore,
    investorScore,
    headcount: headcount.total,
    production: headcount.activeAvicole,
    parcelCount: cultureSummary.parcelCount,
    cultivatedAreaM2: cultureSummary.surfaceM2 || headcount.parcelSurfaceM2,
    riskScore,
    isLaunching: ca <= 0 && headcount.total <= 0 && cultureSummary.parcelCount <= 0,
    isDefault: Boolean(farm.is_default),
  };
}

export function buildAllFarmsDashboardContext(accessibleFarms = [], dataProps = {}) {
  const farms = arr(accessibleFarms).filter((farm) => farm.status !== 'archived');
  const comparisonRows = farms.map((farm) => computeFarmRowMetrics(farm, dataProps));
  const totals = comparisonRows.reduce(
    (acc, row) => ({
      ca: acc.ca + row.ca,
      cashNet: acc.cashNet + row.cashNet,
      receivable: acc.receivable + row.receivable,
      alerts: acc.alerts + row.alerts,
      tasks: acc.tasks + row.tasks,
      stockCritical: acc.stockCritical + row.stockCritical,
      headcount: acc.headcount + row.headcount,
      production: acc.production + row.production,
      parcelCount: acc.parcelCount + row.parcelCount,
    }),
    {
      ca: 0,
      cashNet: 0,
      receivable: 0,
      alerts: 0,
      tasks: 0,
      stockCritical: 0,
      headcount: 0,
      production: 0,
      parcelCount: 0,
    },
  );

  const byScore = [...comparisonRows].sort((a, b) => b.exploitationScore - a.exploitationScore);
  const byRisk = [...comparisonRows].sort((a, b) => b.riskScore - a.riskScore);
  const byAlerts = [...comparisonRows].sort((a, b) => b.alerts - a.alerts);

  return {
    activeFarmCount: farms.length,
    totals,
    avgExploitationScore: comparisonRows.length
      ? Math.round(comparisonRows.reduce((sum, row) => sum + row.exploitationScore, 0) / comparisonRows.length)
      : 0,
    avgInvestorScore: comparisonRows.length
      ? Math.round(comparisonRows.reduce((sum, row) => sum + row.investorScore, 0) / comparisonRows.length)
      : 0,
    comparisonRows,
    bestFarm: byScore[0] || null,
    riskiestFarm: byRisk[0] || null,
    mostAlertsFarm: byAlerts[0] || null,
    mostAdvancedFarm: byScore[0] || null,
    launchingFarms: comparisonRows.filter((row) => row.isLaunching),
    locationCards: buildFarmLocationCards(farms, comparisonRows),
  };
}

export function buildFarmLocationCards(farms = [], comparisonRows = []) {
  return arr(farms).map((farm) => {
    const metrics = comparisonRows.find((row) => row.farmId === farm.id) || {};
    return {
      id: farm.id,
      name: farm.name,
      region: farm.region || metrics.region || '—',
      commune: farm.settings?.location_details?.commune || farm.location || '—',
      country: farm.country || 'SN',
      latitude: farm.latitude,
      longitude: farm.longitude,
      activities: formatFarmActivitiesLabel(farm.activity_type),
      status: farm.status || 'active',
      score: metrics.exploitationScore ?? null,
      alerts: metrics.alerts ?? 0,
    };
  });
}

export function resolveQuickActionsForScope(farm = null, scope = {}, accessibleFarms = []) {
  if (scope?.mode === 'all' && shouldShowFarmSelector(accessibleFarms)) {
    return [...ALL_FARMS_QUICK_ACTIONS];
  }
  return getFarmQuickActions(farm);
}

export function buildActivityKpiCards(farm = {}, summary = {}, dataProps = {}) {
  const definitions = getFarmKpis(farm, { mode: 'single' });
  const head = summary.headcount || computeFarmHeadcount({
    animaux: dataProps.animaux,
    lots: dataProps.lotsData || dataProps.lots,
    cultures: dataProps.cultures,
  });
  const culture = summary.cultureSummary || computeCultureSummary(dataProps.cultures);
  const stock = summary.stockSummary || computeStockSummary(dataProps.stocks);
  const egg = summary.eggProduction || {};
  const fmt = (value) => (Number.isFinite(Number(value)) ? Number(value).toLocaleString('fr-FR') : '—');

  const valueMap = {
    lay_rate: egg.layRate != null ? `${fmt(egg.layRate)} %` : head.effectifPondeuses ? 'Actif' : '—',
    eggs_produced: fmt(summary.production || egg.eggsPeriod || egg.eggsAllTime),
    mortality: head.activeAvicole ? `${fmt(head.effectifAvicole)} volailles` : '—',
    feed_stock: stock.lowStockCount ? `${stock.lowStockCount} alerte(s)` : `${stock.availableProducts} OK`,
    egg_sales: fmt(summary.ca),
    broiler_count: fmt(head.effectifChair),
    avg_weight: '—',
    feed_cost: fmt(stock.stockValue),
    broiler_sales: fmt(summary.ca),
    cattle_count: fmt(head.activeAnimals),
    fattening_cost: fmt(summary.resultat),
    health: fmt(summary.alertesOuvertes),
    live_sales: fmt(summary.receivable),
    cultivated_area: culture.surfaceM2 ? `${fmt(Math.round(culture.surfaceM2 / 10000))} ha` : '—',
    active_parcels: fmt(culture.parcelCount),
    harvests: fmt(culture.activeCultures),
    yield: culture.surfaceM2 ? 'Suivi actif' : '—',
    irrigation: '—',
    weather_alerts: summary.alertesOuvertes ? `${summary.alertesOuvertes} alerte(s)` : 'Stable',
    storage_capacity: fmt(stock.totalProducts),
    stock_level: fmt(stock.availableProducts),
    expiry_risk: stock.lowStockCount ? `${stock.lowStockCount} sous seuil` : 'OK',
    sensors: fmt(arr(dataProps.sensorDevices).length),
    cameras: fmt(arr(dataProps.cameraDevices).length),
    weather_station: dataProps.meteo?.condition || '—',
    overview: fmt(summary.effectifs || head.total),
    consolidated: 'Vue groupe',
    farm_comparison: fmt(arr(dataProps.accessibleFarms).length),
    top_performance: '—',
    top_risk: '—',
  };

  return definitions.map((entry) => ({
    ...entry,
    value: valueMap[entry.key] || '—',
  }));
}

export function buildAdaptedAlertsPanel(farm = null, scope = {}, dataProps = {}, comparison = null) {
  if (scope?.mode === 'all' && comparison) {
    return [
      comparison.riskiestFarm ? `Ferme la plus à risque : ${comparison.riskiestFarm.name}` : null,
      comparison.mostAlertsFarm?.alerts ? `${comparison.mostAlertsFarm.name} — ${comparison.mostAlertsFarm.alerts} alerte(s)` : null,
      comparison.totals.stockCritical ? `${comparison.totals.stockCritical} produit(s) sous seuil (consolidé)` : null,
      comparison.totals.receivable ? `Créances consolidées à suivre` : null,
      comparison.totals.cashNet < 0 ? 'Trésorerie consolidée négative' : null,
    ].filter(Boolean);
  }
  return getFarmAlerts(farm);
}

export function buildHeyHorizonFarmContext(dataMap = {}) {
  const scope = dataMap.farmScope || {};
  const activeFarm = dataMap.activeFarm || null;
  const accessibleFarms = arr(dataMap.accessibleFarms);
  const dataProps = {
    salesOrdersAll: dataMap.sales_orders || dataMap.salesOrdersAll || [],
    paymentsAll: dataMap.payments || dataMap.paymentsAll || [],
    transactionsAll: dataMap.finances || dataMap.transactionsAll || [],
    stocks: dataMap.stock || dataMap.stocks || [],
    alertes: dataMap.alertes_center || dataMap.alertes || [],
    taches: dataMap.taches || dataMap.tasks || [],
    animaux: dataMap.animaux || [],
    lots: dataMap.avicole || dataMap.lots || [],
    cultures: dataMap.cultures || [],
    businessPlans: dataMap.business_plans || dataMap.businessPlans || [],
    accessibleFarms,
  };

  const comparison = scope.mode === 'all' && accessibleFarms.length > 1
    ? buildAllFarmsDashboardContext(accessibleFarms, dataProps)
    : null;

  const base = {
    activity_kpis: getFarmKpis(activeFarm || {}, scope).map((entry) => entry.label),
    activity_alerts: buildAdaptedAlertsPanel(activeFarm, scope, dataProps, comparison),
    activity_quick_actions: resolveQuickActionsForScope(activeFarm, scope, accessibleFarms).map((entry) => entry.label),
    suggested_questions: [],
  };

  if (scope.mode === 'all' && accessibleFarms.length > 1 && comparison) {
    return {
      ...base,
      farms_summary: comparison.comparisonRows,
      comparison_summary: {
        active_farms: comparison.activeFarmCount,
        best_farm: comparison.bestFarm?.name || null,
        riskiest_farm: comparison.riskiestFarm?.name || null,
        most_alerts_farm: comparison.mostAlertsFarm?.name || null,
        avg_exploitation_score: comparison.avgExploitationScore,
        totals: comparison.totals,
      },
      suggested_questions: [
        'Résume toutes les fermes',
        'Compare les fermes',
        'Quelle ferme est la plus à risque ?',
        'Quelle ferme est la plus performante ?',
      ],
    };
  }

  return {
    ...base,
    suggested_questions: [
      'Résume cette ferme',
      'Quelles sont les priorités de cette ferme ?',
      'Quels sont les risques de cette ferme ?',
    ],
  };
}
