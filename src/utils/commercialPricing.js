/**
 * Commercial V2 — prix client, remises et marge estimée.
 */

import { toNumber } from './format.js';
import { unitCostOf, unitPriceOf } from './sellableStock.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => toNumber(value);
const clean = (value) => String(value || '').trim();

export const PRICE_TIERS = {
  DETAIL: 'detail',
  GROSSISTE: 'grossiste',
  SPECIAL: 'special',
};

/** Lit les conditions commerciales depuis la fiche client (metadata légère). */
export function readClientCommercialTerms(client = {}) {
  const meta = client.commercial_terms || client.terms_commerciaux || {};
  return {
    priceTier: clean(client.price_tier || meta.price_tier || client.type_client || 'detail').toLowerCase(),
    discountPct: num(client.remise_pct ?? meta.remise_pct ?? meta.discount_pct),
    discountAmount: num(client.remise_montant ?? meta.remise_montant ?? meta.discount_amount),
    specialPrices: meta.special_prices || client.prix_speciaux || client.special_prices || {},
    paymentTerms: client.conditions_paiement || meta.payment_terms || '',
    deliveryTerms: client.conditions_livraison || meta.delivery_terms || '',
    creditLimit: num(client.plafond_credit ?? meta.credit_limit),
    paymentDelayDays: num(client.delai_paiement_jours ?? meta.payment_delay_days),
  };
}

export function resolveProductKey(sourceRow = {}, productName = '') {
  return clean(sourceRow?.id || productName || sourceRow?.produit || sourceRow?.nom);
}

/** Prix unitaire de base selon source ou client. */
export function resolveDefaultUnitPrice({
  basePrice = 0,
  sourceRow = null,
  client = null,
  productKey = '',
} = {}) {
  const fromSource = sourceRow ? unitPriceOf(sourceRow) : 0;
  let price = num(basePrice) || fromSource;
  if (!client) return price;

  const terms = readClientCommercialTerms(client);
  const key = productKey || resolveProductKey(sourceRow);
  const special = terms.specialPrices?.[key];
  if (special != null && num(special) > 0) return num(special);

  if (terms.priceTier.includes('grossiste') || terms.priceTier.includes('revendeur')) {
    return price > 0 ? Math.round(price * 0.92) : price;
  }
  if (terms.priceTier.includes('restaurant') || terms.priceTier.includes('entreprise')) {
    return price > 0 ? Math.round(price * 0.95) : price;
  }
  return price;
}

/** Applique remise montant / pourcentage sur une ligne. */
export function applyCommercialDiscounts({
  unitPrice = 0,
  quantity = 1,
  discountPct = 0,
  discountAmount = 0,
  lineDiscountAmount = 0,
  lineDiscountPct = 0,
} = {}) {
  const qty = Math.max(0, num(quantity));
  const base = Math.max(0, num(unitPrice)) * qty;
  const pct = Math.max(0, num(discountPct || lineDiscountPct));
  const fixed = Math.max(0, num(discountAmount || lineDiscountAmount));
  const afterPct = pct > 0 ? Math.max(0, base * (1 - pct / 100)) : base;
  const lineTotal = Math.max(0, afterPct - fixed);
  const discountApplied = Math.max(0, base - lineTotal);
  return {
    unitPrice: num(unitPrice),
    quantity: qty,
    productTotal: base,
    lineTotal,
    discountApplied,
    effectiveUnitPrice: qty > 0 ? lineTotal / qty : 0,
  };
}

/** Enrichit le formulaire vente avec prix client et remises. */
export function enrichSaleFormWithClientPricing(form = {}, { client = null, sourceRow = null } = {}) {
  if (!client) return form;
  const terms = readClientCommercialTerms(client);
  const unitPrice = resolveDefaultUnitPrice({
    basePrice: form.unit_price,
    sourceRow,
    client,
    productKey: resolveProductKey(sourceRow, form.product_name),
  });
  const discounted = applyCommercialDiscounts({
    unitPrice,
    quantity: form.quantity,
    discountPct: form.discount_pct ?? terms.discountPct,
    discountAmount: form.discount_amount ?? terms.discountAmount,
  });
  return {
    ...form,
    unit_price: unitPrice,
    remise: discounted.discountApplied,
    remise_pct: form.discount_pct ?? terms.discountPct,
    remise_montant: form.discount_amount ?? terms.discountAmount,
    line_total: discounted.lineTotal,
    pricing_tier: terms.priceTier,
    conditions_paiement: terms.paymentTerms,
    conditions_livraison: terms.deliveryTerms,
  };
}

/** Marge estimée si coût unitaire disponible. */
export function estimateSaleMargin({ unitPrice = 0, quantity = 1, sourceRow = null, lineTotal = 0 } = {}) {
  const cost = sourceRow ? unitCostOf(sourceRow) : 0;
  const revenue = num(lineTotal) || num(unitPrice) * num(quantity);
  if (cost <= 0 || revenue <= 0) return { revenue, cost: 0, margin: null, marginPct: null };
  const totalCost = cost * num(quantity);
  const margin = revenue - totalCost;
  return {
    revenue,
    cost: totalCost,
    margin,
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : null,
  };
}

export function buildPricingSummary(form = {}, { client = null, sourceRow = null } = {}) {
  const enriched = enrichSaleFormWithClientPricing(form, { client, sourceRow });
  const margin = estimateSaleMargin({
    unitPrice: enriched.unit_price,
    quantity: enriched.quantity,
    sourceRow,
    lineTotal: enriched.line_total ?? num(enriched.unit_price) * num(enriched.quantity),
  });
  return { enriched, margin, terms: client ? readClientCommercialTerms(client) : null };
}
