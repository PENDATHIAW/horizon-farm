import { resolvePeriodContext, rowMatchesMonthKeys } from '../utils/periodScope';
import {
  activityMonthChartLabel,
  buildActivityYearInputFromDataMap,
  monthTargetForKey,
  planMonthIndexForKey,
  resolveActivityYearContext,
  sumTargetsForKeys,
} from '../utils/activityYear.js';
import { avicoleActiveCount } from '../utils/avicoleMetrics.js';
import { paymentsForOrder } from '../utils/financeConsolidationEngine.js';
import { HORIZON_FARM_OFFICIAL_BP } from './horizonFarmOfficialBusinessPlan';
import { buildTechnicalFarmingAlerts } from './technicalFarmingRules';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0) || 0;
const normalize = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
const safeDate = (value) => { const date = value ? new Date(value) : new Date(); return Number.isNaN(date.getTime()) ? new Date() : date; };
const monthOf = (row = {}) => String(row.date || row.created_at || row.date_commande || row.date_paiement || row.payment_date || row.order_date || row.sale_date || '').slice(0, 7);
const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total);
const paid = (row = {}) => num(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? row.amount);
const safeRun = (fn, fallback) => { try { return fn(); } catch (error) { console.warn('growthDecisionEngine fallback', error?.message || error); return fallback; } };

export const activityLabels = { global: 'Global ferme', oeufs: 'Œufs / Pondeuses', poulets_chair: 'Poulets de chair', animaux: 'Animaux global', bovins: 'Bovins', ovins: 'Ovins', caprins: 'Caprins', cultures: 'Cultures', stock: 'Stock / Produits', fumier_pondeuses: 'Fumier pondeuses', fumier_chair: 'Fumier chair', fumier_bovins: 'Fumier bœufs' };
export const annualRevenueTarget = HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal;
export const monthlyRevenueTargets = HORIZON_FARM_OFFICIAL_BP.revenue.monthly.map((row) => row.total);
export const monthlyWeights = monthlyRevenueTargets.map((value) => value / Math.max(1, annualRevenueTarget));
export const activityAnnualTargets = Object.fromEntries(HORIZON_FARM_OFFICIAL_BP.revenue.byActivity.map((row) => [row.activity, row.annual]));
export const defaultAnnualMix = Object.fromEntries(Object.entries(activityAnnualTargets).map(([key, value]) => [key, value / Math.max(1, annualRevenueTarget)]));

function dateOnly(date) { const d = safeDate(date); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function iso(date) { return safeDate(date).toISOString().slice(0, 10); }
function addDays(date, days) { const next = safeDate(date); next.setDate(next.getDate() + Number(days || 0)); return next; }
function daysBetween(a, b) { return Math.ceil((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000); }
function makeDate(year, month, day) { return new Date(year, month - 1, day); }

function classifyAnimalSpeciesFromText(raw = '') {
  if (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('bœuf') || raw.includes('vache') || raw.includes('taureau') || raw.includes('veau') || raw.includes('bov')) return 'bovins';
  if (raw.includes('ovin') || raw.includes('mouton') || raw.includes('belier') || raw.includes('brebis') || raw.includes(' ov')) return 'ovins';
  if (raw.includes('caprin') || raw.includes('chevre') || raw.includes('chèvre') || raw.includes('bouc') || raw.includes('cap')) return 'caprins';
  return '';
}
function findAnimalSpeciesById(sourceId = '', dataMap = {}) {
  if (!sourceId) return '';
  const animal = arr(dataMap.animaux).find((row) => String(row.id) === String(sourceId) || String(row.tag) === String(sourceId));
  if (!animal) return '';
  return classifyAnimalSpeciesFromText(normalize(`${animal.type || ''} ${animal.espece || ''} ${animal.name || ''} ${animal.id || ''} ${animal.tag || ''}`));
}

export function classifySaleActivity(order = {}, dataMap = {}) {
  return safeRun(() => {
    const raw = normalize(`${order.activity || ''} ${order.activite || ''} ${order.source_type || ''} ${order.type_vente || ''} ${order.product_type || ''} ${order.product_name || ''} ${order.libelle || ''} ${order.espece || ''} ${order.type_animal || ''} ${order.source_id || ''} ${order.related_id || ''}`);
    if (raw.includes('oeuf') || raw.includes('tablette') || raw.includes('plateau') || raw.includes('pondeuse')) return 'oeufs';
    if (raw.includes('chair') || raw.includes('poulet')) return 'poulets_chair';
    if (raw.includes('fumier') && (raw.includes('pondeuse') || raw.includes('oeuf'))) return 'fumier_pondeuses';
    if (raw.includes('fumier') && (raw.includes('chair') || raw.includes('poulet'))) return 'fumier_chair';
    if (raw.includes('fumier') && (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('bœuf'))) return 'fumier_bovins';
    const species = classifyAnimalSpeciesFromText(raw) || findAnimalSpeciesById(order.source_id || order.related_id || order.product_id || order.entity_id, dataMap);
    if (species) return species;
    if (raw.includes('animal')) return 'animaux';
    if (raw.includes('culture') || raw.includes('tomate') || raw.includes('pomme') || raw.includes('poivron') || raw.includes('recolte') || raw.includes('laitue') || raw.includes('piment')) return 'cultures';
    return 'stock';
  }, 'stock');
}


function saleInMonth(sale = {}, payments = [], monthKey = '', monthKeys = []) {
  if (monthKeys.length ? rowMatchesMonthKeys(sale, monthKeys) : monthOf(sale) === monthKey) return true;
  return paymentsForOrder(sale, payments).some((payment) => (monthKeys.length ? rowMatchesMonthKeys(payment, monthKeys) : monthOf(payment) === monthKey));
}

function filterSalesForPeriod(sales = [], payments = [], { monthKey = '', monthKeys = [], inYear1 = () => true, mode = 'month' } = {}) {
  if (mode === 'all') return arr(sales).filter(inYear1);
  if (monthKeys.length) return arr(sales).filter((sale) => saleInMonth(sale, payments, monthKey, monthKeys));
  return arr(sales).filter((sale) => saleInMonth(sale, payments, monthKey, []));
}

function buildFinanceRevenueOrders(dataMap = {}, currentMonth = '') {
  return arr(dataMap.finances || dataMap.transactions).filter((row) => monthOf(row) === currentMonth).filter((row) => normalize(row.type).includes('entree')).map((row) => ({ ...row, montant_total: amount(row), product_name: row.libelle || row.description || row.categorie, source_type: row.source_type || row.module_lie || row.activite, source_id: row.source_id || row.related_id }));
}
function mergeRevenueRows(sales = [], financeRevenue = []) {
  const seen = new Set(sales.map((row) => String(row.id || row.related_id || row.source_record_id || '')));
  return [...sales, ...financeRevenue.filter((row) => !seen.has(String(row.related_id || row.source_record_id || row.id || '')))];
}

export function buildCommercialCalendar(date = new Date(), activityYear = null) {
  return safeRun(() => {
    const ctx = activityYear || resolveActivityYearContext(buildActivityYearInputFromDataMap({}));
    const rows = ctx.year1MonthKeys.map((monthCode, index) => {
      const bpRow = HORIZON_FARM_OFFICIAL_BP.revenue.monthly[index] || {};
      return {
        month: index + 1,
        monthCode,
        label: activityMonthChartLabel(monthCode, ctx.year1MonthKeys),
        focus: ['oeufs', 'poulets_chair', 'bovins'].filter((activity) => {
          if (activity === 'oeufs') return bpRow.oeufs > 0;
          if (activity === 'poulets_chair') return bpRow.chair > 0;
          if (activity === 'bovins') return bpRow.bovins > 0;
          return false;
        }),
        target: bpRow.total || monthlyRevenueTargets[index] || 0,
        note: index === 2 ? 'M3 — à réconcilier avec la stratégie bovins validée.' : `Objectif CA M${index + 1} : ${(bpRow.total || monthlyRevenueTargets[index] || 0).toLocaleString('fr-FR')} FCFA.`,
      };
    });
    const currentIndex = planMonthIndexForKey(ctx.nowKey, ctx.year1MonthKeys);
    const baseIndex = currentIndex ?? 0;
    return {
      activityYear: ctx,
      current: rows[baseIndex] || rows[0],
      next: [1, 2, 3, 4, 5, 6].map((offset) => rows[(baseIndex + offset) % 12]),
      year: rows,
    };
  }, { current: null, next: [], year: [] });
}

function defaultEventsForYear(year) {
  return [
    { id: `tabaski-${year}`, label: 'Tabaski', date: makeDate(year, 5, 27), activities: ['bovins'], note: 'Date indicative à remplacer par le calendrier officiel/local.' },
    { id: `fin-annee-${year}`, label: 'Fin d’année', date: makeDate(year, 12, 24), activities: ['poulets_chair', 'oeufs', 'bovins'], note: 'Commandes groupées, restauration, familles.' },
    { id: `ramadan-${year}`, label: 'Ramadan', date: makeDate(year, 2, 17), activities: ['poulets_chair', 'oeufs'], note: 'Date indicative.' },
    { id: `korite-${year}`, label: 'Korité', date: makeDate(year, 3, 20), activities: ['poulets_chair', 'oeufs'], note: 'Date indicative.' },
  ];
}
export function buildMarketEvents(referenceDate = new Date(), dataMap = {}) {
  return safeRun(() => {
    const ref = safeDate(referenceDate);
    const customEvents = arr(dataMap.market_calendar_events || dataMap.marketCalendarEvents).map((event) => ({ id: event.id || event.code || event.nom, label: event.label || event.nom || event.title, date: safeDate(event.date || event.target_date || event.date_cible), activities: arr(event.activities || event.activites || event.focus), note: event.note || event.description || '', source: 'custom' })).filter((event) => event.label && !Number.isNaN(event.date.getTime()));
    const defaults = [ref.getFullYear(), ref.getFullYear() + 1].flatMap(defaultEventsForYear).map((event) => ({ ...event, source: 'default' }));
    return [...customEvents, ...defaults].filter((event) => event.date >= addDays(ref, -15) && event.date <= addDays(ref, 540)).sort((a, b) => a.date - b.date);
  }, []);
}

export function estimateLeadTimes(dataMap = {}) {
  return safeRun(() => {
    const avg = (values, fallback) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : fallback;
    const lots = arr(dataMap.avicole || dataMap.lots); const animaux = arr(dataMap.animaux);
    const speciesDays = (species) => animaux.filter((a) => normalize(`${a.type || ''} ${a.espece || ''} ${a.categorie || ''}`).includes(species)).map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours || a.delai_cible_vente_jours)).filter((v) => v > 0);
    return { oeufs: avg(lots.map((l) => num(l.days_to_lay || l.age_debut_ponte_jours || l.delai_ponte_jours)).filter((v) => v > 0), 150), poulets_chair: avg(lots.map((l) => num(l.cycle_days || l.duree_cycle || l.age_vente_jours)).filter((v) => v > 0 && v < 120), 40), animaux: avg(animaux.map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours || a.delai_cible_vente_jours)).filter((v) => v > 0), 90), bovins: avg(speciesDays('bovin'), 90), ovins: avg(speciesDays('ovin'), 90), caprins: avg(speciesDays('caprin'), 90), cultures: 90 };
  }, { oeufs: 150, poulets_chair: 40, animaux: 90, bovins: 90, ovins: 90, caprins: 90, cultures: 90 });
}

export function buildProductionCapacity(dataMap = {}) {
  return safeRun(() => {
    const lots = arr(dataMap.avicole || dataMap.lots); const logs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
    const activeLayers = lots.reduce((sum, lot) => { const label = normalize(`${lot.type || ''} ${lot.name || ''} ${lot.nom || ''}`); const status = normalize(lot.status || lot.statut || 'actif'); if ((!label.includes('pondeuse') && !label.includes('oeuf')) || ['vendu', 'perdu', 'termine', 'archive'].includes(status)) return sum; return sum + avicoleActiveCount(lot); }, 0);
    const recentLogs = logs.slice(-14); const recentEggs = recentLogs.reduce((sum, row) => sum + num(row.quantite || row.eggs || row.total_oeufs || row.oeufs_produits || row.oeufs), 0); const avgEggsDay = recentLogs.length ? recentEggs / Math.min(14, recentLogs.length) : 0;
    return { activeLayers, eggsDay: avgEggsDay, tabletsDay: avgEggsDay / 30, layingRate: activeLayers && avgEggsDay ? Math.round((avgEggsDay / activeLayers) * 100) : 0, layingRateKnown: Boolean(activeLayers && recentLogs.length), capacitySource: recentLogs.length ? 'production_logs' : 'unknown_no_logs' };
  }, { activeLayers: 0, eggsDay: 0, tabletsDay: 0, layingRate: 0, layingRateKnown: false, capacitySource: 'fallback' });
}

export function buildGoalPerformance(dataMap = {}, options = {}) {
  return safeRun(() => {
    const date = safeDate(options.date || new Date());
    const activityYear = options.activityYear || resolveActivityYearContext(buildActivityYearInputFromDataMap(dataMap));
    const annualTarget = num(options.annualTarget || dataMap?.growth_settings?.annual_ca_target || annualRevenueTarget);
    const periodScope = options.periodScope;
    const periodCtx = periodScope ? resolvePeriodContext(periodScope) : null;

    let sales = arr(dataMap.sales_orders || dataMap.salesOrders);
    let payments = arr(dataMap.payments);
    let finances = arr(dataMap.finances || dataMap.transactions);
    let monthTarget;
    let currentMonth;

    const inYear1 = (row) => activityYear.year1MonthSet.has(monthOf(row));

    if (periodCtx?.mode === 'all') {
      currentMonth = activityYear.year1Label;
      monthTarget = annualTarget;
      sales = filterSalesForPeriod(sales, payments, { inYear1, mode: 'all' });
      payments = payments.filter(inYear1);
      finances = finances.filter(inYear1);
    } else if (periodCtx?.mode === 'months') {
      const monthKeys = periodCtx.monthKeys || [];
      currentMonth = periodCtx.isSingleMonth ? monthKeys[0] : 'period';
      sales = filterSalesForPeriod(sales, payments, { monthKeys, mode: 'months' });
      payments = payments.filter((row) => rowMatchesMonthKeys(row, monthKeys));
      finances = finances.filter((row) => rowMatchesMonthKeys(row, monthKeys));
      monthTarget = sumTargetsForKeys(monthKeys, activityYear, monthlyRevenueTargets);
      if (!monthTarget) {
        monthTarget = monthKeys.reduce((sum, key) => {
          const index = planMonthIndexForKey(key, activityYear.year1MonthKeys);
          if (index === null) return sum;
          return sum + num(dataMap?.growth_settings?.monthly_targets?.[index] || monthlyRevenueTargets[index] || annualTarget / 12);
        }, 0);
      }
    } else {
      const nowKey = activityYear.nowKey && activityYear.year1MonthSet.has(activityYear.nowKey)
        ? activityYear.nowKey
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      currentMonth = nowKey;
      const planIndex = planMonthIndexForKey(nowKey, activityYear.year1MonthKeys);
      monthTarget = planIndex !== null
        ? num(dataMap?.growth_settings?.monthly_targets?.[planIndex] || monthlyRevenueTargets[planIndex] || annualTarget / 12)
        : monthTargetForKey(nowKey, activityYear, monthlyRevenueTargets) || annualTarget / 12;
      sales = filterSalesForPeriod(sales, payments, { monthKey: currentMonth, mode: 'month' });
      payments = payments.filter((row) => monthOf(row) === currentMonth);
      finances = finances.filter((row) => monthOf(row) === currentMonth);
    }

    const financeRevenue = finances.filter((row) => normalize(row.type).includes('entree')).map((row) => ({ ...row, montant_total: amount(row), product_name: row.libelle || row.description || row.categorie, source_type: row.source_type || row.module_lie || row.activite, source_id: row.source_id || row.related_id }));
    const revenueRows = mergeRevenueRows(sales, financeRevenue);
    const activities = Object.entries(activityAnnualTargets).reduce((acc, [key, target]) => ({ ...acc, [key]: { activity: key, label: activityLabels[key], target: monthTarget * (target / Math.max(1, annualRevenueTarget)), realized: 0 } }), {});
    let genericAnimalsRealized = 0;
    revenueRows.forEach((order) => { const key = classifySaleActivity(order, dataMap); if (activities[key]) activities[key].realized += amount(order); else if (key === 'animaux') genericAnimalsRealized += amount(order); });
    const animalGlobal = { activity: 'animaux', label: activityLabels.animaux, target: activities.bovins?.target || 0, realized: (activities.bovins?.realized || 0) + genericAnimalsRealized };
    animalGlobal.attainment = animalGlobal.target ? Math.round((animalGlobal.realized / animalGlobal.target) * 100) : 0;
    animalGlobal.remaining = Math.max(0, animalGlobal.target - animalGlobal.realized);
    const realized = Object.values(activities).reduce((sum, row) => sum + row.realized, 0) + genericAnimalsRealized;
    const paymentCash = payments.reduce((sum, row) => sum + paid(row), 0);
    const financeCash = finances.filter((f) => normalize(f.type).includes('entree')).reduce((sum, row) => sum + amount(row), 0);
    const encaisse = Math.min(realized, Math.max(paymentCash, financeCash));
    const depenses = finances.filter((f) => normalize(f.type).includes('sortie')).reduce((sum, row) => sum + amount(row), 0);
    const year1Actual = arr(dataMap.sales_orders || dataMap.salesOrders).filter(inYear1).reduce((sum, row) => sum + amount(row), 0);
    return {
      activityYear,
      global: {
        activity: 'global',
        label: activityLabels.global,
        annualTarget,
        monthTarget,
        weekTarget: monthTarget / 4.33,
        realized,
        encaisse,
        depenses,
        marge: realized - depenses,
        attainment: monthTarget ? Math.round((realized / monthTarget) * 100) : 0,
        remaining: Math.max(0, monthTarget - realized),
        cashRate: realized ? Math.min(100, Math.round((encaisse / realized) * 100)) : 0,
        year1Actual,
        year1Attainment: annualTarget ? Math.round((year1Actual / annualTarget) * 100) : 0,
      },
      activities: [...Object.values(activities), animalGlobal].map((row) => ({ ...row, attainment: row.target ? Math.round((row.realized / row.target) * 100) : 0, remaining: Math.max(0, row.target - row.realized) })).sort((a, b) => b.target - a.target),
      currentMonth,
    };
  }, fallbackGoals(options));
}

function fallbackGoals(options = {}) {
  const activityYear = options.activityYear || resolveActivityYearContext(buildActivityYearInputFromDataMap(options.dataMap || {}));
  const planIndex = activityYear.currentPlanMonthIndex ?? new Date().getMonth();
  const annualTarget = num(options.annualTarget || annualRevenueTarget);
  const monthTarget = monthlyRevenueTargets[planIndex] || annualTarget / 12;
  const activities = Object.entries(activityAnnualTargets).map(([key, target]) => ({ activity: key, label: activityLabels[key], target: monthTarget * (target / Math.max(1, annualRevenueTarget)), realized: 0, attainment: 0, remaining: monthTarget * (target / Math.max(1, annualRevenueTarget)) }));
  return {
    activityYear,
    global: { activity: 'global', label: activityLabels.global, annualTarget, monthTarget, weekTarget: monthTarget / 4.33, realized: 0, encaisse: 0, depenses: 0, marge: 0, attainment: 0, remaining: monthTarget, cashRate: 0, year1Actual: 0, year1Attainment: 0 },
    activities,
    currentMonth: activityYear.nowKey,
  };
}

function priorityFromSeverity(severity = '') { const value = normalize(severity); if (value.includes('critique') || value.includes('urgence')) return 'haute'; if (value.includes('warning')) return 'moyenne'; return 'basse'; }
function activityFromTechnicalAlert(alert = {}) { const text = normalize(`${alert.module_source || ''} ${alert.entity_type || ''} ${alert.title || ''} ${alert.message || ''}`); if (text.includes('pondeuse') || text.includes('oeuf')) return 'oeufs'; if (text.includes('chair') || text.includes('poulet')) return 'poulets_chair'; if (text.includes('bovin')) return 'bovins'; if (text.includes('ovin')) return 'ovins'; if (text.includes('caprin')) return 'caprins'; if (text.includes('animal')) return 'animaux'; if (text.includes('stock')) return 'stock'; if (text.includes('culture')) return 'cultures'; return 'global'; }
function buildTechnicalRecommendation(alert = {}) { const activity = activityFromTechnicalAlert(alert); return { id: `technical-${alert.id || alert.decision_key || Math.random().toString(36).slice(2)}`, title: alert.title || 'Alerte technique', activity, priority: priorityFromSeverity(alert.severity), timing: alert.message || alert.description || '', recommendation: alert.action_recommandee || alert.recommendation || 'Vérifier et traiter cette alerte.', event_label: 'Technique', event_note: alert.message || '', target_date: alert.due_date || alert.event_date || '', timing_status: 'technical_alert', timing_status_label: 'Alerte technique', should_recommend_investment: false, demand_level: 'technique', coverage_status: 'technique', technical_alert: alert }; }

export function buildGrowthRecommendations(dataMap = {}, options = {}) {
  return safeRun(() => {
    const goals = buildGoalPerformance(dataMap, options);
    const capacity = buildProductionCapacity(dataMap);
    const base = ['oeufs', 'poulets_chair', 'bovins'].map((activity) => {
      const activityGoal = arr(goals.activities).find((row) => row.activity === activity);
      const priority = Number(activityGoal?.remaining || 0) > 0 ? 'haute' : 'moyenne';
      const recommendation = activity === 'oeufs'
        ? `Capacité estimée : ${Math.round(capacity.tabletsDay || 0)} tablette(s)/jour${capacity.layingRateKnown ? `, taux de ponte ${capacity.layingRate}%` : ', taux de ponte à renseigner par les logs'}.`
        : activity === 'poulets_chair'
          ? 'Piloter les bandes de 500 poussins : vente à J+40 puis roulement tous les 15 jours.'
          : 'Respecter le pipeline bovins : M4 vend M1, M5 vend M2, M6 vend M3, puis vente/rachat mensuel.';
      return { id: `goal-${activity}`, title: `Cap ${activityLabels[activity]}`, activity, priority, timing: `Reste à réaliser : ${(Number(activityGoal?.remaining || 0)).toLocaleString('fr-FR')} FCFA`, recommendation, should_recommend_investment: Number(activityGoal?.remaining || 0) > 0, demand_revenue: Number(activityGoal?.target || 0), available_revenue: Number(activityGoal?.realized || 0), gap_revenue: Number(activityGoal?.remaining || 0), coverage_rate: Number(activityGoal?.attainment || 0), coverage_status: Number(activityGoal?.attainment || 0) >= 100 ? 'couvert' : 'insuffisant', capacity };
    });
    const technical = safeRun(() => buildTechnicalFarmingAlerts(dataMap).map(buildTechnicalRecommendation), []);
    return [...base, ...technical].sort((a, b) => ({ haute: 3, moyenne: 2, basse: 1 }[b.priority] - { haute: 3, moyenne: 2, basse: 1 }[a.priority]));
  }, []);
}

export function buildDecisionCenterPlan(dataMap = {}, options = {}) {
  return safeRun(() => {
    const activityYear = resolveActivityYearContext(buildActivityYearInputFromDataMap(dataMap));
    const goals = buildGoalPerformance(dataMap, { ...options, activityYear }) || fallbackGoals({ ...options, activityYear, dataMap });
    const recommendations = buildGrowthRecommendations(dataMap, { ...options, activityYear }) || [];
    const leadTimes = estimateLeadTimes(dataMap) || { oeufs: 150, poulets_chair: 40, animaux: 90, bovins: 90, ovins: 90, caprins: 90, cultures: 90 };
    const capacity = buildProductionCapacity(dataMap) || { activeLayers: 0, eggsDay: 0, tabletsDay: 0, layingRate: 0 };
    const calendar = buildCommercialCalendar(options.date || new Date(), activityYear) || { current: null, next: [], year: [] };
    return { activityYear, goals, recommendations, leadTimes, capacity, calendar, generated_at: new Date().toISOString() };
  }, { activityYear: resolveActivityYearContext({}), goals: fallbackGoals(options), recommendations: [], leadTimes: { oeufs: 150, poulets_chair: 40, animaux: 90, bovins: 90, ovins: 90, caprins: 90, cultures: 90 }, capacity: { activeLayers: 0, eggsDay: 0, tabletsDay: 0, layingRate: 0 }, calendar: buildCommercialCalendar(options.date || new Date()), generated_at: new Date().toISOString() });
}

export default buildDecisionCenterPlan;
