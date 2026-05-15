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
  if (raw.includes('bovin') || raw.includes('boeuf') || raw.includes('vache') || raw.includes('taureau') || raw.includes('veau')) return 'bovins';
  if (raw.includes('ovin') || raw.includes('mouton') || raw.includes('belier') || raw.includes('brebis')) return 'ovins';
  if (raw.includes('caprin') || raw.includes('chevre') || raw.includes('bouc')) return 'caprins';
  return '';
}

export function classifySaleActivity(order = {}) {
  const raw = normalize(`${order.activite || ''} ${order.source_type || ''} ${order.type_vente || ''} ${order.product_type || ''} ${order.product_name || ''} ${order.libelle || ''} ${order.espece || ''} ${order.type_animal || ''}`);
  if (raw.includes('oeuf') || raw.includes('tablette') || raw.includes('pondeuse')) return 'oeufs';
  if (raw.includes('chair') || raw.includes('poulet')) return 'poulets_chair';
  const species = classifyAnimalSpeciesFromText(raw);
  if (species) return species;
  if (raw.includes('animal')) return 'animaux';
  if (raw.includes('culture') || raw.includes('tomate') || raw.includes('pomme') || raw.includes('poivron') || raw.includes('recolte')) return 'cultures';
  if (raw.includes('stock') || raw.includes('produit')) return 'stock';
  return 'stock';
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
  return [...customEvents, ...defaults]
    .filter((event) => event.date >= minDate && event.date <= maxDate)
    .sort((a, b) => a.date - b.date);
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

  const fallbackByActivity = {
    poulets_chair: 'Pour la fenêtre ratée, vendre uniquement stock existant ou précommandes déjà sécurisées. Replanifier le prochain cycle sur la prochaine fenêtre viable.',
    ovins: 'Pour cette fenêtre, ne pas acheter tardivement. Préparer la prochaine fenêtre avec 90 jours minimum, précommandes et capacité alimentaire.',
    bovins: 'Pour cette fenêtre, arbitrer uniquement les animaux déjà disponibles. Préparer la prochaine fenêtre avec cash, poids cible et précommandes.',
    caprins: 'Pour cette fenêtre, éviter l’achat tardif. Préparer la prochaine fenêtre avec clients, alimentation et marge estimée.',
    oeufs: 'Optimiser la ponte existante pour la fenêtre proche. Nouvelle capacité seulement pour une fenêtre plus lointaine.',
    cultures: 'Ne pas lancer pour une récolte trop proche. Choisir une culture/cycle compatible avec la prochaine fenêtre.',
  };

  return {
    activity,
    eventId: event.id,
    eventLabel: event.label,
    eventNote: event.note || '',
    targetDate: iso(targetDate),
    earliestStart: iso(earliestStart),
    latestStart: iso(latestStart),
    leadTime,
    remainingDays,
    daysBeforeDeadline,
    status,
    statusLabel: label,
    shouldRecommendInvestment,
    tooLateReason: shouldRecommendInvestment ? '' : `La fenêtre ${event.label} est trop proche : ${remainingDays} jour(s) restants pour ${leadTime} jour(s) nécessaires.`,
    fallback: fallbackByActivity[activity] || 'Chercher une alternative court terme ou viser la prochaine fenêtre.',
  };
}

function selectRollingWindow(activity, events, leadTime, referenceDate) {
  const activityEvents = events.filter((event) => arr(event.activities).includes(activity));
  const windows = activityEvents.map((event) => buildTimingWindow({ activity, event, leadTime, referenceDate }));
  const missed = windows.find((window) => window.status === 'too_late');
  const viable = windows.find((window) => window.status !== 'too_late');
  return viable || missed || null;
}

export function estimateLeadTimes(dataMap = {}) {
  const avg = (values, fallback) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : fallback;
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const cultures = arr(dataMap.cultures);
  const speciesDays = (species) => animaux
    .filter((a) => normalize(`${a.type || ''} ${a.espece || ''} ${a.categorie || ''}`).includes(species))
    .map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours || a.delai_cible_vente_jours))
    .filter((v) => v > 0);
  return {
    oeufs: avg(lots.map((l) => num(l.days_to_lay || l.age_debut_ponte_jours || l.delai_ponte_jours)).filter((v) => v > 0), 150),
    poulets_chair: avg(lots.map((l) => num(l.cycle_days || l.duree_cycle || l.age_vente_jours)).filter((v) => v > 0 && v < 120), 42),
    animaux: avg(animaux.map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours || a.delai_cible_vente_jours)).filter((v) => v > 0), 90),
    bovins: avg(speciesDays('bovin'), 90),
    ovins: avg(speciesDays('ovin'), 90),
    caprins: avg(speciesDays('caprin'), 90),
    cultures: avg(cultures.map((c) => num(c.cycle_days || c.duree_cycle || c.jours_avant_recolte)).filter((v) => v > 0), 90),
  };
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
  const recentEggs = logs.slice(-14).reduce((sum, row) => sum + num(row.quantite || row.eggs || row.total_oeufs || row.oeufs), 0);
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
  const activities = Object.keys(defaultAnnualMix).reduce((acc, key) => ({ ...acc, [key]: { activity: key, label: activityLabels[key], target: monthTarget * defaultAnnualMix[key], realized: 0 } }), {});
  sales.forEach((order) => {
    const key = classifySaleActivity(order);
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
  return {
    global: { activity: 'global', label: activityLabels.global, annualTarget, monthTarget, weekTarget: monthTarget / 4.33, realized, encaisse, depenses, marge: realized - depenses, attainment: monthTarget ? Math.round((realized / monthTarget) * 100) : 0, remaining: Math.max(0, monthTarget - realized), cashRate: realized ? Math.round((encaisse / realized) * 100) : 0 },
    activities: [...Object.values(activities), animalGlobal].map((row) => ({ ...row, attainment: row.target ? Math.round((row.realized / row.target) * 100) : 0, remaining: Math.max(0, row.target - row.realized) })).sort((a, b) => b.realized - a.realized),
    currentMonth,
  };
}

function buildRecommendation({ activity, title, priority, recommendation, timingWindow, capacity }) {
  if (!timingWindow) return null;
  const timing = `${timingWindow.statusLabel} · cible ${timingWindow.eventLabel} (${timingWindow.targetDate}) · mise en place ${timingWindow.earliestStart} → ${timingWindow.latestStart}`;
  const finalRecommendation = timingWindow.shouldRecommendInvestment
    ? recommendation
    : `${timingWindow.tooLateReason} ${timingWindow.fallback}`;
  return {
    id: `${activity}-${timingWindow.eventId}`,
    title,
    activity,
    priority: timingWindow.shouldRecommendInvestment ? priority : 'basse',
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
    should_recommend_investment: timingWindow.shouldRecommendInvestment,
    capacity,
  };
}

export function buildDecisionCenterPlan(dataMap = {}, options = {}) {
  const referenceDate = options.date || new Date();
  const calendar = buildCommercialCalendar(referenceDate);
  const leadTimes = estimateLeadTimes(dataMap);
  const capacity = buildProductionCapacity(dataMap);
  const goals = buildGoalPerformance(dataMap, options);
  const events = buildMarketEvents(referenceDate, dataMap);
  const recommendations = [];

  const addForActivity = (activity, config) => {
    const timingWindow = selectRollingWindow(activity, events, leadTimes[activity], referenceDate);
    const recommendation = buildRecommendation({ activity, timingWindow, ...config });
    if (recommendation) recommendations.push(recommendation);
  };

  addForActivity('oeufs', {
    title: capacity.tabletsDay ? 'Comparer demande œufs et capacité pondeuses' : 'Construire capacité pondeuses',
    priority: capacity.layingRate < 68 ? 'haute' : 'moyenne',
    recommendation: capacity.layingRate < 68 ? 'Optimiser alimentation, santé et taux de ponte avant achat massif.' : 'Préparer un business plan d’extension seulement si la demande dépasse durablement la capacité.',
    capacity,
  });

  addForActivity('poulets_chair', {
    title: 'Poulets de chair pour cycle court',
    priority: goals.global.attainment < 80 ? 'haute' : 'moyenne',
    recommendation: 'Dimensionner selon cash, bâtiment, aliment, mortalité et clients précommandés.',
  });

  ['bovins', 'ovins', 'caprins'].forEach((activity) => addForActivity(activity, {
    title: `${activityLabels[activity]} : investissement selon fenêtre commerciale`,
    priority: 'moyenne',
    recommendation: 'Ne pas immobiliser du cash sans précommandes, marge estimée, objectif de poids et capacité alimentaire.',
  }));

  addForActivity('cultures', {
    title: 'Cultures adaptées à Thiès/Médina Fall',
    priority: 'moyenne',
    recommendation: 'Valider sol, eau, intrants, cycle et débouchés avant tomate, poivron, pomme de terre ou autre culture.',
  });

  return {
    calendar,
    events,
    leadTimes,
    capacity,
    goals,
    recommendations,
    top_activity: goals.activities[0],
    late_activities: goals.activities.filter((a) => a.attainment < 70),
    executive_summary: goals.global.attainment >= 100 ? 'Objectif mensuel en avance : sécuriser cash et préparer croissance.' : `Objectif mensuel à ${goals.global.attainment}% : rattrapage et investissements pilotés nécessaires.`,
  };
}

export default buildDecisionCenterPlan;
