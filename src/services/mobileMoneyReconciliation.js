/**
 * Rapprochement Mobile Money (Wave / Orange Money).
 *
 * Le nerf de la trésorerie au Sénégal : les paiements arrivent par Wave/OM et le
 * rapprochement avec les commandes se fait à la main. Ici on automatise :
 *  - parseMobileMoneyStatement : lit un relevé / SMS de confirmation → transactions
 *    structurées (montant, téléphone, référence, date, opérateur) ;
 *  - matchMobileMoneyTransaction : rapproche une transaction d'une commande impayée
 *    (client par téléphone + montant ≈ reste à payer) ;
 *  - buildMobileMoneyReconciliation : lot complet → rapprochées (encaissement
 *    pré-rempli, à valider), ambiguës, non rapprochées, doublons.
 *
 * Aucun encaissement automatique : chaque rapprochement produit un brouillon à
 * confirmer (recordSalePayment reste le seul point d'exécution).
 */

import { normalizePhone } from '../utils/whatsappShare.js';
import { remainingForOrder } from '../utils/salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => { const n = Number(String(v ?? '').replace(/[\s.]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const clean = (v) => String(v ?? '').trim();
const lower = (v) => clean(v).toLowerCase();

/** Détecte l'opérateur à partir du texte. */
export function detectProvider(text = '') {
  const t = lower(text);
  if (/\bwave\b/.test(t)) return 'wave';
  if (/orange\s*money|\bom\b|\borange\b/.test(t)) return 'orange_money';
  if (/free\s*money|\byas\b/.test(t)) return 'free_money';
  return 'mobile_money';
}

const AMOUNT_RE = /(\d[\d\s.]*\d|\d)\s*(?:f\s*cfa|fcfa|xof|francs?|f\b)/i;
const PHONE_RE = /(?:\+?221\s*)?(7[05678])(?:[\s.-]?\d){7}/;
const REF_RE = /(?:r[ée]f(?:[ée]rence)?|transaction|txn|id|code)\s*[:#-]?\s*([A-Z0-9]{4,})/i;
const DATE_RE = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;

const toISO = (text = '') => {
  const m = clean(text).match(DATE_RE);
  if (!m) return new Date().toISOString().slice(0, 10);
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
};

/**
 * Parse un relevé / SMS Mobile Money (une transaction par ligne non vide).
 * @returns [{ provider, amount, phone, reference, date, direction, raw }]
 */
export function parseMobileMoneyStatement(input = '') {
  const lines = clean(input).split(/\r?\n/).map(clean).filter(Boolean);
  return lines.flatMap((line, i) => {
    const amountMatch = line.match(AMOUNT_RE);
    if (!amountMatch) return [];
    const amount = num(amountMatch[1]);
    if (amount <= 0) return [];
    const phoneMatch = line.match(PHONE_RE);
    const refMatch = line.match(REF_RE);
    // Sens : on ne rapproche que les paiements REÇUS (entrées).
    const isIncoming = /(re[çc]u|recu|re[çc]ue|credit[ée]|received|de\s+\+?221|de\s+7)/i.test(line);
    const isOutgoing = /(envoy[ée]|d[ée]bit[ée]|retrait|paiement\s+[àa]|sent)/i.test(line);
    return [{
      id: `mm-${i}-${refMatch?.[1] || Math.round(amount)}`,
      provider: detectProvider(line),
      amount,
      phone: phoneMatch ? normalizePhone(phoneMatch[0]) : '',
      reference: clean(refMatch?.[1] || ''),
      date: toISO(line),
      direction: isOutgoing && !isIncoming ? 'sortie' : 'entree',
      raw: line,
    }];
  });
}

// Clé de comparaison téléphone : 9 derniers chiffres (indépendant du préfixe 221).
const phoneKey = (p = '') => {
  const digits = String(normalizePhone(p) || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
};
const clientPhones = (client = {}) => [client.whatsapp, client.tel, client.telephone, client.phone, client.mobile]
  .map(phoneKey).filter(Boolean);

/**
 * Rapproche une transaction Mobile Money d'une commande impayée.
 * Priorité : client identifié par téléphone + reste ≈ montant. À défaut, montant
 * seul (confiance plus basse). Tolérance de 1 FCFA sur l'arrondi.
 * @returns { status, order, client, confidence, reason }
 */
export function matchMobileMoneyTransaction(tx = {}, { orders = [], clients = [], payments = [] } = {}) {
  if (tx.direction === 'sortie') return { status: 'ignored', reason: 'transaction sortante (non-encaissement)' };

  // Doublon : référence déjà encaissée.
  if (tx.reference && arr(payments).some((p) => lower(p.mobile_money_ref || p.reference || p.mobileMoneyRef) === lower(tx.reference))) {
    return { status: 'duplicate', reason: 'référence déjà encaissée' };
  }

  const amount = num(tx.amount);
  const phone = phoneKey(tx.phone);
  const clientById = new Map(arr(clients).map((c) => [String(c.id), c]));
  const matchedClient = phone
    ? arr(clients).find((c) => clientPhones(c).includes(phone))
    : null;

  const remainingOf = (o) => num(o.reste_a_payer ?? remainingForOrder(o, payments));
  const unpaid = arr(orders).filter((o) => remainingOf(o) > 0.5);
  const near = (o) => Math.abs(remainingOf(o) - amount) <= 1;

  // 1) Client identifié : sa commande dont le reste correspond au montant.
  if (matchedClient) {
    const own = unpaid.filter((o) => String(o.client_id) === String(matchedClient.id));
    const exact = own.find(near);
    if (exact) return { status: 'matched', order: exact, client: matchedClient, confidence: 0.95, reason: 'client + montant exact' };
    if (own.length === 1) return { status: 'matched', order: own[0], client: matchedClient, confidence: 0.8, reason: 'client unique impayé' };
    if (own.length > 1) return { status: 'ambiguous', client: matchedClient, candidates: own, confidence: 0.5, reason: 'plusieurs commandes du client' };
    // Client connu mais aucune commande impayée : encaissement à rattacher manuellement.
    return { status: 'unmatched', client: matchedClient, confidence: 0.3, reason: 'client sans commande impayée' };
  }

  // 2) Sans client : montant exact sur une seule commande impayée.
  const exactByAmount = unpaid.filter(near);
  if (exactByAmount.length === 1) {
    const o = exactByAmount[0];
    return { status: 'matched', order: o, client: clientById.get(String(o.client_id)) || null, confidence: 0.7, reason: 'montant exact (client non identifié)' };
  }
  if (exactByAmount.length > 1) return { status: 'ambiguous', candidates: exactByAmount, confidence: 0.4, reason: 'plusieurs commandes au même montant' };

  return { status: 'unmatched', confidence: 0.2, reason: 'aucune commande correspondante' };
}

/** Brouillon d'encaissement pré-rempli pour recordSalePayment (à valider). */
function buildPaymentDraftFromMatch(tx, match) {
  const o = match.order || {};
  return {
    form_type: 'payment_record',
    sale: { id: o.id, order_id: o.id, client_id: o.client_id, client_label: o.client_label || o.client_name },
    order_id: o.id,
    client_id: o.client_id || match.client?.id || '',
    requestedAmount: num(tx.amount),
    montant: num(tx.amount),
    paymentMethod: tx.provider,
    moyen_paiement: tx.provider,
    paymentDate: tx.date,
    date: tx.date,
    mobile_money_ref: tx.reference,
    reference: tx.reference,
    requires_validation: true,
    source: 'mobile_money_reconciliation',
  };
}

/**
 * Rapproche tout un relevé Mobile Money contre les commandes.
 * @returns { items, summary }
 */
export function buildMobileMoneyReconciliation({ statement = '', transactions = null, orders = [], clients = [], payments = [] } = {}) {
  const feed = Array.isArray(transactions) ? transactions : parseMobileMoneyStatement(statement);
  const items = feed.map((tx) => {
    const match = matchMobileMoneyTransaction(tx, { orders, clients, payments });
    return {
      transaction: tx,
      status: match.status,
      confidence: match.confidence ?? 0,
      reason: match.reason || '',
      orderId: match.order?.id || null,
      clientId: match.client?.id || match.order?.client_id || null,
      candidates: (match.candidates || []).map((o) => o.id),
      draft: match.status === 'matched' ? buildPaymentDraftFromMatch(tx, match) : null,
      requiresManualReview: match.status !== 'matched',
    };
  });

  const count = (s) => items.filter((i) => i.status === s).length;
  const matchedAmount = items.filter((i) => i.status === 'matched').reduce((s, i) => s + num(i.transaction.amount), 0);
  return {
    items,
    summary: {
      total: items.length,
      matched: count('matched'),
      ambiguous: count('ambiguous'),
      unmatched: count('unmatched'),
      duplicate: count('duplicate'),
      ignored: count('ignored'),
      matchedAmount,
      autoMatchRate: items.length ? Math.round((count('matched') / items.length) * 100) : 0,
    },
  };
}

export default buildMobileMoneyReconciliation;
