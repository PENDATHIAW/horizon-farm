/**
 * Carnet Horizon V2 — agrégation lecture seule, anti-bruit, moteurs canoniques.
 */

import { fmtCurrency } from '../../utils/format.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { rowDateValue } from '../../utils/periodScope.js';

export const CARNET_JOURNAL_LIMIT = 5;
export const CARNET_ATTENTION_LIMIT = 4;

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_paye ?? row.paid_amount);

/** Tâches / événements IA, BP, investisseur — exclus de l'accueil. */
const HOME_NOISE_RE = /\b(business\s*plan|\bbp\b|financement\s*bancaire|investisseur|investissement|financeur|pondeuses?\s*bp|bovins?\s*bp|caprins?\s*bp|stratég|objectif\s*(mensuel|annuel)|orphan|rapprocher|justificatif|document\s*manquant|sync\s*erp|capteur|smart\s*farm|météo|whatsapp|démo|demo|dossier\s*invest|achat\s*\d{3,}|terinus|hôtel\s*terminus|one-?click|recommandation\s*ia|hey\s*horizon)\b/i;
const HOME_NOISE_EVENT_RE = /bp_|business_plan|investor|financing|strategic|growth_goal|objectif|assistant|recommendation/i;

const AGRICULTURAL_EVENT_RE = /vente|livraison|recolte|récolte|paiement|encaisse|vaccin|soin|stock|aliment|oeuf|œuf|ponte|culture|parcelle|maintenance|entretien|réception|reception|sortie_stock|alimentation|mortalité|mortalite|naissance|abattage|traitement/i;

export function isHomeNoiseText(text = '') {
  const value = lower(text);
  if (!value) return true;
  return HOME_NOISE_RE.test(value);
}

export function isAgriculturalHomeEvent(event = {}) {
  const blob = lower(`${event.title || ''} ${event.description || ''} ${event.event_type || ''} ${event.module_source || ''}`);
  if (isHomeNoiseText(blob)) return false;
  if (HOME_NOISE_EVENT_RE.test(blob)) return false;
  return AGRICULTURAL_EVENT_RE.test(blob);
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

function isTomorrow(value) {
  const date = parseDate(value);
  if (!date) return false;
  const tomorrow = new Date(startOfToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endTomorrow = new Date(tomorrow);
  endTomorrow.setHours(23, 59, 59, 999);
  return date >= tomorrow && date <= endTomorrow;
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

function countHarvestInProgress(cultures = []) {
  return arr(cultures).filter((row) => {
    if (cultureRecordType(row) !== 'culture') return false;
    const status = lower(row.statut || row.status);
    return status.includes('recolte') || status.includes('récolte') || row.commercial_ready || row.pret_vente;
  }).length;
}

function countHarvestToday(cultures = []) {
  return arr(cultures).filter((row) => {
    if (cultureRecordType(row) !== 'culture') return false;
    return isToday(row.date_recolte_reelle || row.date_recolte) && n(row.quantite_recoltee ?? row.recolte) > 0;
  }).length;
}

function countVaccinLotsDue(sante = []) {
  return arr(sante).filter((row) => ['retard', 'a faire', 'à faire', 'a_faire', 'en retard'].some((term) => lower(row.statut || row.status).includes(term))).length;
}

function countStockRuptures(stocks = []) {
  return arr(stocks).filter((row) => stockQty(row) <= 0 && stockThreshold(row) > 0).length;
}

function countStockLow(stocks = [], stockSummary = {}) {
  return n(stockSummary.lowStockCount) || arr(stocks).filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row)).length;
}

function formatElevageValue(head = {}) {
  const lots = n(head.activeLots);
  const bovins = n(head.activeAnimals);
  if (lots > 0) {
    return lots === 1 ? '1 bande active' : `${lots} bandes actives`;
  }
  if (bovins > 0) {
    return bovins === 1 ? '1 tête' : `${bovins.toLocaleString('fr-FR')} têtes`;
  }
  if (n(head.activeAvicole) > 0) {
    const parts = [];
    if (n(head.effectifPondeuses) > 0) parts.push(`${n(head.effectifPondeuses).toLocaleString('fr-FR')} pondeuses`);
    if (n(head.effectifChair) > 0) parts.push(`${n(head.effectifChair).toLocaleString('fr-FR')} chair`);
    return parts.join(' · ') || 'Cheptel avicole';
  }
  return 'À renseigner';
}

function formatElevageDetail(head = {}, alertCount = 0) {
  if (alertCount > 0) return `${alertCount} alerte${alertCount > 1 ? 's' : ''}`;
  if (n(head.total) > 0) return 'Santé bonne';
  return 'À renseigner';
}

function shortenJournalLabel(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 'Événement terrain';
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
  if (/paiement/i.test(raw)) return raw.length > 42 ? 'Paiement reçu' : raw;
  if (/vaccin/i.test(raw)) {
    const lot = raw.match(/lot\s+([A-Z0-9-]+)/i);
    return lot ? `Vaccination lot ${lot[1]}` : 'Vaccination prévue';
  }
  return raw.length > 40 ? `${raw.slice(0, 37)}…` : raw;
}

function formatJournalFromEvent(event = {}) {
  const title = shortenJournalLabel(event.title || event.description);
  return { icon: '✓', text: title };
}

function formatJournalFromProduction(row = {}) {
  const eggs = n(row.oeufs_produits ?? row.eggs_count ?? row.quantite);
  if (eggs <= 0) return null;
  return { icon: '✓', text: `${eggs.toLocaleString('fr-FR')} œufs enregistrés` };
}

function formatJournalFromPayment(row = {}) {
  const amount = money(row);
  if (amount <= 0) return null;
  return { icon: '✓', text: `Paiement reçu : ${fmtCurrency(amount)}` };
}

function formatJournalFromHarvest(row = {}) {
  const name = row.culture || row.nom || row.type || 'culture';
  return { icon: '✓', text: `Récolte ${name}` };
}

function formatJournalFromSale(order = {}) {
  const ref = order.reference || order.numero || order.order_number || order.id;
  const label = order.product_name || order.produit || order.client_label || '';
  if (ref) return { icon: '✓', text: `Vente ${String(ref).slice(0, 16)}` };
  if (label) return { icon: '✓', text: `Vente ${label}`.slice(0, 36) };
  return null;
}

function formatJournalFromDelivery(row = {}) {
  const dest = row.destination || row.client_label || row.lieu || row.reference;
  return { icon: '✓', text: dest ? `Livraison ${String(dest).slice(0, 24)}` : 'Livraison effectuée' };
}

function collectAgriculturalActions(summary = {}, props = {}) {
  const actions = [];
  const seen = new Set();

  const push = (text, domain) => {
    if (!text || isHomeNoiseText(text) || seen.has(lower(text))) return;
    seen.add(lower(text));
    actions.push({ text, domain });
  };

  arr(summary.actions)
    .filter((action) => !['smart', 'sync', 'document'].includes(action.iconKey))
    .filter((action) => !isHomeNoiseText(`${action.title} ${action.detail}`))
    .forEach((action) => push(action.title, action.moduleKey || 'terrain'));

  const vaccinLots = countVaccinLotsDue(props.vaccins || props.sante);
  if (vaccinLots > 0) push(vaccinLots === 1 ? '1 lot à vacciner' : `${vaccinLots} lots à vacciner`, 'elevage');

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders),
    payments: arr(props.paymentsAll?.length ? props.paymentsAll : props.payments),
    clients: arr(props.clients),
  });
  if (commercialKpis.unpaidOrders > 0 && n(summary.receivable) > 0) {
    push(commercialKpis.unpaidOrders === 1 ? '1 créance en retard' : `${commercialKpis.unpaidOrders} créances à suivre`, 'finance');
  }

  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);
  if (feedDays != null && feedDays <= 7) {
    push(feedDays <= 3 ? 'Stock aliment faible' : `Aliment : ${feedDays} jour(s) restants`, 'stocks');
  } else {
    const low = countStockLow(props.stocks, summary.stockSummary);
    if (low > 0) push(low === 1 ? '1 stock sous seuil' : `${low} stocks faibles`, 'stocks');
  }

  const harvestTomorrow = arr(props.cultures).filter((row) => cultureRecordType(row) === 'culture' && isTomorrow(row.date_recolte_prevue)).length;
  if (harvestTomorrow > 0) {
    push(harvestTomorrow === 1 ? 'Récolte prévue demain' : `${harvestTomorrow} récoltes demain`, 'cultures');
  }

  return actions;
}

/** Cartes domaine compactes — lecture immédiate, alertes intégrées. */
export function buildCarnetDomainCards(summary = {}, props = {}) {
  const head = summary.headcount || {};
  const culture = summary.cultureSummary || {};
  const stock = summary.stockSummary || {};
  const stocks = arr(props.stocks);
  const actions = collectAgriculturalActions(summary, props);

  const elevageAlerts = actions.filter((a) => a.domain === 'elevage' || /vaccin|soin|bande|aliment/i.test(a.text)).length
    + countVaccinLotsDue(props.vaccins || props.sante);
  const cultureAlerts = actions.filter((a) => a.domain === 'cultures' || /récolte|recolte|parcelle/i.test(a.text)).length;
  const stockAlerts = actions.filter((a) => a.domain === 'stocks' || a.domain === 'achats_stock' || /stock|aliment|rupture/i.test(a.text)).length
    || countStockLow(stocks, stock);
  const financeAlerts = actions.filter((a) => a.domain === 'finance' || a.domain === 'commercial' || /créance|creance|impay/i.test(a.text)).length;

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders),
    payments: arr(props.paymentsAll?.length ? props.paymentsAll : props.payments),
    clients: arr(props.clients),
  });

  const ruptures = countStockRuptures(stocks);
  const lowStock = countStockLow(stocks, stock);
  const harvestToday = countHarvestToday(props.cultures);
  const harvestActive = countHarvestInProgress(props.cultures);
  const receivableCount = commercialKpis.unpaidOrders || 0;

  let stockValue = 'Normaux';
  if (ruptures > 0) stockValue = ruptures === 1 ? '1 rupture' : `${ruptures} ruptures`;
  else if (lowStock > 0) stockValue = lowStock === 1 ? '1 stock faible' : `${lowStock} stocks faibles`;

  let stockDetail = 'Inventaire suivi';
  if (ruptures > 0 && lowStock > 0) stockDetail = `${ruptures} rupture(s) · ${lowStock} faible(s)`;
  else if (lowStock > 0) stockDetail = `${lowStock} sous seuil`;

  let financeValue = receivableCount > 0
    ? (receivableCount === 1 ? '1 créance à suivre' : `${receivableCount} créances à suivre`)
    : (summary.cashNet < 0 ? 'Trésorerie tendue' : 'Situation stable');
  let financeDetail = summary.cashNet >= 0 ? 'Encaissements suivis' : 'Attention trésorerie';

  const parcelCount = n(culture.parcelCount);
  let cultureValue = culture.hasData
    ? `${parcelCount} parcelle${parcelCount > 1 ? 's' : ''}`
    : 'À configurer';
  let cultureDetail = harvestToday > 0
    ? `${harvestToday} récolte${harvestToday > 1 ? 's' : ''} aujourd'hui`
    : (harvestActive > 0 ? `${harvestActive} en récolte` : 'Suivi actif');

  return [
    {
      id: 'elevage',
      icon: '🐔',
      label: 'Élevage',
      value: formatElevageValue(head),
      detail: formatElevageDetail(head, elevageAlerts),
      alerts: elevageAlerts,
    },
    {
      id: 'cultures',
      icon: '🌾',
      label: 'Cultures',
      value: cultureValue,
      detail: cultureDetail,
      alerts: cultureAlerts,
    },
    {
      id: 'stocks',
      icon: '📦',
      label: 'Stock',
      value: stockValue,
      detail: stockDetail,
      alerts: stockAlerts,
    },
    {
      id: 'finances',
      icon: '💰',
      label: 'Finance',
      value: financeValue,
      detail: financeDetail,
      alerts: financeAlerts,
    },
  ];
}

/** Journal du jour — max 5, événements agricoles uniquement. */
export function buildCarnetTodayJournal(props = {}, { limit = CARNET_JOURNAL_LIMIT } = {}) {
  const entries = [];
  const seen = new Set();

  const push = (entry) => {
    if (!entry?.text || isHomeNoiseText(entry.text)) return;
    const key = lower(entry.text);
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };

  arr(props.businessEvents || props.business_events)
    .filter((row) => isToday(row.event_date || row.date || row.created_at))
    .filter(isAgriculturalHomeEvent)
    .sort((a, b) => {
      const da = parseDate(rowDateValue(a))?.getTime() || 0;
      const db = parseDate(rowDateValue(b))?.getTime() || 0;
      return db - da;
    })
    .forEach((row) => push(formatJournalFromEvent(row)));

  arr(props.salesOrdersAll || props.salesOrders)
    .filter((row) => isToday(row.date || row.date_commande || row.created_at))
    .forEach((row) => {
      const line = formatJournalFromSale(row);
      if (line) push(line);
    });

  arr(props.deliveries || props.deliveriesList)
    ?.filter((row) => isToday(row.date || row.date_livraison || row.created_at))
    .forEach((row) => push(formatJournalFromDelivery(row)));

  arr(props.productionLogs)
    .filter((row) => isToday(row.date || row.date_production || row.created_at))
    .forEach((row) => {
      const line = formatJournalFromProduction(row);
      if (line) push(line);
    });

  arr(props.paymentsAll || props.payments)
    .filter((row) => isToday(row.date_paiement || row.date || row.created_at))
    .forEach((row) => {
      const line = formatJournalFromPayment(row);
      if (line) push(line);
    });

  arr(props.cultures)
    .filter((row) => isToday(row.date_recolte_reelle || row.date_recolte) && n(row.quantite_recoltee ?? row.recolte) >= 0)
    .forEach((row) => push(formatJournalFromHarvest(row)));

  arr(props.vaccins || props.sante)
    .filter((row) => isToday(row.date_prevue || row.date || row.created_at))
    .filter((row) => !['fait', 'done', 'termine', 'terminé'].includes(lower(row.statut || row.status)))
    .forEach((row) => {
      const lot = row.lot_label || row.lot_id || row.lot || 'terrain';
      push({ icon: '✓', text: `Vaccination lot ${String(lot).slice(0, 12)}` });
    });

  const totalCount = entries.length;

  if (!entries.length) {
    return { items: [{ icon: '·', text: 'Rien de notable aujourd\'hui' }], totalCount: 0, hasMore: false };
  }

  return {
    items: entries.slice(0, limit),
    totalCount,
    hasMore: totalCount > limit,
  };
}

/** @deprecated V2 — alertes intégrées aux cartes domaine. */
export function buildCarnetAttentionItems(summary = {}, priorities = [], props = {}) {
  return collectAgriculturalActions(summary, props)
    .slice(0, CARNET_ATTENTION_LIMIT)
    .map((item) => ({ text: item.text }));
}

/** @deprecated V2 — utiliser buildCarnetDomainCards. */
export function buildCarnetExploitationState(summary = {}, props = {}) {
  return buildCarnetDomainCards(summary, props);
}

/** Un seul conseil — texte court, sans liste. */
export function buildCarnetConseil(summary = {}, priorities = [], props = {}) {
  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);
  const feedName = feedProductName(props.stocks);

  if (feedDays != null && feedDays <= 7) {
    const product = /maïs|mais/i.test(feedName) ? 'maïs' : (/aliment/i.test(feedName) ? "d'aliment" : `de ${feedName.toLowerCase()}`);
    return {
      title: 'Conseil Horizon',
      text: `Le stock ${product} couvre encore ${feedDays} jour${feedDays > 1 ? 's' : ''}. Planifiez un réapprovisionnement.`,
    };
  }

  const low = countStockLow(props.stocks, summary.stockSummary);
  if (low > 0) {
    return {
      title: 'Conseil Horizon',
      text: `${low} produit${low > 1 ? 's' : ''} sous le seuil — anticipez les achats intrants cette semaine.`,
    };
  }

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders),
    payments: arr(props.paymentsAll?.length ? props.paymentsAll : props.payments),
    clients: arr(props.clients),
  });
  if (commercialKpis.unpaidOrders > 0 && n(summary.receivable) > 0) {
    return {
      title: 'Conseil Horizon',
      text: `${commercialKpis.unpaidOrders} créance${commercialKpis.unpaidOrders > 1 ? 's' : ''} à relancer — commencez par les clients les plus en retard.`,
    };
  }

  if (summary.cashNet < 0) {
    return {
      title: 'Conseil Horizon',
      text: 'La trésorerie est tendue : priorisez les encaissements avant les dépenses non urgentes.',
    };
  }

  if (summary.startupMode) {
    return {
      title: 'Conseil Horizon',
      text: 'Votre carnet se remplit au fil des saisies — commencez par une bande, une parcelle ou une vente.',
    };
  }

  return {
    title: 'Conseil Horizon',
    text: 'L\'exploitation est calme aujourd\'hui — consultez les modules pour agir au bon moment.',
  };
}

/** Vue Carnet Horizon V2 — layout anti-scroll. */
export function buildCarnetHorizonView({ summary = {}, priorities = [], props = {} } = {}) {
  const journal = buildCarnetTodayJournal(props);
  return {
    domains: buildCarnetDomainCards(summary, props),
    journal,
    conseil: buildCarnetConseil(summary, priorities, props),
  };
}
