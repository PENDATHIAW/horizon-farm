/**
 * POC automatisation - Relances créances « du jour ».
 *
 * Assemble les briques existantes (détection des impayés, cadence J+2/J+7/J+15,
 * modèle de message, lien WhatsApp) en UN geste automatique : « voici les
 * relances à envoyer aujourd'hui, déjà rédigées et prêtes à partir ».
 *
 * Deux étages, comme la note stratégique :
 *  - déterministe : détection + cadence + rédaction de repli (hors-ligne, gratuit) ;
 *  - amorce IA : un `aiDrafter` optionnel (branché plus tard sur la passerelle Claude)
 *    peut personnaliser le message ; s'il échoue ou renvoie vide, on retombe
 *    proprement sur la rédaction déterministe. L'envoi reste toujours manuel.
 */

import { buildCommercialRelanceRows } from '../utils/commercialRelances.js';
import { buildRelanceMessageForChannel, RELANCE_LEVELS, COMMERCIAL_RELANCE_WHATSAPP_POLICY } from '../utils/commercialRelanceSchedules.js';
import { buildWhatsappShareUrl, normalizePhone } from '../utils/whatsappShare.js';
import { fmtCurrency } from '../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const clean = (v) => String(v ?? '').trim();

/** Niveau d'escalade selon l'ancienneté de l'impayé. En deçà de 2 j : trop tôt. */
export function relanceLevelForOverdue(overdueDays = 0) {
  const days = n(overdueDays);
  if (days >= 15) return RELANCE_LEVELS.find((l) => l.key === 'j15');
  if (days >= 7) return RELANCE_LEVELS.find((l) => l.key === 'j7');
  if (days >= 2) return RELANCE_LEVELS.find((l) => l.key === 'j2');
  return null;
}

const WARM_SEGMENTS = new Set(['vip', 'fidele', 'fidèle', 'regulier', 'régulier', 'premium']);
const SENSITIVE_SEGMENTS = new Set(['dormant', 'a risque', 'à risque', 'risque', 'nouveau']);

const norm = (v) => clean(v).toLowerCase();

/**
 * Rédaction déterministe « intelligente » : part du modèle métier existant et
 * l'adapte à la relation client (segment) et à l'ancienneté. C'est le repli
 * quand l'IA n'est pas jointe - déjà plus fin qu'un modèle figé.
 */
export function draftRelanceMessageDeterministic({
  level = 'j2',
  clientName = 'Client',
  amount = 0,
  orderId = '',
  overdueDays = 0,
  segment = '',
} = {}) {
  const base = buildRelanceMessageForChannel({ channel: 'whatsapp', level, clientName, amount, orderId, overdueDays });
  const seg = norm(segment);
  if (WARM_SEGMENTS.has(seg) && level === 'j2') {
    return base.replace(
      'Petit rappel courtois :',
      'Merci pour votre fidélité. Petit rappel courtois :',
    );
  }
  if (SENSITIVE_SEGMENTS.has(seg) && level !== 'j2') {
    return `${base}\n\nNous restons à votre écoute pour convenir d'un échéancier si besoin.`;
  }
  return base;
}

/**
 * Rédige le message d'une relance. Utilise l'amorce IA si fournie et fructueuse,
 * sinon la rédaction déterministe. `aiDrafter` : async (context) => string|null.
 */
export async function draftRelanceMessage(context = {}, aiDrafter = null) {
  if (typeof aiDrafter === 'function') {
    try {
      const drafted = await aiDrafter(context);
      const text = clean(drafted);
      if (text) return { message: text, source: 'ai' };
    } catch {
      /* repli déterministe ci-dessous */
    }
  }
  return { message: draftRelanceMessageDeterministic(context), source: 'deterministic' };
}

const phoneOfClient = (client = {}) => normalizePhone(client.whatsapp || client.tel || client.telephone || client.phone || '');

/**
 * Lot de relances à traiter aujourd'hui : détection des créances échues, choix
 * du niveau, rédaction (IA ou repli), lien WhatsApp pré-rempli, synthèse.
 * Aucun envoi automatique : chaque item est « prêt à envoyer » (manuel).
 *
 * @returns { date, items, summary }
 */
export async function buildDailyRelanceBatch({
  clients = [],
  orders = [],
  payments = [],
  referenceDate = '',
  aiDrafter = null,
} = {}) {
  const date = clean(referenceDate) || new Date().toISOString().slice(0, 10);
  const creances = buildCommercialRelanceRows({ clients, orders, payments })
    .filter((row) => row.type === 'creance' && n(row.amount) > 0);

  const clientById = new Map(arr(clients).map((c) => [String(c.id), c]));
  const items = [];

  for (const row of creances) {
    const level = relanceLevelForOverdue(row.overdueDays);
    if (!level) continue; // impayé trop récent : pas encore de relance
    const client = clientById.get(String(row.clientId)) || { id: row.clientId, nom: row.clientName };
    const orderId = arr(orders).find((o) => String(o.client_id) === String(row.clientId))?.id || '';
    const context = {
      level: level.key,
      levelLabel: level.label,
      tone: level.tone,
      clientName: row.clientName,
      amount: n(row.amount),
      orderId,
      overdueDays: n(row.overdueDays),
      segment: row.segment,
    };
    const drafted = await draftRelanceMessage(context, aiDrafter);
    const phone = phoneOfClient(client);
    items.push({
      id: `relance-jour-${row.clientId}-${level.key}`,
      clientId: row.clientId,
      clientName: row.clientName,
      amount: n(row.amount),
      amountLabel: fmtCurrency(n(row.amount)),
      overdueDays: n(row.overdueDays),
      level: level.key,
      levelLabel: level.label,
      tone: level.tone,
      priority: level.key === 'j15' ? 'Urgent' : level.key === 'j7' ? 'Prioritaire' : 'Normal',
      channel: phone ? 'whatsapp' : 'appel',
      phone,
      message: drafted.message,
      messageSource: drafted.source,
      whatsappUrl: buildWhatsappShareUrl({ title: `Relance ${level.label}`, message: drafted.message }, phone),
      requiresManualSend: true,
      sendPolicy: COMMERCIAL_RELANCE_WHATSAPP_POLICY,
    });
  }

  items.sort((a, b) => (b.overdueDays - a.overdueDays) || (b.amount - a.amount));

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const byLevel = items.reduce((acc, i) => { acc[i.level] = (acc[i.level] || 0) + 1; return acc; }, {});
  const sendableNow = items.filter((i) => i.channel === 'whatsapp').length;

  return {
    date,
    items,
    summary: {
      count: items.length,
      totalAmount,
      totalAmountLabel: fmtCurrency(totalAmount),
      byLevel,
      sendableNow,
      needsPhone: items.length - sendableNow,
      aiDrafted: items.filter((i) => i.messageSource === 'ai').length,
    },
  };
}

export default buildDailyRelanceBatch;
