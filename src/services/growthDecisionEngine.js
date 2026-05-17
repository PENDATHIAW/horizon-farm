import { buildFarmSupplyCoverage, buildMonthlyDemandForecast, findDemandCoverageForActivity } from './farmDemandCoverageEngine';
import { buildTechnicalFarmingAlerts } from './technicalFarmingRules';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_-]/g, ' ').replace(/\s+/g, ' ').trim();
const monthOf = (row = {}) => String(row.date || row.created_at || row.date_commande || row.date_paiement || '').slice(0, 7);
const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total);
const paid = (row = {}) => num(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? row.amount);

export const activityLabels = {
  global: 'Global ferme',
  oeufs: 'Œufs / Pondeuses',
  poulets_chair: 'Poulets de chair',
  animaux: 'Animaux global',
  bovins: 'Bovins',
  ovins: 'Ovins',
  caprins: 'Caprins',
  cultures: 'Cultures',
  stock: 'Stock / Produits',
};

export const monthlyWeights = [0.07, 0.07, 0.08, 0.08, 0.08, 0.09, 0.08, 0.08, 0.08, 0.08, 0.1, 0.11];
export const defaultAnnualMix = { oeufs: 0.32, poulets_chair: 0.22, bovins: 0.12, ovins: 0.09, caprins: 0.05, cultures: 0.15, stock: 0.05 };

function dateOnly(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function iso(date) { return date.toISOString().slice(0, 10); }
function addDays(date, days) { const next = new Date(date); next.setDate(next.getDate() + Number(days || 0)); return next; }
function daysBetween(a, b) { return Math.ceil((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000); }
function makeDate(year, month, day) { return new Date(year, month - 1, day); }

function classifyAnimalSpeciesFromText(raw = '') {
  if (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('vache') || raw.includes('taureau') || raw.includes('veau') || raw.includes('bov')) return 'bovins';
  if (raw.includes('ovin') || raw.includes('mouton') || raw.includes('belier') || raw.includes('brebis') || raw.includes(' ov')) return 'ovins';
  if (raw.includes('caprin') || raw.includes('chevre') || raw.includes('bouc') || raw.includes('cap')) return 'caprins';
  return '';
}

function findAnimalSpeciesById(sourceId = '', dataMap = {}) {
  if (!sourceId) return '';
  const clean = normalize(sourceId);
  const direct = classifyAnimalSpeciesFromText(clean);
  if (direct) return direct;
  const animal = arr(dataMap.animaux).find((row) => String(row.id) === String(sourceId) || String(row.tag) === String(sourceId));
  if (!animal) return '';
  return classifyAnimalSpeciesFromText(normalize(`${animal.type || ''} ${animal.espece || ''} ${animal.name || ''} ${animal.id || ''} ${animal.tag || ''}`));
}

export function classifySaleActivity(order = {}, dataMap = {}) {
  const raw = normalize(`${order.activite || ''} ${order.source_type || ''} ${order.type_vente || ''} ${order.product_type || ''} ${order.product_name || ''} ${order.libelle || ''} ${order.espece || ''} ${order.type_animal || ''} ${order.source_id || ''} ${order.related_id || ''}`);
  if (raw.includes('oeuf') || raw.includes('tablette') || raw.includes('plateau') || raw.includes('pondeuse')) return 'oeufs';
  if (raw.includes('chair') || raw.includes('poulet')) return 'poulets_chair';
  const species = classifyAnimalSpeciesFromText(raw) || findAnimalSpeciesById(order.source_id || order.related_id || order.product_id || order.entity_id, dataMap);
  if (species) return species;
  if (raw.includes('animal')) return 'animaux';
  if (raw.includes('culture') || raw.includes('tomate') || raw.includes('pomme') || raw.includes('poivron') || raw.includes('recolte') || raw.includes('laitue') || raw.includes('piment')) return 'cultures';
  if (raw.includes('stock') || raw.includes('produit')) return 'stock';
  return 'stock';
}

function buildFinanceRevenueOrders(dataMap = {}, currentMonth = '') {
  return arr(dataMap.finances || dataMap.transactions)
    .filter((row) => monthOf(row) === currentMonth)
    .filter((row) => normalize(row.type).includes('entree'))
    .map((row) => ({
      ...row,
      montant_total: amount(row),
      product_name: row.libelle || row.description || row.categorie,
      source_type: row.source_type || row.module_lie || row.activite,
      source_id: row.source_id || row.related_id,
    }));
}

function mergeRevenueRows(sales = [], financeRevenue = []) {
  const seen = new Set(sales.map((row) => String(row.id || row.related_id || row.source_record_id || '')));
  return [...sales, ...financeRevenue.filter((row) => !seen.has(String(row.related_id || row.source_record_id || row.id || '')))];
}

export function buildCommercialCalendar(date = new Date()) {
  const month = date.getMonth() + 1;
  const rows = [
    { month: 1, label: 'Janvier', focus: ['poulets_chair', 'oeufs'], note: 'Reprise, bilan cash, cycles courts.' },
    { month: 2, label: 'Février', focus: ['oeufs', 'poulets_chair'], note: 'Préparer périodes alimentaires fortes selon calendrier annuel.' },
    { month: 3, label: 'Mars', focus: ['oeufs', 'poulets_chair'], note: 'Demande alimentaire possible, surveiller cash et créances.' },
    { month: 4, label: 'Avril', focus: ['oeufs', 'cultures'], note: 'Relance et préparation investissements longs.' },
    { month: 5, label: 'Mai', focus: ['cultures', 'bovins', 'ovins', 'caprins'], note: 'Contrôler les deadlines et préparer les prochaines fenêtres, pas seulement l’événement proche.' },
    { month: 6, label: 'Juin', focus: ['bovins', 'ovins', 'caprins'], note: 'Fenêtres animales possibles uniquement si les mises en place ont été faites à temps.' },
    { month: 7, label: 'Juillet', focus: ['cultures', 'oeufs'], note: 'Suivi cultures, santé, alimentation et prochaines opportunités.' },
    { month: 8, label: 'Août', focus: ['cultures', 'bovins', 'ovins', 'caprins'], note: 'Préparer fenêtres religieuses/locales et commerce de rentrée.' },
    { month: 9, label: 'Septembre', focus: ['oeufs', 'poulets_chair', 'bovins', 'ovins', 'caprins'], note: 'Fenêtres Gamou/Magal à confirmer, reprise commerce, préparation fin d’année.' },
    { month: 10, label: 'Octobre', focus: ['poulets_chair', 'oeufs'], note: 'Précommandes et mise en place cycles courts pour fin d’année.' },
    { month: 11, label: 'Novembre', focus: ['poulets_chair', 'oeufs'], note: 'Préparer fin d’année, sécuriser clients cash.' },
    { month: 12, label: 'Décembre', focus: ['poulets_chair', 'oeufs', 'bovins', 'ovins', 'caprins'], note: 'Fin d’année : commandes groupées, restauration, familles, livraisons.' },
  ];
  return { current: rows.find((row) => row.month === month), next: [1, 2, 3, 4, 5, 6].map((offset) => rows[(month - 1 + offset) % 12]), year: rows };
}

function defaultEventsForYear(year) {
  return [
    { id: `tabaski-${year}`, label: 'Tabaski', date: makeDate(year, 5, 27), activities: ['ovins', 'bovins', 'caprins'], note: 'Date indicative à remplacer par le calendrier officiel/local.' },
    { id: `gamou-${year}`, label: 'Gamou', date: makeDate(year, 9, 5), activities: ['ovins', 'bovins', 'caprins', 'poulets_chair', 'oeufs'], note: 'Fenêtre indicative : à confirmer dans le calendrier local.' },
    { id: `magal-${year}`, label: 'Magal', date: makeDate(year, 8, 20), activities: ['ovins', 'bovins', 'caprins', 'poulets_chair', 'oeufs'], note: 'Fenêtre indicative : à confirmer dans le calendrier local.' },
    { id: `fin-annee-${year}`, label: 'Fin d’année', date: makeDate(year, 12, 24), activities: ['poulets_chair', 'oeufs', 'bovins', 'ovins', 'caprins'], note: 'Commandes groupées, restauration, familles, livraison.' },
    { id: `ramadan-${year}`, label: 'Ramadan', date: makeDate(year, 2, 17), activities: ['poulets_chair', 'oeufs'], note: 'Date indicative : à confirmer chaque année.' },
    { id: `korite-${year}`, label: 'Korité', date: makeDate(year, 3, 20), activities: ['poulets_chair', 'oeufs'], note: 'Date indicative : à confirmer chaque année.' },
  ];
}

export function buildMarketEvents(referenceDate = new Date(), dataMap = {}) {
  const customEvents = arr(dataMap.market_calendar_events || dataMap.marketCalendarEvents).map((event) => ({
    id: event.id || event.code || event.nom,
    label: event.label || event.nom || event.title,
    date: new Date(event.date || event.target_date || event.date_cible),
    activities: arr(event.activities || event.activites || event.focus),
    note: event.note || event.description || '',
    source: 'custom',
  })).filter((event) => event.label && !Number.isNaN(event.date.getTime()));

  const year = referenceDate.getFullYear();
  const defaults = [year, year + 1, year + 2].flatMap(defaultEventsForYear).map((event) => ({ ...event, source: 'default' }));
  const minDate = addDays(referenceDate, -15);
  const maxDate = addDays(referenceDate, 540);
  return [...customEvents, ...defaults].filter((event) => event.date >= minDate && event.date <= maxDate).sort((a, b) => a.date - b.date);
}

function buildTimingWindow({ activity, event, leadTime, referenceDate }) {
  const targetDate = event.date;
  const latestStart = addDays(targetDate, -leadTime);
  const earliestStart = addDays(latestStart, -Math.max(14, Math.round(leadTime * 0.35)));
  const remainingDays = daysBetween(referenceDate, targetDate);
  const daysBeforeDeadline = daysBetween(referenceDate, latestStart);
  let status = 'in_time';
  let label = 'Dans les temps';
  let shouldRecommendInvestment = true;
  if (daysBeforeDeadline < 0) {
    status = 'too_late';
    label = 'Trop tard pour cette fenêtre';
    shouldRecommendInvestment = false;
  } else if (daysBeforeDeadline <= 7) {
    status = 'urgent_deadline';
    label = 'Deadline très proche';
  } else if (daysBeforeDeadline <= 21) {
    status = 'prepare_now';
    label = 'À préparer maintenant';
  }
  return { activity, eventId: event.id, eventLabel: event.label, eventNote: event.note || '', targetDate: iso(targetDate), earliestStart: iso(earliestStart), latestStart: iso(latestStart), leadTime, remainingDays, daysBeforeDeadline, status, statusLabel: label, shouldRecommendInvestment, tooLateReason: shouldRecommendInvestment ? '' : `La fenêtre ${event.label} est trop proche : ${remainingDays} jour(s) restants pour ${leadTime} jour(s) nécessaires.` };
}

function selectRollingWindow(activity, events, leadTime, referenceDate) {
  const activityEvents = events.filter((event) => arr(event.activities).includes(activity));
  const windows = activityEvents.map((event) => buildTimingWindow({ activity, event, leadTime, referenceDate }));
  const viable = windows.find((window) => window.status !== 'too_late');
  const missed = windows.find((window) => window.status === 'too_late');
  return viable || missed || null;
}

export function estimateLeadTimes(dataMap = {}) {
  const avg = (values, fallback) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : fallback;
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const cultures = arr(dataMap.cultures);
  const speciesDays = (species) => animaux.filter((a) => normalize(`${a.type || ''} ${a.espece || ''} ${a.categorie || ''}`).includes(species)).map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours || a.delai_cible_vente_jours)).filter((v) => v > 0);
  return { oeufs: avg(lots.map((l) => num(l.days_to_lay || l.age_debut_ponte_jours || l.delai_ponte_jours)).filter((v) => v > 0), 150), poulets_chair: avg(lots.map((l) => num(l.cycle_days || l.duree_cycle || l.age_vente_jours)).filter((v) => v > 0 && v < 120), 42), animaux: avg(animaux.map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours || a.delai_cible_vente_jours)).filter((v) => v > 0), 90), bovins: avg(speciesDays('bovin'), 90), ovins: avg(speciesDays('ovin'), 90), caprins: avg(speciesDays('caprin'), 90), cultures: avg(cultures.map((c) => num(c.cycle_days || c.duree_cycle || c.jours_avant_recolte)).filter((v) => v > 0), 90) };
}

export function buildProductionCapacity(dataMap = {}) {
  const lots = arr(dataMap.avicole || dataMap.lots);
  const logs = arr(dataMap.production_oeufs_logs || dataMap.productionLogs);
  const activeLayers = lots.reduce((sum, lot) => {
    const label = normalize(`${lot.type || ''} ${lot.name || ''} ${lot.nom || ''}`);
    const status = normalize(lot.status || lot.statut || 'actif');
    if ((!label.includes('pondeuse') && !label.includes('oeuf')) || ['vendu', 'perdu', 'termine'].includes(status)) return sum;
    return sum + num(lot.current_count ?? lot.effectif_actuel ?? lot.count ?? lot.initial_count);
  }, 0);
  const recentEggs = logs.slice(-14).reduce((sum, row) => sum + num(row.quantite || row.eggs || row.total_oeufs || row.oeufs_produits || row.oeufs), 0);
  const avgEggsDay = logs.length ? recentEggs / Math.min(14, logs.length) : 0;
  const eggsDay = avgEggsDay || activeLayers * 0.72;
  return { activeLayers, eggsDay, tabletsDay: eggsDay / 30, layingRate: activeLayers ? Math.round((eggsDay / activeLayers) * 100) : 0 };
}

export function buildGoalPerformance(dataMap = {}, options = {}) {
  const date = options.date || new Date();
  const annualTarget = num(options.annualTarget || dataMap?.growth_settings?.annual_ca_target || 120000000);
  const monthTarget = annualTarget * (monthlyWeights[date.getMonth()] || 1 / 12);
  const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders).filter((row) => monthOf(row) === currentMonth);
  const payments = arr(dataMap.payments).filter((row) => monthOf(row) === currentMonth);
  const finances = arr(dataMap.finances || dataMap.transactions).filter((row) => monthOf(row) === currentMonth);
  const revenueRows = mergeRevenueRows(sales, buildFinanceRevenueOrders(dataMap, currentMonth));
  const activities = Object.keys(defaultAnnualMix).reduce((acc, key) => ({ ...acc, [key]: { activity: key, label: activityLabels[key], target: monthTarget * defaultAnnualMix[key], realized: 0 } }), {});
  revenueRows.forEach((order) => {
    const key = classifySaleActivity(order, dataMap);
    if (activities[key]) activities[key].realized += amount(order);
    else if (key === 'animaux') {
      const split = amount(order) / 3;
      activities.bovins.realized += split;
      activities.ovins.realized += split;
      activities.caprins.realized += split;
    }
  });
  const animalGlobal = { activity: 'animaux', label: activityLabels.animaux, target: activities.bovins.target + activities.ovins.target + activities.caprins.target, realized: activities.bovins.realized + activities.ovins.realized + activities.caprins.realized };
  animalGlobal.attainment = animalGlobal.target ? Math.round((animalGlobal.realized / animalGlobal.target) * 100) : 0;
  animalGlobal.remaining = Math.max(0, animalGlobal.target - animalGlobal.realized);
  const realized = Object.values(activities).reduce((sum, row) => sum + row.realized, 0);
  const encaisse = Math.max(payments.reduce((sum, row) => sum + paid(row), 0), finances.filter((f) => normalize(f.type).includes('entree')).reduce((sum, row) => sum + amount(row), 0));
  const depenses = finances.filter((f) => normalize(f.type).includes('sortie')).reduce((sum, row) => sum + amount(row), 0);
  return { global: { activity: 'global', label: activityLabels.global, annualTarget, monthTarget, weekTarget: monthTarget / 4.33, realized, encaisse, depenses, marge: realized - depenses, attainment: monthTarget ? Math.round((realized / monthTarget) * 100) : 0, remaining: Math.max(0, monthTarget - realized), cashRate: realized ? Math.round((encaisse / realized) * 100) : 0 }, activities: [...Object.values(activities), animalGlobal].map((row) => ({ ...row, attainment: row.target ? Math.round((row.realized / row.target) * 100) : 0, remaining: Math.max(0, row.target - row.realized) })).sort((a, b) => b.realized - a.realized), currentMonth };
}

function buildCoverageDecision(activity, coverageRow, timingWindow) {
  if (!coverageRow) return { action: 'Données demande/capacité insuffisantes.', priorityModifier: 0 };
  if (coverageRow.coverageStatus === 'couvert') return { action: `Demande ${coverageRow.demandLevel} mais capacité couverte à ${coverageRow.coverageRate}%. Priorité : vendre, sécuriser clients et éviter surinvestissement.`, priorityModifier: -1 };
  if (!timingWindow?.shouldRecommendInvestment) return { action: `${timingWindow.tooLateReason} Capacité actuelle couvre ${coverageRow.coverageRate}% seulement, mais il faut viser la prochaine fenêtre viable.`, priorityModifier: 0 };
  if (coverageRow.demandLevel === 'forte' && coverageRow.coverageStatus === 'insuffisant') return { action: `Demande forte et capacité insuffisante : écart ${coverageRow.gapUnits} unité(s), environ ${coverageRow.gapRevenue.toLocaleString('fr-FR')} FCFA à couvrir. Investissement ou précommandes à étudier.`, priorityModifier: 1 };
  if (coverageRow.coverageStatus === 'partiel') return { action: `Capacité partielle (${coverageRow.coverageRate}%). Compléter par précommandes, stock existant ou investissement limité.`, priorityModifier: 0 };
  return { action: `Capacité insuffisante (${coverageRow.coverageRate}%). Écart estimé ${coverageRow.gapUnits} unité(s).`, priorityModifier: 0 };
}

function priorityWithCoverage(base, modifier) {
  const order = ['basse', 'moyenne', 'haute'];
  const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(base) + modifier));
  return order[idx] || base;
}

function buildRecommendation({ activity, title, priority, recommendation, timingWindow, coverageRow, capacity }) {
  if (!timingWindow) return null;
  const coverageDecision = buildCoverageDecision(activity, coverageRow, timingWindow);
  const timing = `${timingWindow.statusLabel} · cible ${timingWindow.eventLabel} (${timingWindow.targetDate}) · mise en place ${timingWindow.earliestStart} → ${timingWindow.latestStart}`;
  const finalRecommendation = `${recommendation} ${coverageDecision.action}`;
  return {
    id: `${activity}-${timingWindow.eventId}`,
    title,
    activity,
    priority: priorityWithCoverage(timingWindow.shouldRecommendInvestment ? priority : 'basse', coverageDecision.priorityModifier),
    timing,
    recommendation: finalRecommendation,
    event_label: timingWindow.eventLabel,
    event_note: timingWindow.eventNote,
    target_date: timingWindow.targetDate,
    earliest_start: timingWindow.earliestStart,
    latest_start: timingWindow.latestStart,
    lead_time_days: timingWindow.leadTime,
    timing_status: timingWindow.status,
    timing_status_label: timingWindow.statusLabel,
    should_recommend_investment: timingWindow.shouldRecommendInvestment && coverageRow?.coverageStatus !== 'couvert',
    demand_level: coverageRow?.demandLevel || 'inconnue',
    demand_index: coverageRow?.demandIndex || 0,
    demand_units: coverageRow?.estimatedUnits || 0,
    demand_revenue: coverageRow?.revenueTarget || 0,
    available_units: coverageRow?.availableUnits || 0,
    available_revenue: coverageRow?.availableRevenue || 0,
    coverage_rate: coverageRow?.coverageRate || 0,
    coverage_status: coverageRow?.coverageStatus || 'inconnu',
    gap_units: coverageRow?.gapUnits || 0,
    gap_revenue: coverageRow?.gapRevenue || 0,
    capacity,
  };
}

function priorityFromSeverity(severity = '') {
  const value = normalize(severity);
  if (value.includes('critique') || value.includes('urgence')) return 'haute';
  if (value.includes('warning')) return 'moyenne';
  return 'basse';
}

function activityFromTechnicalAlert(alert = {}) {
  const text = normalize(`${alert.module_source || ''} ${alert.entity_type || ''} ${alert.title || ''} ${alert.message || ''}`);
  if (text.includes('pondeuse') || text.includes('oeuf')) return 'oeufs';
  if (text.includes('chair') || text.includes('poulet')) return 'poulets_chair';
  if (text.includes('bovin')) return 'bovins';
  if (text.includes('ovin')) return 'ovins';
  if (text.includes('caprin')) return 'caprins';
  if (text.includes('animal')) return 'animaux';
  if (text.includes('stock')) return 'stock';
  if (text.includes('culture')) return 'cultures';
  return 'global';
}

function buildTechnicalRecommendation(alert = {}) {
  const priority = priorityFromSeverity(alert.severity);
  return {
    id: `tech-${alert.id}`,
    title: alert.title || 'Règle technique terrain à traiter',
    activity: activityFromTechnicalAlert(alert),
    priority,
    timing: priority === 'haute' ? 'Action terrain prioritaire' : 'Action terrain à planifier',
    recommendation: alert.action_recommandee || alert.message || 'Vérifier la conduite terrain et corriger l’écart détecté.',
    event_label: 'Conduite technique',
    event_note: alert.message || '',
    target_date: iso(new Date()),
    earliest_start: iso(new Date()),
    latest_start: iso(new Date()),
    lead_time_days: 0,
    timing_status: priority === 'haute' ? 'urgent_deadline' : 'prepare_now',
    timing_status_label: priority === 'haute' ? 'À traiter rapidement' : 'À planifier',
    should_recommend_investment: false,
    demand_level: 'technique',
    demand_index: 0,
    demand_units: 0,
    demand_revenue: 0,
    available_units: 0,
    available_revenue: 0,
    coverage_rate: 0,
    coverage_status: 'conduite_terrain',
    gap_units: 0,
    gap_revenue: 0,
    capacity: null,
    source_alert_id: alert.id,
    source_module: alert.module_source,
    entity_type: alert.entity_type,
    entity_id: alert.entity_id,
    technical_rule: true,
  };
}

export function buildDecisionCenterPlan(dataMap = {}, options = {}) {
  const referenceDate = options.date || new Date();
  const calendar = buildCommercialCalendar(referenceDate);
  const leadTimes = estimateLeadTimes(dataMap);
  const capacity = buildProductionCapacity(dataMap);
  const goals = buildGoalPerformance(dataMap, options);
  const events = buildMarketEvents(referenceDate, dataMap);
  const demandForecast = buildMonthlyDemandForecast(dataMap, events, { date: referenceDate, annualTarget: goals.global.annualTarget, months: 12 });
  const coverage = buildFarmSupplyCoverage(dataMap, demandForecast);
  const recommendations = [];

  const addForActivity = (activity, config) => {
    const timingWindow = selectRollingWindow(activity, events, leadTimes[activity], referenceDate);
    const coverageRow = findDemandCoverageForActivity(coverage, activity, timingWindow?.targetDate);
    const recommendation = buildRecommendation({ activity, timingWindow, coverageRow, ...config });
    if (recommendation) recommendations.push(recommendation);
  };

  addForActivity('oeufs', { title: capacity.tabletsDay ? 'Comparer demande œufs et capacité pondeuses' : 'Construire capacité pondeuses', priority: capacity.layingRate < 68 ? 'haute' : 'moyenne', recommendation: capacity.layingRate < 68 ? 'Optimiser alimentation, santé et taux de ponte avant achat massif.' : 'Préparer un business plan d’extension seulement si la demande dépasse durablement la capacité.', capacity });
  addForActivity('poulets_chair', { title: 'Poulets de chair pour cycle court', priority: goals.global.attainment < 80 ? 'haute' : 'moyenne', recommendation: 'Dimensionner selon cash, bâtiment, aliment, mortalité et clients précommandés.' });
  ['bovins', 'ovins', 'caprins'].forEach((activity) => addForActivity(activity, { title: `${activityLabels[activity]} : investissement selon fenêtre commerciale`, priority: 'moyenne', recommendation: 'Ne pas immobiliser du cash sans précommandes, marge estimée, objectif de poids et capacité alimentaire.' }));
  addForActivity('cultures', { title: 'Cultures adaptées à Thiès/Médina Fall', priority: 'moyenne', recommendation: 'Valider sol, eau, intrants, cycle et débouchés avant tomate, poivron, pomme de terre ou autre culture.' });

  const technicalAlerts = buildTechnicalFarmingAlerts({ lots: arr(dataMap.avicole || dataMap.lots), animaux: arr(dataMap.animaux), stocks: arr(dataMap.stock || dataMap.stocks), sante: arr(dataMap.sante || dataMap.vaccins), businessEvents: arr(dataMap.business_events || dataMap.businessEvents), sensorDevices: arr(dataMap.sensor_devices || dataMap.sensorDevices || dataMap.sensors) });
  const technicalRecommendations = technicalAlerts.map(buildTechnicalRecommendation);
  recommendations.unshift(...technicalRecommendations);
  const criticalTechnical = technicalRecommendations.filter((item) => item.priority === 'haute').length;
  const summaryBase = goals.global.attainment >= 100 ? 'Objectif mensuel en avance : sécuriser cash et préparer croissance.' : `Objectif mensuel à ${goals.global.attainment}% : rattrapage et investissements pilotés nécessaires.`;
  const technicalSummary = criticalTechnical ? ` ${criticalTechnical} écart(s) technique(s) critique(s) à corriger.` : technicalRecommendations.length ? ` ${technicalRecommendations.length} point(s) de conduite technique à suivre.` : '';

  return { calendar, events, demandForecast, coverage, leadTimes, capacity, goals, recommendations, technical_alerts: technicalAlerts, technical_recommendations: technicalRecommendations, top_activity: goals.activities[0], late_activities: goals.activities.filter((a) => a.attainment < 70), executive_summary: `${summaryBase}${technicalSummary}` };
}

export default buildDecisionCenterPlan;
