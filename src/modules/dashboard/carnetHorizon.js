/**
 * Carnet Horizon — agrégation lecture seule pour l'Accueil.
 * Réutilise les moteurs canoniques existants (pas de recalcul parallèle).
 */

import { fmtCurrency } from '../../utils/format.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { rowDateValue } from '../../utils/periodScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => Number(value || 0);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_paye ?? row.paid_amount);

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

function fridayLabel() {
  const date = new Date();
  const day = date.getDay();
  const daysUntilFriday = day <= 5 ? 5 - day : 5 + (7 - day);
  const friday = new Date(date);
  friday.setDate(friday.getDate() + daysUntilFriday);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(friday);
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

function countVaccinLotsDue(sante = []) {
  return arr(sante).filter((row) => ['retard', 'a faire', 'à faire', 'a_faire', 'en retard'].some((term) => lower(row.statut || row.status).includes(term))).length;
}

function countHarvestTomorrow(cultures = []) {
  return arr(cultures).filter((row) => cultureRecordType(row) === 'culture' && isTomorrow(row.date_recolte_prevue)).length;
}

function journalIcon(entry = {}) {
  const source = lower(`${entry.module_source || ''} ${entry.event_type || ''} ${entry.title || ''}`);
  if (/oeuf|avicole|ponte|alimentation/.test(source)) return '🐔';
  if (/culture|recolte|récolte|parcelle/.test(source)) return '🌾';
  if (/paiement|encaisse|finance|vente/.test(source)) return '💰';
  if (/maintenance|equipement|équipement/.test(source)) return '🚜';
  if (/stock|aliment/.test(source)) return '📦';
  return '·';
}

function formatJournalFromEvent(event = {}) {
  const title = String(event.title || event.description || 'Événement enregistré').trim();
  return { icon: journalIcon(event), text: title };
}

function formatJournalFromProduction(row = {}) {
  const eggs = n(row.oeufs_produits ?? row.eggs_count ?? row.quantite);
  if (eggs <= 0) return null;
  return { icon: '🐔', text: `${eggs.toLocaleString('fr-FR')} œufs enregistrés` };
}

function formatJournalFromPayment(row = {}) {
  const amount = money(row);
  if (amount <= 0) return null;
  return { icon: '💰', text: `Paiement reçu : ${fmtCurrency(amount)}` };
}

function formatJournalFromHarvest(row = {}) {
  const qty = n(row.quantite_recoltee ?? row.recolte ?? row.quantite);
  const name = row.culture || row.nom || row.type || 'culture';
  if (qty <= 0) return null;
  return { icon: '🌾', text: `Récolte ${name} : ${qty.toLocaleString('fr-FR')} kg` };
}

/** Section 1 — Ce qui demande mon attention (liste simple, lecture seule). */
export function buildCarnetAttentionItems(summary = {}, priorities = [], props = {}) {
  const items = [];
  const seen = new Set();

  const push = (text) => {
    const key = lower(text);
    if (!text || seen.has(key)) return;
    seen.add(key);
    items.push({ text: `⚠️ ${text}` });
  };

  arr(priorities).forEach((item) => {
    if (item.title) push(item.title);
  });

  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);
  if (feedDays != null && feedDays <= 7 && !seen.has(lower(`stock aliment estimé inférieur à ${feedDays} jour(s)`))) {
    push(`Aliment ${feedDays <= 3 ? 'faible' : 'à surveiller'} (${feedDays} jour(s) estimés)`);
  }

  const vaccinLots = countVaccinLotsDue(props.vaccins || props.sante);
  if (vaccinLots > 0) {
    push(vaccinLots === 1 ? '1 lot à vacciner' : `${vaccinLots} lots à vacciner`);
  }

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders),
    payments: arr(props.paymentsAll?.length ? props.paymentsAll : props.payments),
    clients: arr(props.clients),
  });
  if (commercialKpis.unpaidOrders > 0 && summary.receivable > 0) {
    push(commercialKpis.unpaidOrders === 1 ? '1 facture impayée' : `${commercialKpis.unpaidOrders} factures impayées`);
  }

  const harvestTomorrow = countHarvestTomorrow(props.cultures);
  if (harvestTomorrow > 0) {
    push(harvestTomorrow === 1 ? 'Récolte prévue demain' : `${harvestTomorrow} récoltes prévues demain`);
  }

  arr(summary.actions).slice(0, 4).forEach((action) => {
    if (action.title) push(action.title);
  });

  if (!items.length && summary.startupMode) {
    items.push({ text: '⚠️ Exploitation en démarrage — compléter les premières saisies' });
  }

  if (!items.length) {
    items.push({ text: 'Rien d\'urgent pour le moment' });
  }

  return items.slice(0, 8);
}

/** Section 2 — Journal du jour (max 10 événements). */
export function buildCarnetTodayJournal(props = {}) {
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
    .filter((row) => isToday(row.event_date || row.date || row.created_at))
    .sort((a, b) => {
      const da = parseDate(rowDateValue(a))?.getTime() || 0;
      const db = parseDate(rowDateValue(b))?.getTime() || 0;
      return db - da;
    })
    .forEach((row) => push(formatJournalFromEvent(row)));

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
    .filter((row) => isToday(row.date_recolte_reelle || row.date_recolte) && n(row.quantite_recoltee ?? row.recolte) > 0)
    .forEach((row) => {
      const line = formatJournalFromHarvest(row);
      if (line) push(line);
    });

  arr(props.taches)
    .filter((row) => isToday(row.date_fin || row.completed_at || row.updated_at) && ['termine', 'terminé', 'done'].includes(lower(row.status || row.statut)))
    .filter((row) => /maintenance|réparation|reparation|entretien/i.test(`${row.titre || row.title || ''} ${row.categorie || ''}`))
    .forEach((row) => push({ icon: '🚜', text: `Maintenance terminée : ${row.titre || row.title || 'tâche'}` }));

  if (!entries.length) {
    entries.push({ icon: '·', text: 'Aucun événement enregistré aujourd\'hui' });
  }

  return entries.slice(0, 10);
}

/** Section 3 — État de l'exploitation (une ligne par domaine, sans graphique). */
export function buildCarnetExploitationState(summary = {}, props = {}) {
  const head = summary.headcount || {};
  const culture = summary.cultureSummary || {};
  const stock = summary.stockSummary || {};
  const lowStock = n(stock.lowStockCount || summary.stockBas);
  const harvestCount = countHarvestInProgress(props.cultures);
  const vaccinLate = countVaccinLotsDue(props.vaccins || props.sante);

  let elevageHealth = 'Santé bonne';
  if (vaccinLate > 0) elevageHealth = vaccinLate === 1 ? '1 soin en retard' : `${vaccinLate} soins en retard`;
  else if (n(head.total) === 0) elevageHealth = 'À renseigner';

  let stockLabel = 'Normaux';
  if (lowStock > 0) stockLabel = lowStock === 1 ? '1 produit sous seuil' : `${lowStock} produits sous seuil`;

  let financeLabel = 'Situation positive';
  if (summary.cashNet < 0) financeLabel = 'Trésorerie tendue';
  else if (summary.resultat < 0) financeLabel = 'Résultat période négatif';
  else if (summary.receivable > summary.encaisse && summary.receivable > 0) financeLabel = 'Créances à suivre';

  const cultureDetail = culture.hasData
    ? `${n(culture.parcelCount)} parcelles${harvestCount ? ` · ${harvestCount} en récolte` : ''}`
    : 'Parcelles à configurer';

  return [
    {
      id: 'elevage',
      icon: '🐔',
      label: 'Élevage',
      value: head.total > 0 ? `${n(head.total).toLocaleString('fr-FR')} animaux` : 'Non renseigné',
      detail: elevageHealth,
    },
    {
      id: 'cultures',
      icon: '🌾',
      label: 'Cultures',
      value: cultureDetail,
      detail: culture.hasData ? (harvestCount ? `${harvestCount} en récolte` : 'Suivi actif') : 'À configurer',
    },
    {
      id: 'stocks',
      icon: '📦',
      label: 'Stocks',
      value: stockLabel,
      detail: stock.totalProducts > 0 ? `${n(stock.totalProducts)} produit(s) suivis` : 'Inventaire vide',
    },
    {
      id: 'finances',
      icon: '💰',
      label: 'Finances',
      value: financeLabel,
      detail: summary.cashNet >= 0 ? `Trésorerie ${fmtCurrency(summary.cashNet)}` : `Trésorerie ${fmtCurrency(summary.cashNet)}`,
    },
  ];
}

/** Section 4 — Un seul conseil Horizon. */
export function buildCarnetConseil(summary = {}, priorities = [], props = {}) {
  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);

  if (feedDays != null && feedDays <= 7) {
    return {
      title: 'Conseil Horizon',
      lines: [
        `Les stocks d'aliment couvrent encore ${feedDays} jour${feedDays > 1 ? 's' : ''}.`,
        feedDays <= 4 ? `Prévoir un réapprovisionnement avant ${fridayLabel()}.` : 'Planifier le prochain achat d\'aliment.',
      ],
    };
  }

  const stockPriority = arr(priorities).find((p) => p.id === 'stock-critical' || p.id === 'feed-stock');
  if (stockPriority) {
    return {
      title: 'Conseil Horizon',
      lines: [stockPriority.detail || stockPriority.title, 'Réapprovisionner depuis Achats & Stock.'],
    };
  }

  const receivablePriority = arr(priorities).find((p) => p.id === 'receivables');
  if (receivablePriority && summary.receivable > 0) {
    return {
      title: 'Conseil Horizon',
      lines: [
        `${fmtCurrency(summary.receivable)} restent à encaisser.`,
        'Relancer les clients depuis le module Commercial.',
      ],
    };
  }

  if (summary.cashNet < 0) {
    return {
      title: 'Conseil Horizon',
      lines: [
        'La trésorerie est sous pression.',
        'Prioriser les encaissements et reporter les dépenses non urgentes.',
      ],
    };
  }

  if (summary.startupMode) {
    return {
      title: 'Conseil Horizon',
      lines: [
        'Votre carnet se remplit au fil des saisies.',
        'Commencez par le stock, les animaux ou une première vente.',
      ],
    };
  }

  return {
    title: 'Conseil Horizon',
    lines: [
      'L\'exploitation est à jour sur les points suivis.',
      'Consultez les modules pour agir quand vous le souhaitez.',
    ],
  };
}

/** Vue complète Carnet Horizon. */
export function buildCarnetHorizonView({ summary = {}, priorities = [], props = {} } = {}) {
  return {
    attention: buildCarnetAttentionItems(summary, priorities, props),
    today: buildCarnetTodayJournal(props),
    state: buildCarnetExploitationState(summary, props),
    conseil: buildCarnetConseil(summary, priorities, props),
  };
}
