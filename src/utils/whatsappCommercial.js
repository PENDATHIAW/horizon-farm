/**
 * Commercial V2 - WhatsApp fiable (statuts explicites, pas de faux envoi API).
 */

const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export const WHATSAPP_STATUSES = {
  PREPARE: 'prepare',
  OPENED: 'ouvert',
  SENT_MANUAL: 'envoye_manuel',
  FAILED: 'echec',
  TO_RELANCE: 'a_relancer',
};

export const WHATSAPP_STATUS_LABELS = {
  prepare: 'Préparé',
  ouvert: 'Ouvert dans WhatsApp',
  envoye_manuel: 'Envoyé manuellement',
  echec: 'Échec',
  a_relancer: 'À relancer',
};

export const WHATSAPP_TEMPLATES = {
  confirmation_commande: ({ clientName = 'Client', orderId = '', amount = '', product = '' } = {}) =>
    `Bonjour ${clientName}, votre commande ${orderId}${product ? ` (${product})` : ''}${amount ? ` de ${amount}` : ''} est bien enregistrée chez Horizon Farm. Merci pour votre confiance.`,
  rappel_paiement: ({ clientName = 'Client', amount = '', orderId = '' } = {}) =>
    `Bonjour ${clientName}, sauf erreur il reste ${amount}${orderId ? ` sur la commande ${orderId}` : ''} à régler. Merci de nous confirmer le paiement.`,
  devis: ({ clientName = 'Client', quoteId = '', amount = '', product = '' } = {}) =>
    `Bonjour ${clientName}, voici notre devis ${quoteId}${product ? ` pour ${product}` : ''}${amount ? ` : ${amount}` : ''}. Disponible pour en discuter.`,
  facture: ({ clientName = 'Client', invoiceId = '', amount = '' } = {}) =>
    `Bonjour ${clientName}, facture ${invoiceId}${amount ? ` · ${amount}` : ''}. Merci de nous confirmer réception.`,
  livraison: ({ clientName = 'Client', orderId = '', date = '' } = {}) =>
    `Bonjour ${clientName}, livraison prévue${date ? ` le ${date}` : ''} pour la commande ${orderId}. Merci de confirmer votre disponibilité.`,
  relance_dormant: ({ clientName = 'Client' } = {}) =>
    `Bonjour ${clientName}, nous aimerions reprendre contact. Souhaitez-vous recevoir nos disponibilités Horizon Farm ?`,
};

export function buildWhatsAppLogPayload({
  client = {},
  message = '',
  reason = 'relance_client',
  status = WHATSAPP_STATUSES.PREPARE,
  orderId = '',
  invoiceId = '',
  quoteId = '',
  paymentId = '',
  logId = '',
  provider = 'whatsapp',
} = {}) {
  const clientId = client.id || '';
  const recipient = client.whatsapp || client.tel || client.phone || '';
  return {
    id: logId,
    client_id: clientId,
    order_id: orderId || '',
    invoice_id: invoiceId || '',
    quote_id: quoteId || '',
    payment_id: paymentId || '',
    recipient,
    message,
    status,
    provider,
    reason,
    sent_at: new Date().toISOString(),
    manual_send_confirmed: status === WHATSAPP_STATUSES.SENT_MANUAL,
    delivery_confirmed: false,
    api_confirmed: false,
  };
}

export function normalizeWhatsAppStatus(value = '') {
  const v = lower(value);
  if (['prepare', 'prepared', 'draft'].includes(v)) return WHATSAPP_STATUSES.PREPARE;
  if (['ouvert', 'opened', 'open'].includes(v)) return WHATSAPP_STATUSES.OPENED;
  if (['envoye_manuel', 'sent_manual', 'envoye', 'sent'].includes(v)) return WHATSAPP_STATUSES.SENT_MANUAL;
  if (['echec', 'failed', 'error'].includes(v)) return WHATSAPP_STATUSES.FAILED;
  if (['a_relancer', 'to_relance', 'relance'].includes(v)) return WHATSAPP_STATUSES.TO_RELANCE;
  return WHATSAPP_STATUSES.PREPARE;
}

export function canMarkWhatsAppSent(status = '') {
  return [WHATSAPP_STATUSES.PREPARE, WHATSAPP_STATUSES.OPENED, WHATSAPP_STATUSES.TO_RELANCE].includes(normalizeWhatsAppStatus(status));
}

export function whatsAppStatusLabel(status = '') {
  return WHATSAPP_STATUS_LABELS[normalizeWhatsAppStatus(status)] || 'Préparé';
}

export function resolveWhatsAppTemplate(templateKey = 'confirmation_commande', context = {}) {
  const fn = WHATSAPP_TEMPLATES[templateKey] || WHATSAPP_TEMPLATES.confirmation_commande;
  return fn(context);
}
