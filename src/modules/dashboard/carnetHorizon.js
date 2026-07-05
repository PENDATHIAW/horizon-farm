/**
 * Carnet Horizon — version dirigeant agricole.
 * Agrégation lecture seule via moteurs canoniques existants.
 */

import { fmtCurrency } from '../../utils/format.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { buildObjectifsCroissanceData } from '../../services/objectifsGrowthEngine.js';
import { filterRowsByPeriodScope, normalizePeriodScope, rowDateValue } from '../../utils/periodScope.js';
import { isBovinAnimal, isCaprinAnimal, isOvinAnimal } from '../../utils/elevageActivityPnl.js';
import { buildExpirySnapshot } from '../../utils/stockExpiry.js';
import { buildSensorDashboardSummary } from '../../utils/smartFarmSensorSummary.js';
import { buildCommercialObjectivesView } from '../../utils/commercialPilotageMetrics.js';
import { buildCashFlowForecast } from '../../utils/financePilotageV2.js';

export const CARNET_JOURNAL_LIMIT = 10;
export const CARNET_ATTENTION_LIMIT = 4;

/** Navigation canonique depuis les cartes domaine du Carnet Horizon. */
export const CARNET_DOMAIN_NAVIGATION = {
  elevage: { module: 'elevage', tab: 'Lots & bandes' },
  cultures: { module: 'cultures', tab: 'Parcelles & campagnes' },
  stocks: { module: 'achats_stock', tab: 'Inventaire' },
  finances: { module: 'finance_pilotage', tab: 'Résumé' },
  capteurs: { module: 'smartfarm', tab: 'Flux temps réel' },
};

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_paye ?? row.paid_amount);
const fmt = (value = 0) => n(value).toLocaleString('fr-FR');

const CLOSED_ANIMAL_WORDS = ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'];
const isClosedAnimal = (row = {}) => CLOSED_ANIMAL_WORDS.some((word) => lower(row.status || row.statut).includes(word));

/** Tâches / événements IA, BP, investisseur — exclus de l'accueil. */
const HOME_NOISE_RE = /\b(business\s*plan|\bbp\b|financement\s*bancaire|investisseur|investissement|financeur|pondeuses?\s*bp|bovins?\s*bp|caprins?\s*bp|apport\s*promoteur|stratég|objectif\s*(mensuel|annuel)|orphan|rapprocher|justificatif|document\s*manquant|sync\s*erp|capteur|smart\s*farm|météo|whatsapp|démo|demo|dossier\s*invest|achat\s*\d{3,}|terinus|hôtel\s*terminus|one-?click|recommandation\s*ia|hey\s*horizon|tâche\s*ia|tache\s*ia|promoteur)\b/i;
const HOME_NOISE_EVENT_RE = /bp_|business_plan|investor|financing|strategic|growth_goal|objectif|assistant|recommendation|promoteur|financement/i;

const TERRAIN_EVENT_RE = /vente|livraison|recolte|récolte|paiement|encaisse|mortalit|mortalité|naissance|reception_stock|réception|sortie_stock|vaccin|soin|transformation|abattage|alimentation|production|oeuf|œuf|ponte|traitement/i;

export function isHomeNoiseText(text = '') {
  const value = lower(text);
  if (!value) return true;
  return HOME_NOISE_RE.test(value);
}

export function isAgriculturalHomeEvent(event = {}) {
  const blob = lower(`${event.title || ''} ${event.description || ''} ${event.event_type || ''} ${event.module_source || ''}`);
  if (isHomeNoiseText(blob)) return false;
  if (HOME_NOISE_EVENT_RE.test(blob)) return false;
  return TERRAIN_EVENT_RE.test(blob);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 19));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isToday(value) {
  const date = parseDate(value);
  if (!date) return false;
  return date >= startOfToday() && date <= endOfToday();
}

const stockQty = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => n(row.seuil ?? row.threshold ?? row.stock_min);
const isFeedStock = (row = {}) => /aliment|provende|intrant|granul|maïs|mais|soja|feed/i.test(`${row.produit || row.nom || row.name || ''} ${row.categorie || row.category || ''}`);

function alimentDaysLeft(stocks = [], alimentationLogs = []) {
  const feedRows = arr(stocks).filter(isFeedStock).filter((row) => stockThreshold(row) > 0 || stockQty(row) > 0);
  if (!feedRows.length) return null;
  const critical = feedRows.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  if (!critical.length) return null;
  const recentUse = arr(alimentationLogs).slice(0, 14);
  const dailyUse = recentUse.length
    ? recentUse.reduce((sum, row) => sum + n(row.quantite ?? row.quantity ?? row.amount), 0) / Math.max(recentUse.length, 1)
    : 0;
  const minQty = Math.min(...critical.map((row) => stockQty(row)));
  if (dailyUse > 0) return Math.max(1, Math.floor(minQty / dailyUse));
  return 7;
}

function feedProductName(stocks = []) {
  const critical = arr(stocks).filter(isFeedStock).find((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  return critical?.produit || critical?.nom || 'aliment';
}

function cultureRecordType(row = {}) {
  return lower(row.record_type || row.type_fiche || 'culture');
}

function countActiveSpecies(animaux = [], predicate) {
  return arr(animaux).filter((row) => !isClosedAnimal(row) && predicate(row)).length;
}

function buildSpeciesBreakdown(head = {}, animaux = []) {
  const lines = [];
  const pondeuses = n(head.effectifPondeuses);
  const chair = n(head.effectifChair);
  const bovins = countActiveSpecies(animaux, isBovinAnimal);
  const ovins = countActiveSpecies(animaux, isOvinAnimal);
  const caprins = countActiveSpecies(animaux, isCaprinAnimal);

  if (pondeuses > 0) lines.push({ text: `${fmt(pondeuses)} pondeuses` });
  if (chair > 0) lines.push({ text: `${fmt(chair)} poulets chair` });
  if (bovins > 0) lines.push({ text: `${fmt(bovins)} bovins` });
  if (ovins > 0) lines.push({ text: `${fmt(ovins)} ovins` });
  if (caprins > 0) lines.push({ text: `${fmt(caprins)} caprins` });

  const total = pondeuses + chair + n(head.effectifAvicoleOther) + bovins + ovins + caprins;
  return { total, lines };
}

function countMortalitiesToday(props = {}) {
  const fromEvents = arr(props.businessEvents || props.business_events)
    .filter((row) => isToday(row.event_date || row.date || row.created_at))
    .filter((row) => /mortalit|mortalité|mort\b/i.test(`${row.event_type || ''} ${row.title || ''}`))
    .length;
  const fromTasks = arr(props.taches)
    .filter((row) => isToday(row.date || row.created_at || row.updated_at))
    .filter((row) => /mortalit|mortalité/i.test(`${row.titre || row.title || ''}`))
    .length;
  return fromEvents + fromTasks;
}

function countLotsUnderTreatment(props = {}) {
  return arr(props.vaccins || props.sante)
    .filter((row) => ['en cours', 'traitement', 'a faire', 'à faire', 'retard'].some((term) => lower(row.statut || row.status).includes(term)))
    .length;
}

function topCultureNames(cultures = [], limit = 3) {
  const counts = new Map();
  arr(cultures)
    .filter((row) => cultureRecordType(row) === 'culture')
    .filter((row) => !['termine', 'terminé', 'perdu', 'archive', 'archivé'].includes(lower(row.statut || row.status)))
    .forEach((row) => {
      const name = String(row.culture || row.nom || row.type || '').trim();
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function countParcelsToWatch(cultures = []) {
  return arr(cultures)
    .filter((row) => cultureRecordType(row) === 'parcelle' || cultureRecordType(row) === 'culture')
    .filter((row) => ['alerte', 'surveiller', 'stress', 'risque'].some((term) => lower(row.statut || row.status || row.notes).includes(term)))
    .length;
}

function countStockRuptures(stocks = []) {
  return arr(stocks).filter((row) => stockQty(row) <= 0 && stockThreshold(row) > 0).length;
}

function countStockLocations(stocks = []) {
  const locations = new Set();
  arr(stocks).forEach((row) => {
    const loc = String(row.emplacement || row.location || row.zone || '').trim();
    if (loc) locations.add(lower(loc));
  });
  return locations.size;
}

function countDlcAlerts(stocks = []) {
  const snapshot = buildExpirySnapshot(stocks);
  return snapshot.soon.length + snapshot.expired.length;
}

function commercialInput(props = {}, periodScope = {}) {
  const scope = normalizePeriodScope(periodScope);
  const ordersAll = arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders);
  const paymentsAll = arr(props.paymentsAll?.length ? props.paymentsAll : props.payments);
  return {
    orders: filterRowsByPeriodScope(ordersAll, scope),
    payments: paymentsAll,
    clients: arr(props.clients),
    periodScope,
  };
}

/** Section 1 — Cartes domaine dirigeant. */
export function buildCarnetDomainCards(summary = {}, props = {}) {
  const head = summary.headcount || {};
  const culture = summary.cultureSummary || {};
  const stocks = arr(props.stocks);
  const animaux = arr(props.animaux);
  const species = buildSpeciesBreakdown(head, animaux);
  const mortalities = countMortalitiesToday(props);
  const underTreatment = countLotsUnderTreatment(props);
  const topCultures = topCultureNames(props.cultures);
  const parcelsWatch = countParcelsToWatch(props.cultures);
  const ruptures = countStockRuptures(stocks);
  const dlcAlerts = countDlcAlerts(stocks);
  const productCount = n(summary.stockSummary?.totalProducts) || stocks.length;
  const locationCount = countStockLocations(stocks);
  const hectares = Math.round((n(culture.surfaceM2) / 10000) * 10) / 10;

  const elevageAlerts = [];
  if (mortalities > 0) elevageAlerts.push({ text: `${mortalities} mortalité${mortalities > 1 ? 's' : ''} aujourd'hui` });
  if (underTreatment > 0) elevageAlerts.push({ text: `${underTreatment} lot${underTreatment > 1 ? 's' : ''} sous traitement` });
  const vaccinLate = arr(props.vaccins || props.sante)
    .filter((row) => ['retard', 'a faire', 'à faire'].some((term) => lower(row.statut || row.status).includes(term))).length;
  if (vaccinLate > 0 && !underTreatment) elevageAlerts.push({ text: `${vaccinLate} soin${vaccinLate > 1 ? 's' : ''} à planifier` });

  const cultureAlerts = [];
  if (parcelsWatch > 0) cultureAlerts.push({ text: `${parcelsWatch} parcelle${parcelsWatch > 1 ? 's' : ''} à surveiller` });

  const stockAlerts = [];
  if (ruptures > 0) stockAlerts.push({ text: `${ruptures} rupture${ruptures > 1 ? 's' : ''}` });
  if (dlcAlerts > 0) stockAlerts.push({ text: `${dlcAlerts} DLC proche${dlcAlerts > 1 ? 's' : ''}` });

  const cultureLines = [
    { text: `${fmt(culture.parcelCount || 0)} parcelles actives` },
  ];
  if (hectares > 0) cultureLines.push({ text: `${fmt(hectares)} hectares exploités` });
  topCultures.forEach((name) => cultureLines.push({ text: name }));

  const stockLines = [
    { text: `${fmt(productCount)} produits` },
    { text: locationCount > 0 ? `${fmt(locationCount)} emplacements` : 'Emplacements à renseigner' },
  ];

  const financeLines = [
    { text: `Trésorerie nette : ${fmtCurrency(summary.cashNet)}` },
    { text: `Créances : ${fmtCurrency(summary.receivable)}` },
    { text: `Dettes : ${fmtCurrency(summary.payables)}` },
  ];

  return [
    {
      id: 'elevage',
      title: 'ÉLEVAGE',
      headline: species.total > 0 ? `${fmt(species.total)} têtes` : 'À renseigner',
      lines: species.lines.length ? species.lines : [{ text: 'Aucun effectif enregistré' }],
      alerts: elevageAlerts,
      navigate: CARNET_DOMAIN_NAVIGATION.elevage,
      scopeLabel: 'Cumul',
    },
    {
      id: 'cultures',
      title: 'CULTURES',
      headline: culture.hasData ? `${fmt(culture.parcelCount)} parcelles` : 'À configurer',
      lines: cultureLines,
      alerts: cultureAlerts,
      navigate: CARNET_DOMAIN_NAVIGATION.cultures,
      scopeLabel: 'Cumul',
    },
    {
      id: 'stocks',
      title: 'STOCK',
      headline: `${fmt(productCount)} produits`,
      lines: stockLines,
      alerts: stockAlerts,
      navigate: CARNET_DOMAIN_NAVIGATION.stocks,
      scopeLabel: 'Cumul',
    },
    {
      id: 'finances',
      title: 'FINANCE',
      headline: fmtCurrency(summary.cashNet),
      lines: financeLines.slice(1),
      alerts: [],
      navigate: CARNET_DOMAIN_NAVIGATION.finances,
      scopeLabel: 'Cumul',
    },
  ];
}

/** Section 2 — Objectifs CA (canonique commercial + croissance). */
export function buildCarnetObjectifs(summary = {}, props = {}) {
  const periodScope = summary.periodScope || props.periodScope || {};
  const commercialKpis = buildConsolidatedCommercialKpis(commercialInput(props, periodScope));
  const growth = buildObjectifsCroissanceData({
    lots: props.lotsData || props.lots,
    animaux: props.animaux,
    productionLogs: props.productionLogs,
    alimentationLogs: props.alimentationLogs,
    sante: props.vaccins || props.sante,
    cultures: props.cultures,
    stocks: props.stocks,
    transactions: props.transactionsAll || props.transactions,
    salesOrders: props.salesOrdersAll || props.salesOrders,
    marketPrices: props.marketPrices,
  });
  const goal = summary.goal || {};
  const monthTarget = n(goal.periodTarget);
  const monthRealized = n(goal.periodRealized) || n(commercialKpis.ca);
  const monthAttainment = n(goal.periodAttainment) || (monthTarget > 0 ? Math.round((monthRealized / monthTarget) * 100) : 0);
  const yearTarget = n(goal.annualTarget);
  const yearRealized = n(goal.annualRealized);
  const yearAttainment = n(goal.annualAttainment) || (yearTarget > 0 ? Math.round((yearRealized / yearTarget) * 100) : 0);

  return {
    month: {
      label: 'CA MOIS',
      realized: monthRealized,
      target: monthTarget,
      attainment: monthAttainment,
      scopeLabel: 'Période',
      navigate: { module: 'commercial', tab: 'Pilotage' },
    },
    year: {
      label: 'CA ANNÉE',
      realized: yearRealized,
      target: yearTarget,
      attainment: yearAttainment,
      scopeLabel: 'Cumul',
      navigate: { module: 'objectifs_croissance', tab: 'Suivi du Business Plan' },
    },
    growthAlertCount: n(growth.alertCounts?.zootechnie) + n(growth.alertCounts?.economie),
  };
}

/**
 * Projections pilotage dirigeant — CA, trésorerie, stock, production.
 * Indicateurs choisis pour anticiper les décisions terrain (pas de ressaisie).
 */
export function buildCarnetProjections(summary = {}, props = {}) {
  const periodScope = summary.periodScope || props.periodScope || {};
  const scope = normalizePeriodScope(periodScope);
  const ordersAll = arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders);
  const ordersPeriod = filterRowsByPeriodScope(ordersAll, scope);
  const objectives = buildCommercialObjectivesView(ordersPeriod, {
    monthTarget: summary.goal?.periodTarget,
  });

  const forecast = buildCashFlowForecast({
    salesOrders: ordersAll,
    payments: props.paymentsAll || props.payments,
    transactions: props.transactionsAll || props.transactions,
    finances: props.transactionsAll || props.transactions,
    bpRecurringCosts: props.bpRecurringCosts,
    clients: props.clients,
  });

  const stocks = arr(props.stocks);
  const ruptures = countStockRuptures(stocks);

  const prodLogs = arr(props.productionLogs);
  const weekAgo = Date.now() - 7 * 86400000;
  const eggsWeek = prodLogs
    .filter((row) => {
      const t = parseDate(rowDateValue(row))?.getTime() || 0;
      return t >= weekAgo;
    })
    .reduce((sum, row) => sum + n(row.oeufs_produits ?? row.eggs_count ?? row.quantite), 0);
  const eggsDailyAvg = eggsWeek > 0 ? Math.round(eggsWeek / 7) : 0;
  const eggsMonthProjection = eggsDailyAvg * 30;

  const receivable = n(summary.receivable);
  const items = [];

  if (objectives.projectionEndOfMonth > 0 || objectives.actual > 0) {
    items.push({
      id: 'ca-projection',
      label: 'CA fin de mois (proj.)',
      value: objectives.projectionEndOfMonth,
      format: 'currency',
      hint: objectives.onTrack ? 'Sur la bonne voie' : 'Sous l\'objectif mensuel',
      tone: objectives.onTrack ? 'good' : 'warn',
      navigate: { module: 'commercial', tab: 'Pilotage' },
    });
  }

  const goal = summary.goal || {};
  const remaining = Math.max(0, n(goal.periodTarget) - n(objectives.actual));
  if (n(goal.periodTarget) > 0 && remaining > 0) {
    items.push({
      id: 'ca-remaining',
      label: 'CA restant (objectif)',
      value: remaining,
      format: 'currency',
      hint: `${objectives.attainment}% de l'objectif atteint`,
      tone: objectives.attainment >= 80 ? 'good' : 'warn',
      navigate: { module: 'objectifs_croissance', tab: 'Suivi du Business Plan' },
    });
  }

  if (forecast.ready && forecast.projection30 != null) {
    items.push({
      id: 'treasury-30',
      label: 'Trésorerie J+30',
      value: forecast.projection30,
      format: 'currency',
      hint: forecast.riskLabel || 'Prévision échéancier',
      tone: forecast.risk === 'high' ? 'warn' : forecast.risk === 'medium' ? 'neutral' : 'good',
      navigate: { module: 'finance_pilotage', tab: 'Trésorerie' },
    });
  }

  if (receivable > 0) {
    items.push({
      id: 'receivables',
      label: 'Créances à encaisser',
      value: receivable,
      format: 'currency',
      hint: 'Encaissements attendus',
      tone: 'neutral',
      navigate: { module: 'finance_pilotage', tab: 'Créances & dettes' },
    });
  }

  if (ruptures > 0) {
    items.push({
      id: 'stock-rupture',
      label: 'Ruptures stock',
      value: ruptures,
      format: 'count',
      hint: 'Réapprovisionner en priorité',
      tone: 'warn',
      navigate: { module: 'achats_stock', tab: 'Inventaire' },
    });
  }

  if (eggsMonthProjection > 0) {
    items.push({
      id: 'eggs-projection',
      label: 'Œufs (proj. 30 j)',
      value: eggsMonthProjection,
      format: 'units',
      hint: `Moyenne ${eggsDailyAvg.toLocaleString('fr-FR')} / jour`,
      tone: 'neutral',
      navigate: { module: 'elevage', tab: 'Avicole' },
    });
  }

  return { items, hasData: items.length > 0 };
}

function shortenJournalLabel(text = '') {
  const raw = String(text || '').trim();
  if (!raw || isHomeNoiseText(raw)) return null;
  const saleRef = raw.match(/\b(HF-\d+|VTE-\d+|CMD-\d+)\b/i);
  if (saleRef) return `Vente ${saleRef[1].toUpperCase()}`;
  if (/livraison/i.test(raw)) {
    const dest = raw.match(/livraison\s+(.+?)(?:\s·|$)/i);
    return dest ? `Livraison ${dest[1].trim().slice(0, 24)}` : 'Livraison effectuée';
  }
  if (/recolte|récolte/i.test(raw)) {
    const crop = raw.match(/recolte\s+(.+?)(?:\s*:|\s·|$)/i) || raw.match(/récolte\s+(.+?)(?:\s*:|\s·|$)/i);
    return crop ? `Récolte ${crop[1].trim().slice(0, 20)}` : 'Récolte enregistrée';
  }
  if (/mortalit|mortalité/i.test(raw)) return raw.length > 36 ? 'Mortalité enregistrée' : raw;
  if (/naissance/i.test(raw)) return raw.length > 36 ? 'Naissance enregistrée' : raw;
  if (/paiement/i.test(raw)) return raw.length > 42 ? 'Paiement reçu' : raw;
  if (/vaccin|soin/i.test(raw)) {
    const lot = raw.match(/lot\s+([A-Z0-9-]+)/i);
    return lot ? `Vaccination lot ${lot[1]}` : 'Soin enregistré';
  }
  if (/réception|reception/i.test(raw)) return raw.length > 40 ? 'Réception stock' : raw;
  if (/transformation|abattage/i.test(raw)) return raw.length > 40 ? 'Transformation enregistrée' : raw;
  return raw.length > 40 ? `${raw.slice(0, 37)}…` : raw;
}

function journalEntry(text, at = 0) {
  const label = shortenJournalLabel(text);
  if (!label) return null;
  return { icon: '✓', text: label, at };
}

/** Section 4 — Journal terrain (max 10, récent → ancien). */
export function buildCarnetTodayJournal(props = {}, { limit = CARNET_JOURNAL_LIMIT } = {}) {
  const entries = [];
  const seen = new Set();

  const push = (entry) => {
    if (!entry?.text) return;
    const key = lower(entry.text);
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };

  arr(props.businessEvents || props.business_events)
    .filter(isAgriculturalHomeEvent)
    .forEach((row) => {
      const at = parseDate(rowDateValue(row))?.getTime() || 0;
      const line = journalEntry(row.title || row.description, at);
      if (line) push({ ...line, at });
    });

  arr(props.salesOrdersAll || props.salesOrders).forEach((row) => {
    const at = parseDate(row.date || row.date_commande || row.created_at)?.getTime() || 0;
    const ref = row.reference || row.numero || row.order_number || row.id;
    const line = journalEntry(ref ? `Vente ${ref}` : `Vente ${row.product_name || row.produit || ''}`, at);
    if (line) push({ ...line, at });
  });

  arr(props.deliveries || props.deliveriesList).forEach((row) => {
    const at = parseDate(row.date || row.date_livraison || row.created_at)?.getTime() || 0;
    const dest = row.destination || row.client_label || row.lieu || row.reference;
    const line = journalEntry(dest ? `Livraison ${dest}` : 'Livraison effectuée', at);
    if (line) push({ ...line, at });
  });

  arr(props.productionLogs).forEach((row) => {
    const eggs = n(row.oeufs_produits ?? row.eggs_count ?? row.quantite);
    if (eggs <= 0) return;
    const at = parseDate(row.date || row.date_production || row.created_at)?.getTime() || 0;
    push({ icon: '✓', text: `${fmt(eggs)} œufs enregistrés`, at });
  });

  arr(props.paymentsAll || props.payments).forEach((row) => {
    const amount = money(row);
    if (amount <= 0) return;
    const at = parseDate(row.date_paiement || row.date || row.created_at)?.getTime() || 0;
    push({ icon: '✓', text: `Paiement reçu : ${fmtCurrency(amount)}`, at });
  });

  arr(props.cultures).forEach((row) => {
    if (n(row.quantite_recoltee ?? row.recolte) < 0) return;
    const name = row.culture || row.nom || row.type;
    if (!name) return;
    const at = parseDate(row.date_recolte_reelle || row.date_recolte || row.updated_at)?.getTime() || 0;
    push({ icon: '✓', text: `Récolte ${name}`, at });
  });

  entries.sort((a, b) => n(b.at) - n(a.at));

  const totalCount = entries.length;
  if (!totalCount) {
    return { items: [{ icon: '·', text: 'Aucun événement terrain récent' }], totalCount: 0, hasMore: false };
  }

  return {
    items: entries.slice(0, limit).map(({ icon, text }) => ({ icon, text })),
    totalCount,
    hasMore: totalCount > limit,
  };
}

/** Section 3 — Conseil (situation · cause · action). */
export function buildCarnetConseil(summary = {}, priorities = [], props = {}) {
  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);
  const feedName = feedProductName(props.stocks);
  const commercialKpis = buildConsolidatedCommercialKpis(commercialInput(props, summary.periodScope));

  if (feedDays != null && feedDays <= 7) {
    const product = /maïs|mais/i.test(feedName) ? 'maïs' : (/aliment/i.test(feedName) ? "d'aliment" : feedName.toLowerCase());
    return {
      title: 'Conseil Horizon',
      situation: `Le stock de ${product} est bas.`,
      cause: `Couverture estimée : ${feedDays} jour${feedDays > 1 ? 's' : ''}.`,
      action: 'Planifiez un réapprovisionnement cette semaine.',
    };
  }

  if (commercialKpis.unpaidOrders > 0 && n(summary.receivable) > 0) {
    return {
      title: 'Conseil Horizon',
      situation: `${commercialKpis.unpaidOrders} créance${commercialKpis.unpaidOrders > 1 ? 's' : ''} ouverte${commercialKpis.unpaidOrders > 1 ? 's' : ''}.`,
      cause: `${fmtCurrency(summary.receivable)} restent à encaisser.`,
      action: 'Relancez les clients les plus en retard depuis Commercial.',
    };
  }

  if (summary.cashNet < 0) {
    return {
      title: 'Conseil Horizon',
      situation: 'La trésorerie est sous pression.',
      cause: 'Les sorties dépassent les encaissements récents.',
      action: 'Priorisez les encaissements avant les dépenses non urgentes.',
    };
  }

  if (summary.startupMode) {
    return {
      title: 'Conseil Horizon',
      situation: 'Peu de données terrain visibles sur l\'Accueil.',
      cause: 'Soit l\'exploitation démarre, soit le mode « Données réelles » est actif sans saisie.',
      action: 'Activez Données simulées dans Paramètres (⚙️) pour le scénario Horizon Farm, ou enregistrez une vente / un lot.',
    };
  }

  return {
    title: 'Conseil Horizon',
    situation: 'L\'exploitation est calme.',
    cause: 'Aucune alerte critique sur les domaines suivis.',
    action: 'Consultez les modules pour agir au bon moment.',
  };
}

export function buildCarnetAttentionItems(summary = {}, _priorities = [], props = {}) {
  const cards = buildCarnetDomainCards(summary, props);
  return cards
    .flatMap((card) => card.alerts.map((alert) => ({ text: alert.text })))
    .slice(0, CARNET_ATTENTION_LIMIT);
}

export function buildCarnetExploitationState(summary = {}, props = {}) {
  return buildCarnetDomainCards(summary, props);
}

export function buildCarnetSensorStrip(props = {}) {
  const sensors = arr(props.sensorDevices || props.sensors);
  const cameras = arr(props.cameraDevices || props.cameras);
  const summary = buildSensorDashboardSummary(sensors, cameras, props.meteo || props.weather);
  return {
    id: 'capteurs',
    title: 'CAPTEURS & TERRAIN',
    headline: summary.headline,
    lines: summary.lines,
    alerts: summary.alerts,
    navigate: CARNET_DOMAIN_NAVIGATION.capteurs,
    scopeLabel: summary.hasData ? 'Temps réel' : 'À configurer',
    summary,
  };
}

export function buildCarnetHorizonView({ summary = {}, priorities = [], props = {} } = {}) {
  return {
    domains: buildCarnetDomainCards(summary, props),
    capteurs: buildCarnetSensorStrip(props),
    objectifs: buildCarnetObjectifs(summary, props),
    projections: buildCarnetProjections(summary, props),
    conseil: buildCarnetConseil(summary, priorities, props),
    journal: buildCarnetTodayJournal(props),
    startupMode: Boolean(summary.startupMode),
  };
}
