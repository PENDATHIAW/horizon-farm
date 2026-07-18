/**
 * Partage WhatsApp d'une alerte (sans backend).
 *
 * Ouvre WhatsApp avec un message pré-rempli (lien wa.me ou partage natif) pour
 * transférer une alerte grave à un responsable/groupe en un tap. Aucun serveur
 * requis : c'est le canal disponible immédiatement.
 *
 * L'envoi 100 % automatique (sans action, app fermée) viendra d'un fournisseur
 * (Meta WhatsApp Cloud API / Twilio) branché plus tard — la structure ci-dessous
 * (message + destinataire) est déjà celle qu'un tel envoi consommera.
 */

const clean = (v) => String(v ?? '').trim();
const lower = (v) => clean(v).toLowerCase();

function severityLabel(severity = '') {
  const s = lower(severity);
  if (s === 'urgence') return '🚨 URGENCE';
  if (s === 'critique' || s === 'haute') return '⚠️ CRITIQUE';
  if (s === 'warning') return '⚡ Attention';
  return 'ℹ️ Info';
}

/** Numéro au format international sans « + » ni espaces (requis par wa.me). */
export function normalizePhone(phone = '') {
  const digits = clean(phone).replace(/[^\d]/g, '');
  return digits || '';
}

/** Message WhatsApp lisible construit à partir d'une alerte. */
export function buildWhatsappMessage(alert = {}) {
  const lines = [
    `${severityLabel(alert.severity ?? alert.gravite)} — Horizon Farm`,
    clean(alert.title || alert.type),
    clean(alert.message || alert.text),
  ];
  const action = clean(alert.action_recommandee || alert.action);
  if (action) lines.push(`Action : ${action}`);
  const module = clean(alert.module_source || alert.moduleKey);
  if (module) lines.push(`Module : ${module}`);
  return lines.filter(Boolean).join('\n');
}

/** Lien wa.me pré-rempli. Avec numéro = discussion ciblée ; sans = sélecteur. */
export function buildWhatsappShareUrl(alert = {}, phone = '') {
  const text = encodeURIComponent(buildWhatsappMessage(alert));
  const number = normalizePhone(phone);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

/**
 * Partage l'alerte via WhatsApp. Utilise le partage natif s'il est dispo
 * (mobile), sinon ouvre wa.me. Renvoie true si un canal a été déclenché.
 */
export async function shareAlertOnWhatsapp(alert = {}, { phone = '' } = {}) {
  const url = buildWhatsappShareUrl(alert, phone);
  if (typeof window === 'undefined') return false;
  // Partage natif : laisse l'utilisateur choisir WhatsApp dans la feuille de partage.
  if (!phone && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Alerte Horizon Farm', text: buildWhatsappMessage(alert) });
      return true;
    } catch {
      // L'utilisateur a annulé ou le partage a échoué : on retombe sur wa.me.
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
