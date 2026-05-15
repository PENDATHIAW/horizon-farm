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
  animaux: 'Bovins / Ovins / Caprins',
  cultures: 'Cultures',
  stock: 'Stock / Produits',
};

export const monthlyWeights = [0.07, 0.07, 0.08, 0.08, 0.08, 0.09, 0.08, 0.08, 0.08, 0.08, 0.1, 0.11];
export const defaultAnnualMix = { oeufs: 0.32, poulets_chair: 0.22, animaux: 0.26, cultures: 0.15, stock: 0.05 };

export function classifySaleActivity(order = {}) {
  const raw = normalize(`${order.activite || ''} ${order.source_type || ''} ${order.type_vente || ''} ${order.product_type || ''} ${order.product_name || ''} ${order.libelle || ''}`);
  if (raw.includes('oeuf') || raw.includes('tablette') || raw.includes('pondeuse')) return 'oeufs';
  if (raw.includes('chair') || raw.includes('poulet')) return 'poulets_chair';
  if (raw.includes('bovin') || raw.includes('ovin') || raw.includes('caprin') || raw.includes('animal') || raw.includes('mouton') || raw.includes('chevre')) return 'animaux';
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
    { month: 5, label: 'Mai', focus: ['cultures', 'animaux'], note: 'Préparer cultures, animaux et besoins en eau/intrants.' },
    { month: 6, label: 'Juin', focus: ['animaux'], note: 'Fenêtre possible forte sur animaux selon calendrier.' },
    { month: 7, label: 'Juillet', focus: ['cultures', 'oeufs'], note: 'Suivi cultures, santé et alimentation.' },
    { month: 8, label: 'Août', focus: ['cultures'], note: 'Suivi cultures, stockage, préparation ventes futures.' },
    { month: 9, label: 'Septembre', focus: ['oeufs', 'poulets_chair'], note: 'Reprise commerce, préparation fin d’année.' },
    { month: 10, label: 'Octobre', focus: ['poulets_chair', 'oeufs'], note: 'Précommandes et mise en place cycles courts.' },
    { month: 11, label: 'Novembre', focus: ['poulets_chair', 'oeufs'], note: 'Préparer fin d’année, sécuriser clients cash.' },
    { month: 12, label: 'Décembre', focus: ['poulets_chair', 'oeufs', 'animaux'], note: 'Fin d’année, commandes groupées, forte attention livraison.' },
  ];
  return { current: rows.find((row) => row.month === month), next: [1, 2, 3, 4, 5, 6].map((offset) => rows[(month - 1 + offset) % 12]), year: rows };
}

export function estimateLeadTimes(dataMap = {}) {
  const avg = (values, fallback) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : fallback;
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const cultures = arr(dataMap.cultures);
  return {
    oeufs: avg(lots.map((l) => num(l.days_to_lay || l.age_debut_ponte_jours || l.delai_ponte_jours)).filter((v) => v > 0), 150),
    poulets_chair: avg(lots.map((l) => num(l.cycle_days || l.duree_cycle || l.age_vente_jours)).filter((v) => v > 0 && v < 120), 42),
    animaux: avg(animaux.map((a) => num(a.days_to_sale || a.duree_garde_jours || a.age_vente_jours)).filter((v) => v > 0), 90),
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
  sales.forEach((order) => { activities[classifySaleActivity(order)].realized += amount(order); });
  const realized = Object.values(activities).reduce((sum, row) => sum + row.realized, 0);
  const encaisse = Math.max(payments.reduce((sum, row) => sum + paid(row), 0), finances.filter((f) => normalize(f.type).includes('entree')).reduce((sum, row) => sum + amount(row), 0));
  const depenses = finances.filter((f) => normalize(f.type).includes('sortie')).reduce((sum, row) => sum + amount(row), 0);
  return {
    global: { activity: 'global', label: activityLabels.global, annualTarget, monthTarget, weekTarget: monthTarget / 4.33, realized, encaisse, depenses, marge: realized - depenses, attainment: monthTarget ? Math.round((realized / monthTarget) * 100) : 0, remaining: Math.max(0, monthTarget - realized), cashRate: realized ? Math.round((encaisse / realized) * 100) : 0 },
    activities: Object.values(activities).map((row) => ({ ...row, attainment: row.target ? Math.round((row.realized / row.target) * 100) : 0, remaining: Math.max(0, row.target - row.realized) })).sort((a, b) => b.realized - a.realized),
    currentMonth,
  };
}

export function buildDecisionCenterPlan(dataMap = {}, options = {}) {
  const calendar = buildCommercialCalendar(options.date || new Date());
  const leadTimes = estimateLeadTimes(dataMap);
  const capacity = buildProductionCapacity(dataMap);
  const goals = buildGoalPerformance(dataMap, options);
  const futureFocus = new Set(calendar.next.flatMap((m) => m.focus));
  const recommendations = [];
  if (futureFocus.has('oeufs')) recommendations.push({ id: 'pondeuses', title: capacity.tabletsDay ? 'Comparer demande œufs et capacité pondeuses' : 'Construire capacité pondeuses', activity: 'oeufs', priority: capacity.layingRate < 68 ? 'haute' : 'moyenne', timing: `${leadTimes.oeufs} jours avant période cible`, recommendation: capacity.layingRate < 68 ? 'Optimiser alimentation, santé et taux de ponte avant achat massif.' : 'Préparer un business plan d’extension seulement si la demande dépasse durablement la capacité.' });
  if (futureFocus.has('poulets_chair')) recommendations.push({ id: 'chair', title: 'Poulets de chair pour cycle court', activity: 'poulets_chair', priority: goals.global.attainment < 80 ? 'haute' : 'moyenne', timing: `${leadTimes.poulets_chair} jours avant vente cible`, recommendation: 'Dimensionner selon cash, bâtiment, aliment, mortalité et clients précommandés.' });
  if (futureFocus.has('animaux')) recommendations.push({ id: 'ruminants', title: 'Bovins/ovins/caprins selon événement et cash', activity: 'animaux', priority: 'moyenne', timing: `${leadTimes.animaux} jours avant vente cible`, recommendation: 'Ne pas immobiliser du cash sans précommandes, marge estimée et capacité alimentaire.' });
  if (futureFocus.has('cultures')) recommendations.push({ id: 'cultures', title: 'Cultures adaptées à Thiès/Médina Fall', activity: 'cultures', priority: 'moyenne', timing: `${leadTimes.cultures} jours avant récolte cible`, recommendation: 'Valider sol, eau, intrants, cycle et débouchés avant tomate, poivron, pomme de terre ou autre culture.' });
  return { calendar, leadTimes, capacity, goals, recommendations, top_activity: goals.activities[0], late_activities: goals.activities.filter((a) => a.attainment < 70), executive_summary: goals.global.attainment >= 100 ? 'Objectif mensuel en avance : sécuriser cash et préparer croissance.' : `Objectif mensuel à ${goals.global.attainment}% : rattrapage et investissements pilotés nécessaires.` };
}

export default buildDecisionCenterPlan;
