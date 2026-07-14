/**
 * Commercial V3 - relances planifiées (via tâches Activité & Suivi).
 */

import { makeId } from './ids.js';
import { buildCommercialRelanceRows } from './commercialRelances.js';
import { resolveWhatsAppTemplate } from './whatsappCommercial.js';
import { fmtCurrency } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export const RELANCE_TASK_STATUSES = {
  PLANNED: 'planifiee',
  DONE: 'faite',
  SKIPPED: 'ignoree',
};

export function buildScheduledRelanceTask({
  relance = {},
  dueDate = '',
  assignee = '',
} = {}) {
  const due = dueDate || relance.dueDate || new Date().toISOString().slice(0, 10);
  return {
    id: makeId('TSK'),
    title: `Relance ${relance.type || 'client'} · ${relance.clientName || relance.clientId}`,
    description: relance.message || relance.recommendedAction || '',
    module_lie: 'commercial',
    related_id: relance.orderId || relance.clientId || '',
    client_id: relance.clientId || '',
    order_id: relance.orderId || '',
    quote_id: relance.quoteId || '',
    due_date: due,
    priority: relance.priority === 'Urgent' ? 'haute' : relance.priority === 'Prioritaire' ? 'moyenne' : 'normale',
    status: 'a_faire',
    statut: 'a_faire',
    relance_status: RELANCE_TASK_STATUSES.PLANNED,
    relance_channel: relance.channel || 'WhatsApp',
    relance_type: relance.type || 'creance',
    assignee: assignee || relance.assignee || '',
    checklist: [`Canal: ${relance.channel || 'Appel'}`, relance.recommendedAction || 'Relancer le client'].filter(Boolean),
    created_from: 'commercial_scheduled_relance_v3',
    source_module: 'commercial',
  };
}

export function enrichRelancesWithSchedule(relanceRows = [], tasks = []) {
  const taskByRelance = new Map();
  arr(tasks).forEach((task) => {
    const key = `${task.client_id || ''}:${task.order_id || ''}:${task.relance_type || ''}`;
    if (task.relance_status || lower(task.created_from || '').includes('relance')) {
      taskByRelance.set(key, task);
    }
  });

  return arr(relanceRows).map((relance) => {
    const key = `${relance.clientId || ''}:${relance.orderId || ''}:${relance.type || ''}`;
    const task = taskByRelance.get(key);
    return {
      ...relance,
      scheduled: Boolean(task),
      scheduledDate: task?.due_date || null,
      taskId: task?.id || null,
      relanceStatus: task?.relance_status || (task ? RELANCE_TASK_STATUSES.PLANNED : null),
      assignee: task?.assignee || '',
    };
  });
}

export function buildScheduledRelanceRows(context = {}) {
  const base = buildCommercialRelanceRows(context);
  return enrichRelancesWithSchedule(base, context.tasks);
}

export function planRelanceForSubscription(subscription = {}, client = {}) {
  return {
    id: `relance-abo-${subscription.id}`,
    type: 'abonnement',
    priority: 'Prioritaire',
    clientId: subscription.clientId,
    clientName: subscription.clientName,
    amount: subscription.unitPrice * subscription.quantity,
    channel: client?.whatsapp || client?.tel ? 'WhatsApp' : 'Appel',
    message: resolveWhatsAppTemplate('confirmation_commande', {
      clientName: subscription.clientName,
      product: subscription.productName,
      amount: fmtCurrency(subscription.unitPrice * subscription.quantity),
    }),
    recommendedAction: 'Confirmer la prochaine commande abonnement',
    dueDate: subscription.nextOrderDate,
  };
}

export function planRelanceForDelivery(deliveryRow = {}) {
  return {
    id: `relance-liv-${deliveryRow.id}`,
    type: 'livraison',
    priority: deliveryRow.late ? 'Urgent' : 'Normal',
    clientId: deliveryRow.clientId,
    clientName: deliveryRow.clientName,
    orderId: deliveryRow.orderId,
    channel: deliveryRow.contact ? 'WhatsApp' : 'Appel',
    message: resolveWhatsAppTemplate('livraison', {
      clientName: deliveryRow.clientName,
      orderId: deliveryRow.orderId,
      date: deliveryRow.plannedDate,
    }),
    recommendedAction: deliveryRow.late ? 'Confirmer livraison en retard' : 'Confirmer créneau livraison',
    dueDate: deliveryRow.plannedDate,
  };
}
