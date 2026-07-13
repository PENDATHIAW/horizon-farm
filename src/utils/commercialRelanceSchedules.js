/**
 * Commercial V1 - relances IA planifiées J+2, J+7, J+15 (WhatsApp, SMS, Email).
 */

import { fmtCurrency } from './format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

/** Génération auto des relances ; envoi WhatsApp toujours manuel (anti-faux envoi). */
export const COMMERCIAL_RELANCE_WHATSAPP_POLICY = 'manual_send_only';

export const RELANCE_LEVELS = [
  { key: 'j2', label: 'J+2', days: 2, tone: 'courtois' },
  { key: 'j7', label: 'J+7', days: 7, tone: 'professionnel' },
  { key: 'j15', label: 'J+15', days: 15, tone: 'formel' },
];

export const RELANCE_CHANNELS = ['whatsapp', 'sms', 'email'];

function clientName(client = {}) {
  return client.nom || client.name || client.raison_sociale || 'Client';
}

function overduePhrase(days = 0, level = 'j2') {
  if (level === 'j2') return days > 0 ? `depuis ${days} jour(s)` : 'à échéance proche';
  if (level === 'j7') return `depuis ${Math.max(days, 7)} jour(s) au minimum`;
  return `depuis plus de ${Math.max(days, 15)} jour(s)`;
}

export function buildRelanceMessageForChannel({
  channel = 'whatsapp',
  level = 'j2',
  clientName: name = 'Client',
  amount = 0,
  orderId = '',
  overdueDays = 0,
} = {}) {
  const amt = typeof amount === 'number' ? fmtCurrency(amount) : amount;
  const ref = orderId ? ` (réf. ${orderId})` : '';
  const overdue = overduePhrase(overdueDays, level);

  if (channel === 'sms') {
    if (level === 'j2') {
      return `Bonjour ${name}, rappel amical : solde ${amt}${ref}. Merci de confirmer le paiement. - Horizon Farm`;
    }
    if (level === 'j7') {
      return `Bonjour ${name}, nous n'avons pas reçu ${amt}${ref}, en retard ${overdue}. Merci de régulariser. - Horizon Farm`;
    }
    return `Bonjour ${name}, solde ${amt}${ref} toujours impayé ${overdue}. Contactez-nous pour planifier le règlement. - Horizon Farm`;
  }

  if (channel === 'email') {
    const subject = level === 'j15'
      ? `Relance paiement - solde ${amt}`
      : level === 'j7'
        ? `Rappel de paiement - ${orderId || 'commande'}`
        : `Rappel amical - ${orderId || 'commande'}`;
    const body = level === 'j2'
      ? `Bonjour ${name},\n\nNous vous contactons courtoisement concernant le solde de ${amt}${ref}.\nMerci de nous indiquer la date de règlement prévue.\n\nCordialement,\nL'équipe Horizon Farm`
      : level === 'j7'
        ? `Bonjour ${name},\n\nÀ ce jour, le solde de ${amt}${ref} reste en attente (${overdue}).\nNous vous remercions de procéder au paiement ou de nous confirmer votre échéance.\n\nCordialement,\nL'équipe Horizon Farm`
        : `Bonjour ${name},\n\nMalgré nos précédents rappels, le solde de ${amt}${ref} n'a pas été réglé (${overdue}).\nMerci de nous contacter rapidement pour éviter une suspension de livraisons.\n\nCordialement,\nL'équipe Horizon Farm`;
    return `Objet : ${subject}\n\n${body}`;
  }

  // WhatsApp (défaut)
  if (level === 'j2') {
    return `Bonjour ${name},\n\nPetit rappel courtois : il reste ${amt}${ref} à régler.\nMerci de nous confirmer quand vous pourrez effectuer le paiement.\n\nCordialement,\nHorizon Farm`;
  }
  if (level === 'j7') {
    return `Bonjour ${name},\n\nNous constatons un solde de ${amt}${ref} en attente (${overdue}).\nPourriez-vous nous indiquer la date de règlement ?\n\nMerci,\nHorizon Farm`;
  }
  return `Bonjour ${name},\n\nDernier rappel concernant le solde de ${amt}${ref}, impayé ${overdue}.\nMerci de nous contacter pour régulariser la situation.\n\nCordialement,\nHorizon Farm`;
}

export function buildScheduledRelancePlan({
  client = {},
  amount = 0,
  orderId = '',
  overdueDays = 0,
  dueDate = '',
} = {}) {
  const name = clientName(client);
  const baseDate = dueDate ? new Date(dueDate) : new Date();
  if (Number.isNaN(baseDate.getTime())) baseDate.setTime(Date.now());

  return RELANCE_LEVELS.flatMap((level) =>
    RELANCE_CHANNELS.map((channel) => {
      const scheduled = new Date(baseDate);
      scheduled.setDate(scheduled.getDate() + level.days);
      return {
        id: `relance-plan-${orderId || client.id}-${level.key}-${channel}`,
        level: level.key,
        levelLabel: level.label,
        channel,
        scheduledDate: scheduled.toISOString().slice(0, 10),
        clientId: client.id,
        clientName: name,
        orderId,
        amount: n(amount),
        overdueDays,
        message: buildRelanceMessageForChannel({
          channel,
          level: level.key,
          clientName: name,
          amount: n(amount),
          orderId,
          overdueDays,
        }),
        tone: level.tone,
        priority: level.key === 'j15' ? 'Urgent' : level.key === 'j7' ? 'Prioritaire' : 'Normal',
        sendPolicy: channel === 'whatsapp' ? COMMERCIAL_RELANCE_WHATSAPP_POLICY : 'channel_default',
        requiresManualSend: channel === 'whatsapp',
      };
    }),
  );
}

export function enrichRelanceRowsWithSchedules(relanceRows = [], clients = []) {
  return arr(relanceRows).flatMap((row) => {
    const client = arr(clients).find((c) => String(c.id) === String(row.clientId)) || { id: row.clientId, nom: row.clientName };
    const plan = buildScheduledRelancePlan({
      client,
      amount: row.amount,
      orderId: row.orderId,
      overdueDays: row.overdueDays || 0,
    });
    return plan.map((item) => ({
      ...row,
      ...item,
      id: item.id,
      type: row.type || 'creance',
      recommendedAction: `Relance ${item.levelLabel} via ${item.channel}`,
    }));
  });
}

export function pickRelanceForToday(plans = [], referenceDate = '') {
  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  return arr(plans).filter((p) => p.scheduledDate === ref);
}
