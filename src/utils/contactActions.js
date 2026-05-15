import toast from 'react-hot-toast';

export function normalizePhone(phone = '') {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 9 && digits.startsWith('7')) return `221${digits}`;
  if (digits.length === 8) return `221${digits}`;
  return digits;
}

export function buildWhatsAppAppUrl(phone, message = '') {
  const normalized = normalizePhone(phone);
  const text = encodeURIComponent(message || '');
  return normalized ? `whatsapp://send?phone=${normalized}&text=${text}` : `whatsapp://send?text=${text}`;
}

export function buildWhatsAppWebUrl(phone, message = '') {
  const normalized = normalizePhone(phone);
  const text = encodeURIComponent(message || '');
  return normalized ? `https://wa.me/${normalized}?text=${text}` : `https://wa.me/?text=${text}`;
}

export async function copyContactMessage(message = '') {
  try {
    await navigator.clipboard?.writeText(message || '');
    toast.success('Message copié, tu peux le modifier avant envoi.');
    return true;
  } catch {
    toast('Message prêt à envoyer.');
    return false;
  }
}

export async function openWhatsAppApp({ phone, message, fallbackWeb = false } = {}) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    const error = new Error('Numéro WhatsApp manquant ou invalide');
    error.code = 'WHATSAPP_PHONE_INVALID';
    toast.error(error.message);
    throw error;
  }
  await copyContactMessage(message);
  window.location.href = buildWhatsAppAppUrl(normalized, message);
  if (fallbackWeb) {
    window.setTimeout(() => window.open(buildWhatsAppWebUrl(normalized, message), '_blank', 'noopener,noreferrer'), 1400);
  }
  toast.success('Ouverture de WhatsApp avec message préparé');
  return true;
}

export function callPhone(phone = '') {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    toast.error('Numéro téléphone manquant');
    return false;
  }
  window.location.href = `tel:${normalized}`;
  return true;
}

export function defaultClientMessage({ name = 'client', amount = 0, reason = 'suivi' } = {}) {
  if (reason === 'creance' && Number(amount) > 0) {
    return `Bonjour ${name}, sauf erreur, il reste ${Number(amount).toLocaleString('fr-FR')} FCFA à régler sur vos commandes Horizon Farm. Merci.`;
  }
  if (reason === 'produits') {
    return `Bonjour ${name}, Horizon Farm vous informe que des produits sont disponibles. Souhaitez-vous réserver ou commander ?`;
  }
  return `Bonjour ${name}, Horizon Farm vous contacte pour le suivi de votre demande.`;
}

export function defaultSupplierMessage({ name = 'fournisseur', reason = 'commande', amount = 0 } = {}) {
  if (reason === 'dette' && Number(amount) > 0) {
    return `Bonjour ${name}, je souhaite faire le point sur le règlement fournisseur de ${Number(amount).toLocaleString('fr-FR')} FCFA. Merci.`;
  }
  return `Bonjour ${name}, Horizon Farm souhaite vérifier vos disponibilités et préparer une commande. Merci.`;
}

export function defaultAlertMessage(alert = {}) {
  return `[Horizon Farm] ${String(alert.severity || 'info').toUpperCase()}\n${alert.title || 'Alerte'}\n${alert.message || ''}\nAction: ${alert.action_recommandee || 'Vérifier dans Horizon Farm'}\nModule: ${alert.module_source || '-'}\nRéf: ${alert.entity_id || '-'}`;
}
