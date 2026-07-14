/**
 * Contexte secrétaire agricole - lecture seule via moteurs de calcul existants.
 * consolidateFinance · buildConsolidatedCommercialKpis · buildObjectifsCroissanceData · carnetHorizon
 */

import { buildDashboardSummary } from '../modules/dashboard/dashboardMetrics.js';
import {
  buildCarnetDomainCards,
  buildCarnetTodayJournal,
} from '../modules/dashboard/carnetHorizon.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const fmt = (v) => n(v).toLocaleString('fr-FR');
const lower = (v) => String(v || '').trim().toLowerCase();

function cultureRecordType(row = {}) {
  return lower(row.record_type || row.type_fiche || 'culture');
}

function countActiveParcels(cultures = []) {
  return arr(cultures)
    .filter((row) => ['parcelle', 'culture'].includes(cultureRecordType(row)))
    .filter((row) => !['termine', 'terminé', 'perdu', 'archive', 'archivé'].includes(lower(row.statut || row.status)))
    .length;
}

function normalizeSecretaryProps(props = {}) {
  const dm = props.dataMap || {};
  return {
    stocks: arr(props.stocks ?? dm.stock ?? dm.stocks),
    cultures: arr(props.cultures ?? dm.cultures),
    animaux: arr(props.animaux ?? dm.animaux ?? dm.animals),
    lots: arr(props.lotsData ?? props.lots ?? dm.avicole ?? dm.lots),
    salesOrders: arr(props.salesOrders ?? dm.sales_orders ?? dm.salesOrders),
    salesOrdersAll: arr(props.salesOrdersAll ?? props.salesOrders ?? dm.sales_orders ?? dm.salesOrders),
    payments: arr(props.payments ?? dm.payments),
    paymentsAll: arr(props.paymentsAll ?? props.payments ?? dm.payments),
    transactions: arr(props.transactionsAll ?? props.transactions ?? dm.finances ?? dm.transactions),
    clients: arr(props.clients ?? dm.clients),
    vaccins: arr(props.vaccins ?? props.sante ?? dm.vaccins ?? dm.sante),
    sante: arr(props.sante ?? dm.sante),
    taches: arr(props.taches ?? dm.taches ?? dm.tasks),
    businessEvents: arr(props.businessEvents ?? props.businessEventsAll ?? dm.business_events ?? dm.businessEvents),
    alimentationLogs: arr(props.alimentationLogs ?? dm.alimentation_logs),
    productionLogs: arr(props.productionLogs ?? dm.production_oeufs_logs),
    deliveries: arr(props.deliveries ?? dm.deliveries),
    fournisseurs: arr(props.fournisseurs ?? dm.fournisseurs),
    periodScope: props.periodScope || dm.periodScope || { mode: 'all' },
  };
}

function parseHeadcount(cards = []) {
  const elevage = cards.find((card) => card.id === 'elevage');
  const raw = String(elevage?.headline || '');
  const match = raw.match(/([\d\s\u00a0]+)/);
  return match ? parseInt(match[1].replace(/\s/g, ''), 10) || 0 : 0;
}

function formatLastActivityLabel(text = '') {
  const value = String(text || '').trim();
  if (!value || value.includes('Aucun événement')) return 'aucune activité récente';
  if (/vente/i.test(value)) {
    const hour = new Date().getHours();
    return hour < 12 ? 'Vente ce matin' : 'Vente aujourd\'hui';
  }
  if (/paiement/i.test(value)) return 'Paiement reçu récemment';
  if (/récolte|recolte/i.test(value)) return 'Récolte récente';
  if (/livraison/i.test(value)) return 'Livraison récente';
  return value.length > 36 ? `${value.slice(0, 33)}…` : value;
}

export function buildAssistantSecretaryContext(props = {}) {
  const secretaryProps = normalizeSecretaryProps(props);
  const summary = buildDashboardSummary(secretaryProps, secretaryProps.periodScope);
  return { summary, secretaryProps };
}

/** En-tête « Ferme Horizon » - texte uniquement, pas de KPI/cartes. */
export function buildAssistantFarmHeader(props = {}) {
  const { summary, secretaryProps } = buildAssistantSecretaryContext(props);
  const cards = buildCarnetDomainCards(summary, secretaryProps);
  const animals = parseHeadcount(cards);
  const parcels = countActiveParcels(secretaryProps.cultures);
  const products = n(summary.stockSummary?.totalProducts) || secretaryProps.stocks.length;
  const journal = buildCarnetTodayJournal(secretaryProps, { limit: 1 });
  const lastRaw = journal.items?.[0]?.text || '';

  return {
    brandName: 'Horizon',
    brandEmoji: '🌿',
    tagline: 'Parlez à votre ferme',
    farmName: 'Horizon',
    statsLine: `${fmt(animals)} animaux • ${fmt(parcels)} parcelles • ${fmt(products)} produits`,
    lastActivityLine: `Dernière activité : ${formatLastActivityLabel(lastRaw)}`,
  };
}

/** Message d'accueil conversationnel - ton directeur d'exploitation, zéro liste ERP. */
export function buildAssistantWelcomeMessage(displayName = 'Exploitant', props = {}) {
  const { summary, secretaryProps } = buildAssistantSecretaryContext(props);
  const firstName = String(displayName || 'Exploitant').trim().split(/\s+/)[0];

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: secretaryProps.salesOrdersAll,
    payments: secretaryProps.paymentsAll,
    clients: secretaryProps.clients,
  });
  const followUpCount = n(commercialKpis.unpaidOrders);

  const cards = buildCarnetDomainCards(summary, secretaryProps);
  const elevageAlerts = cards.find((card) => card.id === 'elevage')?.alerts || [];
  const cultureAlerts = cards.find((card) => card.id === 'cultures')?.alerts || [];

  const sentences = [`Bonjour ${firstName}.`];

  if (!followUpCount && !elevageAlerts.length && !cultureAlerts.length) {
    sentences.push('Dans l\'ensemble, l\'exploitation est plutôt calme aujourd\'hui.');
  } else {
    sentences.push('Dans l\'ensemble, la ferme se tient bien.');
    if (followUpCount > 0) {
      sentences.push(
        `J'ai repéré ${followUpCount} créance${followUpCount > 1 ? 's' : ''} qui mériterai${followUpCount > 1 ? 'ent' : 't'} une relance.`,
      );
    }
    if (elevageAlerts.length > 0) {
      sentences.push(
        `${elevageAlerts.length} lot${elevageAlerts.length > 1 ? 's' : ''} mérite${elevageAlerts.length > 1 ? 'nt' : ''} un œil cette semaine.`,
      );
    } else if (cultureAlerts.length > 0) {
      sentences.push('Une parcelle demande un peu d\'attention côté cultures.');
    }
  }

  sentences.push('De quoi voulez-vous qu\'on parle ?');

  return {
    id: 'welcome',
    role: 'assistant',
    text: sentences.join('\n\n'),
    isWelcome: true,
  };
}
