/**
 * Commercial V3 — abonnements / commandes récurrentes (metadata client légère).
 */

import { makeId } from './ids.js';
import { readClientCommercialTerms } from './commercialPricing.js';
import { rowFarmId } from './farmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => Number(value || 0);

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'actif',
  SUSPENDED: 'suspendu',
  STOPPED: 'arrete',
};

export const FREQUENCY_LABELS = {
  daily: 'Quotidien',
  quotidien: 'Quotidien',
  weekly: 'Hebdomadaire',
  hebdomadaire: 'Hebdomadaire',
  biweekly: 'Tous les 2 jours',
  bi_hebdo: 'Tous les 2 jours',
  monthly: 'Mensuel',
  mensuel: 'Mensuel',
};

function subscriptionsOf(client = {}) {
  const terms = readClientCommercialTerms(client);
  return arr(client.commercial_subscriptions || terms.subscriptions || client.abonnements);
}

export function readAllCommercialSubscriptions(clients = []) {
  const rows = [];
  arr(clients).forEach((client) => {
    subscriptionsOf(client).forEach((sub) => {
      rows.push(normalizeSubscription(sub, client));
    });
  });
  return rows.sort((a, b) => String(a.nextOrderDate || '').localeCompare(String(b.nextOrderDate || '')));
}

export function normalizeSubscription(sub = {}, client = {}) {
  const status = lower(sub.status || sub.statut || SUBSCRIPTION_STATUSES.ACTIVE);
  return {
    id: sub.id || makeId('ABO'),
    clientId: sub.client_id || client.id || '',
    clientName: sub.client_name || client.nom || client.name || '',
    productName: sub.product_name || sub.produit || '',
    sourceType: sub.source_type || 'stock',
    sourceId: sub.source_id || '',
    quantity: num(sub.quantity ?? sub.quantite),
    unit: sub.unit || sub.unite || 'unité',
    frequency: lower(sub.frequency || sub.frequence || 'weekly'),
    frequencyLabel: FREQUENCY_LABELS[lower(sub.frequency || sub.frequence)] || sub.frequency || 'Hebdomadaire',
    plannedDay: sub.planned_day || sub.jour_prevu || '',
    unitPrice: num(sub.unit_price ?? sub.prix_unitaire),
    discountPct: num(sub.discount_pct ?? sub.remise_pct),
    farmId: sub.farm_id || rowFarmId(client) || null,
    status,
    statusLabel: status === SUBSCRIPTION_STATUSES.ACTIVE ? 'Actif' : status === SUBSCRIPTION_STATUSES.SUSPENDED ? 'Suspendu' : 'Arrêté',
    nextOrderDate: sub.next_order_date || sub.prochaine_commande || computeNextOrderDate(sub),
    notes: sub.notes || '',
    raw: sub,
    client,
  };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeNextOrderDate(sub = {}, fromDate = '') {
  const base = fromDate || sub.last_order_date || sub.derniere_commande || new Date().toISOString().slice(0, 10);
  const freq = lower(sub.frequency || sub.frequence || 'weekly');
  if (freq.includes('daily') || freq.includes('quotidien')) return addDays(base, 1);
  if (freq.includes('bi')) return addDays(base, 2);
  if (freq.includes('month') || freq.includes('mensuel')) return addDays(base, 30);
  return addDays(base, 7);
}

export function buildSubscriptionRecord({
  client = {},
  productName = '',
  quantity = 1,
  unit = 'unité',
  frequency = 'weekly',
  plannedDay = '',
  unitPrice = 0,
  discountPct = 0,
  farmId = null,
  sourceType = 'stock',
  sourceId = '',
} = {}) {
  return {
    id: makeId('ABO'),
    client_id: client.id,
    client_name: client.nom || client.name,
    product_name: productName,
    source_type: sourceType,
    source_id: sourceId,
    quantity,
    unit,
    frequency,
    planned_day: plannedDay,
    unit_price: unitPrice,
    discount_pct: discountPct,
    farm_id: farmId || rowFarmId(client),
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    statut: SUBSCRIPTION_STATUSES.ACTIVE,
    next_order_date: computeNextOrderDate({ frequency }),
    created_at: new Date().toISOString(),
  };
}

export function upsertClientSubscription(client = {}, subscription = {}) {
  const existing = subscriptionsOf(client);
  const next = existing.some((s) => s.id === subscription.id)
    ? existing.map((s) => (s.id === subscription.id ? { ...s, ...subscription } : s))
    : [...existing, subscription];
  const terms = client.commercial_terms || client.terms_commerciaux || {};
  return {
    commercial_subscriptions: next,
    commercial_terms: { ...terms, subscriptions: next },
  };
}

export function buildSubscriptionOrderDraft(subscription = {}, client = {}) {
  const lineTotal = Math.max(0, num(subscription.unitPrice) * num(subscription.quantity));
  const discount = subscription.discountPct > 0 ? Math.round(lineTotal * subscription.discountPct / 100) : 0;
  return {
    form_type: 'sale_record',
    date: new Date().toISOString().slice(0, 10),
    client_id: subscription.clientId || client.id,
    source_type: subscription.sourceType || 'service',
    source_id: subscription.sourceId || '',
    product_name: subscription.productName,
    quantity: subscription.quantity,
    unit: subscription.unit,
    unit_price: subscription.unitPrice,
    discount_pct: subscription.discountPct,
    payment_status: 'non_paye',
    fulfillment_mode: 'a_livrer',
    invoice_issued: true,
    subscription_id: subscription.id,
    line_total: lineTotal - discount,
    intent_label: `Abonnement · ${subscription.productName}`,
  };
}

export function subscriptionsToPrepare(subscriptions = [], withinDays = 3) {
  const limit = new Date();
  limit.setDate(limit.getDate() + withinDays);
  const limitStr = limit.toISOString().slice(0, 10);
  return arr(subscriptions).filter((sub) => {
    if (sub.status !== SUBSCRIPTION_STATUSES.ACTIVE) return false;
    return sub.nextOrderDate && sub.nextOrderDate <= limitStr;
  });
}
