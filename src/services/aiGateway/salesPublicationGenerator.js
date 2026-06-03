/**
 * Générateur de publications commerciales — contenus uniquement, pas d'envoi ni de prix auto.
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';
import { daysUntilDlc, dlcAlertLevel } from '../../utils/stockFreshProduct.js';
import { dlcOf, productNameOf, quantityOf, unitCostOf, unitOf, unitPriceOf } from '../../utils/sellableStock.js';

export const CLIENT_TYPES = ['particulier', 'restaurant', 'grossiste'];
export const PUBLICATION_CHANNELS = ['whatsapp', 'facebook', 'sms'];

export const DEFAULT_MIN_MARGIN_PCT = 15;

const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const fmtQty = (n, unit = '') => `${Number(n || 0).toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`;

function clampPct(value, min = 0, max = 50) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function floorPrice(unitCost, minMarginPct = DEFAULT_MIN_MARGIN_PCT) {
  const cost = Number(unitCost) || 0;
  if (cost <= 0) return 0;
  return Math.ceil(cost * (1 + minMarginPct / 100));
}

function marginOkAtPrice(unitCost, salePrice, minMarginPct = DEFAULT_MIN_MARGIN_PCT) {
  const cost = Number(unitCost) || 0;
  const price = Number(salePrice) || 0;
  if (price <= 0) return false;
  if (cost <= 0) return true;
  return ((price - cost) / price) * 100 >= minMarginPct;
}

function maxDiscountPct(unitCost, unitPrice, minMarginPct = DEFAULT_MIN_MARGIN_PCT) {
  const price = Number(unitPrice) || 0;
  const floor = floorPrice(unitCost, minMarginPct);
  if (price <= 0 || floor <= 0 || price <= floor) return 0;
  return clampPct(((price - floor) / price) * 100, 0, 40);
}

function urgencyFromStock(row = {}, referenceDate = new Date()) {
  const level = dlcAlertLevel(row, referenceDate);
  const days = daysUntilDlc(row, referenceDate);
  if (level === 'red' || level === 'black' || (days != null && days <= 1)) return 'critical';
  if (level === 'orange' || (days != null && days <= 3)) return 'urgent';
  return 'normal';
}

function clientTone(clientType = 'particulier') {
  if (clientType === 'grossiste') return { greeting: 'Bonjour', style: 'volume et conditions de retrait' };
  if (clientType === 'restaurant') return { greeting: 'Bonjour', style: 'qualité, régularité et livraison' };
  return { greeting: 'Bonjour', style: 'disponibilité et prix' };
}

function channelHint(channel = 'whatsapp') {
  if (channel === 'facebook') return { maxLen: 280, cta: 'Commentez ou envoyez-nous un message pour commander.' };
  if (channel === 'sms') return { maxLen: 160, cta: 'Répondez OUI pour réserver.' };
  return { maxLen: 400, cta: 'Répondez à ce message pour commander.' };
}

function buildPromotionalOffer({
  productName,
  quantity,
  unit,
  unitPrice,
  unitCost,
  minMarginPct,
  urgency,
}) {
  if (urgency === 'normal') return null;

  const maxDisc = maxDiscountPct(unitCost, unitPrice, minMarginPct);
  if (maxDisc <= 0) {
    return {
      available: false,
      reason: 'Marge minimale atteinte — pas de réduction automatique proposée.',
      requires_validation: true,
    };
  }

  const discountPct = urgency === 'critical' ? clampPct(maxDisc, 5, 25) : clampPct(maxDisc * 0.6, 3, 15);
  const suggestedPrice = Math.max(floorPrice(unitCost, minMarginPct), Math.round(unitPrice * (1 - discountPct / 100)));
  if (!marginOkAtPrice(unitCost, suggestedPrice, minMarginPct)) {
    return {
      available: false,
      reason: 'Réduction impossible sans passer sous la marge minimale.',
      requires_validation: true,
    };
  }

  return {
    available: true,
    label: urgency === 'critical' ? 'Offre liquidation DLC' : 'Offre stock urgent',
    original_unit_price: unitPrice,
    suggested_unit_price: suggestedPrice,
    discount_percent: discountPct,
    total_example: Math.round(suggestedPrice * quantity),
    note: `Prix indicatif à valider avant diffusion (-${discountPct} % max, marge ≥ ${minMarginPct} %).`,
    requires_validation: true,
    auto_apply_price: false,
  };
}

function buildMessages({
  productName,
  quantity,
  unit,
  unitPrice,
  dlc,
  urgency,
  clientType,
  channel,
  promotionalOffer,
}) {
  const tone = clientTone(clientType);
  const hint = channelHint(channel);
  const priceLine = `${fmtMoney(unitPrice)} / ${unit}`;
  const stockLine = `${fmtQty(quantity, unit)} disponibles`;
  const dlcLine = dlc ? (urgency !== 'normal' ? `DLC ${dlc} — priorité écoulement.` : `DLC ${dlc}.`) : '';

  const shortParts = [
    `${tone.greeting},`,
    `${productName} : ${stockLine}.`,
    `Prix : ${priceLine}.`,
    dlcLine,
    hint.cta,
  ].filter(Boolean);

  const short_message = shortParts.join(' ').slice(0, hint.maxLen);

  const b2b_message = [
    `${tone.greeting},`,
    `Horizon Farm — ${productName}.`,
    `Disponibilité : ${stockLine}.`,
    `Tarif indicatif : ${priceLine} (${tone.style}).`,
    dlcLine,
    promotionalOffer?.available
      ? `Offre à valider : ${fmtMoney(promotionalOffer.suggested_unit_price)} / ${unit} (réduction ${promotionalOffer.discount_percent} %).`
      : null,
    'Merci de confirmer quantité, retrait ou livraison.',
  ].filter(Boolean).join('\n');

  const social_post = [
    `🌾 ${productName} — dispo maintenant !`,
    `📦 ${stockLine}`,
    `💰 ${priceLine}`,
    dlc ? `⏳ ${dlcLine}` : null,
    promotionalOffer?.available ? `🔥 Offre à valider : ${fmtMoney(promotionalOffer.suggested_unit_price)} / ${unit}` : null,
    hint.cta,
    '#HorizonFarm #ProduitLocal',
  ].filter(Boolean).join('\n');

  return { short_message, b2b_message, social_post };
}

/**
 * Génère les contenus de vente (lecture / copie / validation envoi manuelle).
 */
export function generateSalesPublication({
  productName = '',
  quantity = 0,
  unitPrice = 0,
  unitCost = 0,
  unit = 'unité',
  dlc = '',
  clientType = 'particulier',
  channel = 'whatsapp',
  minMarginPct = DEFAULT_MIN_MARGIN_PCT,
  stockRow = null,
} = {}) {
  const row = stockRow || {};
  const name = productName || productNameOf(row);
  const qty = quantity || quantityOf(row);
  const price = unitPrice || unitPriceOf(row);
  const cost = unitCost || unitCostOf(row);
  const resolvedUnit = unit || unitOf(row);
  const resolvedDlc = dlc || dlcOf(row);
  const urgency = urgencyFromStock(row);
  const floor = floorPrice(cost, minMarginPct);

  const promotional_offer = buildPromotionalOffer({
    productName: name,
    quantity: qty,
    unit: resolvedUnit,
    unitPrice: price,
    unitCost: cost,
    minMarginPct,
    urgency,
  });

  const messages = buildMessages({
    productName: name,
    quantity: qty,
    unit: resolvedUnit,
    unitPrice: price,
    dlc: resolvedDlc,
    urgency,
    clientType,
    channel,
    promotionalOffer: promotional_offer,
  });

  const warnings = [
    'Aucun envoi automatique — copiez ou ouvrez le canal après relecture.',
    'Les prix catalogue ne sont pas modifiés sans votre validation.',
  ];
  if (price > 0 && cost > 0 && price < floor) {
    warnings.push(`Prix sous le plancher (${fmtMoney(floor)}) — vérifiez la marge avant diffusion.`);
  }
  if (promotional_offer && !promotional_offer.available && urgency !== 'normal') {
    warnings.push(promotional_offer.reason || 'Pas de promo automatique.');
  }

  return {
    product_name: name,
    quantity: qty,
    unit: resolvedUnit,
    unit_price: price,
    unit_cost: cost,
    floor_price: floor,
    dlc: resolvedDlc,
    urgency,
    client_type: clientType,
    channel,
    min_margin_pct: minMarginPct,
    ...messages,
    promotional_offer,
    interpretation_only: true,
    auto_send: false,
    auto_apply_price: false,
    warnings,
  };
}

export function proposeSalesPublicationDraft(payload = {}) {
  const content = generateSalesPublication(payload);
  const missing = [];
  if (!content.product_name) missing.push('product_name');
  if (!content.quantity) missing.push('quantity');
  if (!content.unit_price) missing.push('unit_price');

  return createAiActionDraft({
    intent: 'sales_publication',
    confidence: missing.length ? 0.55 : 0.9,
    source: AI_DRAFT_SOURCES.COMMERCIAL,
    draft: content,
    target_workflow: TARGET_WORKFLOWS.INSIGHT_ONLY,
    required_validation: true,
    missing_fields: missing,
    warnings: content.warnings,
    confirmation_required: true,
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}
