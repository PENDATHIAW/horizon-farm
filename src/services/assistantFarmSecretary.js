/**
 * Contexte secrétaire agricole — lecture seule via moteurs canoniques existants.
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

/** En-tête « Ferme Horizon » — texte uniquement, pas de KPI/cartes. */
export function buildAssistantFarmHeader(props = {}) {
  const { summary, secretaryProps } = buildAssistantSecretaryContext(props);
  const cards = buildCarnetDomainCards(summary, secretaryProps);
  const animals = parseHeadcount(cards);
  const parcels = countActiveParcels(secretaryProps.cultures);
  const products = n(summary.stockSummary?.totalProducts) || secretaryProps.stocks.length;
  const journal = buildCarnetTodayJournal(secretaryProps, { limit: 1 });
  const lastRaw = journal.items?.[0]?.text || '';

  return {
    farmName: 'Ferme Horizon',
    statsLine: `${fmt(animals)} animaux · ${fmt(parcels)} parcelles · ${fmt(products)} produits en stock`,
    lastActivityLine: `Dernière activité : ${formatLastActivityLabel(lastRaw)}`,
  };
}

/** Message d'accueil conversationnel avant toute saisie utilisateur. */
export function buildAssistantWelcomeMessage(displayName = 'Exploitant', props = {}) {
  const { summary, secretaryProps } = buildAssistantSecretaryContext(props);
  const bullets = [];

  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: secretaryProps.salesOrdersAll,
    payments: secretaryProps.paymentsAll,
    clients: secretaryProps.clients,
  });
  const followUpCount = n(commercialKpis.unpaidOrders);
  if (followUpCount > 0) {
    bullets.push(`${followUpCount} client${followUpCount > 1 ? 's' : ''} à relancer`);
  }

  const cards = buildCarnetDomainCards(summary, secretaryProps);
  const elevageAlerts = cards.find((card) => card.id === 'elevage')?.alerts || [];
  const cultureAlerts = cards.find((card) => card.id === 'cultures')?.alerts || [];
  if (elevageAlerts.length > 0) {
    bullets.push(`${elevageAlerts.length} lot${elevageAlerts.length > 1 ? 's' : ''} à surveiller`);
  } else if (cultureAlerts.length > 0) {
    const parcelAlert = cultureAlerts[0].text.match(/(\d+)/);
    const count = parcelAlert ? parcelAlert[1] : '1';
    bullets.push(`${count} parcelle${Number(count) > 1 ? 's' : ''} à surveiller`);
  }

  const monthTarget = n(summary.goal?.periodTarget);
  const monthRealized = n(commercialKpis.ca);
  const attainment = monthTarget > 0
    ? Math.round((monthRealized / monthTarget) * 100)
    : n(summary.goal?.periodAttainment);
  if (attainment > 0) {
    bullets.push(`objectif mensuel atteint à ${attainment} %`);
  }

  if (!bullets.length) {
    bullets.push('exploitation calme aujourd\'hui');
  }

  const firstName = String(displayName || 'Exploitant').trim().split(/\s+/)[0];
  const lines = [
    `Bonjour ${firstName}.`,
    '',
    'Aujourd\'hui :',
    ...bullets.slice(0, 3).map((item) => `• ${item.charAt(0).toUpperCase()}${item.slice(1)}`),
    '',
    'Que souhaitez-vous faire ?',
  ];

  return {
    id: 'welcome',
    role: 'assistant',
    text: lines.join('\n'),
    isWelcome: true,
  };
}
