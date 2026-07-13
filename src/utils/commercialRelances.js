/**
 * Commercial V2 — relances clients structurées (priorité, canal, message).
 */

import {  buildClientSegment } from '../services/clientSegmentationEngine.js';
import { buildClientSalesSummary } from './clientWorkflows.js';
import { isQuoteOrder, quoteStatusOf, QUOTE_STATUSES } from './commercialQuoteWorkflow.js';
import { remainingForOrder } from './salesStatuses.js';
import { saleAmount, linkedPaymentsForOrders } from '../modules/commercial/commercialMetrics.js';
import { resolveWhatsAppTemplate, WHATSAPP_STATUSES } from './whatsappCommercial.js';
import { fmtCurrency } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);



function clientName(client = {}) {
  return client.nom || client.name || client.id || 'Client';
}

function daysOverdue(order = {}) {
  const due = order.date_echeance || order.due_date || order.date;
  if (!due) return 0;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function priorityScore({ amount = 0, overdueDays = 0, segment = '' } = {}) {
  let score = Math.min(100, Math.round(amount / 10000));
  if (overdueDays > 60) score += 40;
  else if (overdueDays > 30) score += 25;
  else if (overdueDays > 7) score += 10;
  if (segment.includes('VIP') || segment.includes('Gros')) score += 15;
  if (segment.includes('risque')) score += 20;
  return Math.min(100, score);
}

function priorityLabel(score = 0) {
  if (score >= 70) return 'Urgent';
  if (score >= 40) return 'Prioritaire';
  return 'Normal';
}

export function buildCommercialRelanceRows({
  clients = [],
  orders = [],
  payments = [],
} = {}) {
  const rows = [];
  const linked = linkedPaymentsForOrders(orders, payments);


  arr(clients).forEach((client) => {
    const summary = buildClientSalesSummary(client, orders, payments);
    const segment = buildClientSegment(client, { sales_orders: orders, payments });
    if (summary.resteAPayer > 0) {
      const clientOrders = arr(orders).filter((o) => String(o.client_id) === String(client.id));
      const maxOverdue = clientOrders.reduce((max, o) => Math.max(max, daysOverdue(o)), 0);
      const score = priorityScore({ amount: summary.resteAPayer, overdueDays: maxOverdue, segment: segment.segment });
      rows.push({
        id: `relance-creance-${client.id}`,
        type: 'creance',
        priority: priorityLabel(score),
        priorityScore: score,
        clientId: client.id,
        clientName: clientName(client),
        amount: summary.resteAPayer,
        overdueDays: maxOverdue,
        segment: segment.segment,
        channel: client.whatsapp || client.tel ? 'WhatsApp' : 'Appel',
        message: resolveWhatsAppTemplate('rappel_paiement', {
          clientName: clientName(client),
          amount: fmtCurrency(summary.resteAPayer),
          orderId: clientOrders[0]?.id || '',
        }),
        recommendedAction: 'Relancer le paiement avant nouvelle commande',
        whatsappStatus: WHATSAPP_STATUSES.TO_RELANCE,
      });
    }

    if (segment.segment === 'Dormant') {
      rows.push({
        id: `relance-dormant-${client.id}`,
        type: 'dormant',
        priority: 'Normal',
        priorityScore: 20,
        clientId: client.id,
        clientName: clientName(client),
        amount: summary.totalAchete,
        overdueDays: null,
        segment: segment.segment,
        channel: client.whatsapp || client.tel ? 'WhatsApp' : 'Appel',
        message: resolveWhatsAppTemplate('relance_dormant', { clientName: clientName(client) }),
        recommendedAction: 'Proposer disponibilités et nouvelle commande',
        whatsappStatus: WHATSAPP_STATUSES.PREPARE,
      });
    }
  });

  arr(orders).filter(isQuoteOrder).forEach((quote) => {
    const status = quoteStatusOf(quote);
    if (![QUOTE_STATUSES.SENT, QUOTE_STATUSES.DRAFT].includes(status)) return;
    const sentAt = quote.quote_sent_at || quote.date;
    const days = sentAt ? Math.floor((Date.now() - new Date(sentAt).getTime()) / 86400000) : 0;
    if (status === QUOTE_STATUSES.DRAFT && days < 1) return;
    const client = arr(clients).find((c) => String(c.id) === String(quote.client_id));
    rows.push({
      id: `relance-devis-${quote.id}`,
      type: 'devis',
      priority: days > 7 ? 'Prioritaire' : 'Normal',
      priorityScore: days > 7 ? 50 : 25,
      clientId: quote.client_id,
      clientName: quote.client_label || clientName(client || {}),
      amount: saleAmount(quote),
      overdueDays: days,
      segment: 'Devis en attente',
      channel: client?.whatsapp || client?.tel ? 'WhatsApp' : 'Appel',
      message: resolveWhatsAppTemplate('devis', {
        clientName: quote.client_label || clientName(client || {}),
        quoteId: quote.id,
        amount: fmtCurrency(saleAmount(quote)),
        product: quote.product_name,
      }),
      recommendedAction: status === QUOTE_STATUSES.DRAFT ? 'Envoyer le devis' : 'Relancer réponse devis',
      orderId: quote.id,
      whatsappStatus: WHATSAPP_STATUSES.PREPARE,
    });
  });

  arr(orders).forEach((order) => {
    if (isQuoteOrder(order)) return;
    const rest = remainingForOrder(order, linked);
    if (rest <= 0) return;
    const client = arr(clients).find((c) => String(c.id) === String(order.client_id));
    if (!client) return;
    const overdue = daysOverdue(order);
    if (overdue < 7) return;
    const existing = rows.find((r) => r.clientId === client.id && r.type === 'creance');
    if (existing) return;
    rows.push({
      id: `relance-order-${order.id}`,
      type: 'impaye',
      priority: priorityLabel(priorityScore({ amount: rest, overdueDays: overdue })),
      priorityScore: priorityScore({ amount: rest, overdueDays: overdue }),
      clientId: client.id,
      clientName: clientName(client),
      amount: rest,
      overdueDays: overdue,
      segment: 'Impayé',
      channel: client.whatsapp || client.tel ? 'WhatsApp' : 'Appel',
      message: resolveWhatsAppTemplate('rappel_paiement', {
        clientName: clientName(client),
        amount: fmtCurrency(rest),
        orderId: order.id,
      }),
      recommendedAction: 'Encaisser ou planifier relance',
      orderId: order.id,
      whatsappStatus: WHATSAPP_STATUSES.TO_RELANCE,
    });
  });

  return rows.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}

export function relanceSummary(rows = []) {
  return {
    total: rows.length,
    urgent: rows.filter((r) => r.priority === 'Urgent').length,
    amount: rows.reduce((sum, r) => sum + num(r.amount), 0),
  };
}
