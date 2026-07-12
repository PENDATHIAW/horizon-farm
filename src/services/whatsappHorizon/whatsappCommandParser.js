/**
 * Parse messages WhatsApp/Telegram simulés → brouillons AI Gateway (sans écriture).
 */

import { interpretHorizonCommand } from '../aiIntentEngine.js';
import { parseContextualVoicePhrase } from '../aiGateway/contextualVoiceParser.js';
import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  normalizeLegacyDraft,
  TARGET_WORKFLOWS,
} from '../aiGateway/aiActionDrafts.js';
import { proposePaymentDraft } from '../aiGateway/commercialContentGenerator.js';
import { remainingForOrder } from '../../utils/salesStatuses.js';
import {
  isHotelTerminusInvestorOrder,
  buildHotelTerminusOrderDraft,
} from './whatsappInvestorOrder.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

const n = (value) => {
  const num = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};

const includesAny = (text, words) => words.some((w) => lower(w).split(' ').every((part) => text.includes(part)) || text.includes(lower(w)));

function extractPaymentAmount(raw = '') {
  const text = lower(raw);
  const match = text.match(/(\d+(?:[\s.,]\d+)*)\s*(?:fcfa|francs?|f\s*cfa|xof)/);
  if (!match) return null;
  const normalized = match[1].replace(/\s/g, '').replace(',', '.');
  return n(normalized);
}

function extractQuantity(raw = '') {
  const text = lower(raw);
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(sacs?|sachets?|kg|tablettes?|plateaux?|oeufs?|œufs?|poulets?|tetes?|têtes?|unites?)/);
  if (!match) return { quantity: extractAnyNumber(raw), unit: '' };
  return { quantity: n(match[1]), unit: match[2].replace(/s$/, '') };
}

function extractAnyNumber(raw = '') {
  const match = lower(raw).match(/(\d+(?:[.,]\d+)?)/);
  return match ? n(match[1]) : null;
}

function extractClientName(raw = '') {
  const patterns = [
    /(?:du|de)\s+(?:client\s+)?([^.,\d]+?)(?:\s*$|\s*[,.])/i,
    /client\s+([^.,\d]+)/i,
    /(?:a|à|chez)\s+([^,.\d]+?)(?:\s*,|\s+paye|\s+\d)/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return '';
}

function extractPaymentMethod(raw = '') {
  const text = lower(raw);
  if (text.includes('orange money') || text.includes('orange')) return 'orange_money';
  if (text.includes('wave')) return 'wave';
  if (text.includes('free money')) return 'free_money';
  if (includesAny(text, ['cash', 'espece', 'espèce'])) return 'especes';
  if (includesAny(text, ['virement', 'banque'])) return 'virement';
  return 'especes';
}

function extractPaymentStatus(raw = '') {
  const text = lower(raw);
  if (includesAny(text, ['orange money', 'wave', 'paye', 'payé', 'regle', 'réglé', 'cash']) && !includesAny(text, ['a payer', 'à payer', 'credit', 'crédit'])) {
    return 'paid';
  }
  if (includesAny(text, ['credit', 'crédit', 'a payer', 'impaye'])) return 'credit';
  if (includesAny(text, ['partiel', 'acompte'])) return 'partial';
  return 'unknown';
}

function resolveLotInContext(raw = '', lots = []) {
  const text = lower(raw);
  const idMatch = raw.match(/\b(LOT[-_][A-Z0-9-]+)\b/i);
  if (idMatch) {
    const id = idMatch[0].replace(/\s+/g, '').toUpperCase();
    const hit = arr(lots).find((l) => clean(l.id).toUpperCase() === id);
    return hit?.id || id;
  }
  if (text.includes('chair')) {
    const chair = arr(lots).find((l) => /chair|broiler/i.test(lower(`${l.type || ''} ${l.nom || ''} ${l.name || ''}`)));
    if (chair) return chair.id;
  }
  const numMatch = text.match(/lot\s*(?:de\s+)?(?:chair|pondeuse|avicole)?\s*(\d+)/);
  if (numMatch) {
    const num = numMatch[1];
    const candidates = arr(lots).filter((lot) => {
      const label = lower(`${lot.nom || ''} ${lot.name || ''} ${lot.libelle || ''} ${lot.id || ''}`);
      return label.includes(`lot ${num}`) || label.includes(`lot${num}`) || clean(lot.id).endsWith(num);
    });
    if (candidates.length === 1) return candidates[0].id;
    if (candidates.length > 1) return { ambiguous: true, candidates };
  }
  return '';
}

export function detectWhatsAppScenario(raw = '') {
  const text = lower(raw);
  if (!text) return 'empty';
  if (includesAny(text, ['encaiss', 'encaissé', 'encaisse']) && !includesAny(text, ['vendu', 'vente'])) return 'payment_collection';
  if (includesAny(text, ['livre', 'livré', 'livraison', 'livrer']) && !includesAny(text, ['vendu', 'vente de'])) return 'delivery';
  if (includesAny(text, ['mortalite', 'mortalité', 'morts', ' sont morts', ' est mort'])) return 'mortality';
  if (includesAny(text, ['achete', 'acheté', 'achat de', 'j ai achete'])) return 'purchase';
  if (includesAny(text, ['vendu', 'vente', 'vendre', 'vends'])) return 'sale';
  if (includesAny(text, ['tablette', 'oeuf', 'œuf', 'ramass', 'ponte'])) return 'egg_production';
  if (includesAny(text, ['distribu', 'nourri', 'alimentation', 'ration'])) return 'feeding';
  return 'auto';
}

function findClientByName(name = '', dataMap = {}) {
  const needle = lower(name);
  if (!needle) return null;
  const clients = arr(dataMap.clients);
  return clients.find((client) => {
    const label = lower(`${client.nom || ''} ${client.name || ''} ${client.raison_sociale || ''}`);
    return label.includes(needle) || needle.includes(label);
  }) || null;
}

function findOpenOrdersForClient(clientName = '', dataMap = {}) {
  const client = findClientByName(clientName, dataMap);
  const payments = arr(dataMap.payments || dataMap.paymentsAll);
  const orders = arr(dataMap.sales_orders || dataMap.salesOrders || dataMap.ventes);
  const filtered = orders.filter((order) => {
    const remaining = remainingForOrder(order, payments);
    if (remaining <= 0) return false;
    if (!client) return false;
    return String(order.client_id || '') === String(client.id);
  });
  if (client && filtered.length) return { client, orders: filtered };
  if (!client && clientName) {
    const byName = orders.filter((order) => {
      const remaining = remainingForOrder(order, payments);
      if (remaining <= 0) return false;
      const label = lower(`${order.client_nom || ''} ${order.client_name || ''}`);
      return label.includes(lower(clientName));
    });
    return { client: null, orders: byName };
  }
  return { client, orders: filtered };
}

function tagWhatsAppDrafts(drafts = [], scenario = '') {
  return drafts.map((draft, index) => ({
    ...draft,
    source: AI_DRAFT_SOURCES.WHATSAPP,
    meta: {
      ...(draft.meta || {}),
      channel: 'whatsapp_demo',
      scenario,
      role: draft.meta?.role || (index === 0 ? 'primary' : draft.meta?.role),
    },
  }));
}

function legacyToGateway(legacy, phrase, options = {}) {
  const gw = normalizeLegacyDraft(legacy, {
    source: AI_DRAFT_SOURCES.WHATSAPP,
    ...options,
  });
  gw.draft.legacy_hey = legacy;
  gw.draft.primary_module = legacy.primary_module;
  gw.draft.form_type = legacy.form_type;
  gw.draft.title = legacy.ui?.title;
  gw.draft.subtitle = legacy.ui?.subtitle;
  gw.meta = { role: 'primary', scenario: options.scenario, channel: 'whatsapp_demo' };
  return gw;
}

function buildPaymentCollectionParse(raw = '', dataMap = {}) {
  const amount = extractPaymentAmount(raw);
  const clientName = extractClientName(raw);
  const method = extractPaymentMethod(raw);
  const { client, orders } = findOpenOrdersForClient(clientName, dataMap);

  if (!amount) {
    return {
      drafts: [],
      clarify: 'Précisez le montant encaissé (ex. 45 000 FCFA).',
      phrase: raw,
      scenario: 'payment_collection',
    };
  }

  if (orders.length > 1) {
    const draft = proposePaymentDraft({
      requestedAmount: amount,
      paymentMethod: method,
    });
    draft.source = AI_DRAFT_SOURCES.WHATSAPP;
    draft.raw_input = raw;
    draft.warnings = [...arr(draft.warnings), `Plusieurs ventes ouvertes pour « ${clientName || 'ce client'} » — précisez la commande.`];
    draft.missing_fields = [...new Set([...arr(draft.missing_fields), 'sale_or_order_id'])];
    draft.confirmation_required = true;
    draft.status = 'draft_incomplete';
    draft.draft.primary_module = 'commercial';
    draft.draft.title = 'Encaissement WhatsApp à valider';
    draft.draft.subtitle = `${orders.length} commande(s) candidate(s) — choisissez avant exécution.`;
    draft.meta = { role: 'primary', scenario: 'payment_collection', channel: 'whatsapp_demo', candidate_orders: orders.map((o) => o.id) };
    return {
      drafts: [draft],
      clarify: `Plusieurs ventes ouvertes pour « ${clientName || 'client'} ». Précisez l'identifiant commande (ex. CMD-…).`,
      phrase: raw,
      scenario: 'payment_collection',
    };
  }

  if (orders.length === 0) {
    const draft = proposePaymentDraft({
      requestedAmount: amount,
      paymentMethod: method,
    });
    draft.source = AI_DRAFT_SOURCES.WHATSAPP;
    draft.raw_input = raw;
    draft.missing_fields = [...new Set([...arr(draft.missing_fields), 'sale_or_order_id'])];
    draft.warnings = [...arr(draft.warnings), clientName ? `Aucune vente ouverte trouvée pour « ${clientName} ».` : 'Identifiez le client ou la commande.'];
    draft.confirmation_required = true;
    draft.status = 'draft_incomplete';
    draft.draft.primary_module = 'finance_pilotage';
    draft.draft.title = 'Encaissement WhatsApp à compléter';
    draft.draft.subtitle = 'Rattachez la vente avant exécution (workflow recordSalePayment).';
    draft.meta = { role: 'primary', scenario: 'payment_collection', channel: 'whatsapp_demo' };
    return {
      drafts: [draft],
      clarify: clientName
        ? `Aucune vente ouverte trouvée pour « ${clientName} ». Précisez la commande ou créez d'abord la vente.`
        : 'Précisez le client ou l\'identifiant de la commande à encaisser.',
      phrase: raw,
      scenario: 'payment_collection',
    };
  }

  const order = orders[0];
  const draft = proposePaymentDraft({
    saleId: order.id,
    orderId: order.id,
    requestedAmount: Math.min(amount, remainingForOrder(order, arr(dataMap.payments || dataMap.paymentsAll))),
    paymentMethod: method,
  });
  draft.source = AI_DRAFT_SOURCES.WHATSAPP;
  draft.raw_input = raw;
  draft.draft.primary_module = 'commercial';
  draft.draft.title = 'Encaissement WhatsApp à valider';
  draft.draft.subtitle = `${client?.nom || client?.name || clientName || 'Client'} · ${order.id || 'commande'}`;
  draft.draft.preview = {
    client_name: client?.nom || client?.name || clientName,
    order_id: order.id,
    requested_amount: amount,
    payment_method: method,
  };
  draft.draft.fields = {
    client_name: client?.nom || client?.name || clientName,
    order_id: order.id,
    amount,
    payment_method: method,
  };
  draft.meta = { role: 'primary', scenario: 'payment_collection', channel: 'whatsapp_demo' };
  return { drafts: [draft], clarify: '', phrase: raw, scenario: 'payment_collection' };
}

function buildDeliveryParse(raw = '', dataMap = {}) {
  const { quantity, unit } = extractQuantity(raw);
  const destination = extractClientName(raw) || extractNamedDestination(raw);
  const product = lower(raw).includes('poulet') ? 'poulet' : 'produit';
  const fields = {
    product_name: product,
    quantity: quantity || extractAnyNumber(raw),
    unit: unit || 'poulet',
    client_name: destination,
    statut_livraison: 'livre',
    delivery_status: 'livre',
    fulfillment_mode: 'livraison',
    date: new Date().toISOString().slice(0, 10),
    notes: raw,
  };
  const missing = [];
  if (!fields.quantity) missing.push('quantity');
  if (!fields.client_name) missing.push('client_name');

  const legacy = {
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
    intent: 'sale_delivery',
    confidence: missing.length ? 0.55 : 0.82,
    raw_input: raw,
    primary_module: 'commercial',
    form_type: 'sale_record',
    requires_validation: true,
    missing_fields: missing,
    warnings: missing.length ? ['Complétez client ou quantité avant validation.'] : ['Livraison enregistrée via workflow commercial (sans doublon finance).'],
    draft_fields: fields,
    impacted_modules: ['commercial', 'stock', 'tracabilite', 'centre_decisionnel'],
    ui: {
      title: 'Livraison WhatsApp à valider',
      subtitle: destination ? `Destination : ${destination}` : 'Précisez le client / point de vente',
    },
  };

  const primary = legacyToGateway(legacy, raw, {
    scenario: 'delivery',
    target_workflow: TARGET_WORKFLOWS.OPEN_FORM,
  });

  return {
    drafts: [primary],
    clarify: missing.includes('client_name') ? 'Précisez le client ou le point de livraison (ex. supérette du coin).' : '',
    phrase: raw,
    scenario: 'delivery',
  };
}

function extractNamedDestination(raw = '') {
  const match = raw.match(/(?:a|à|chez|pour)\s+(?:la\s+|le\s+|l')?([^,.\d]+?)(?:\s*$|\s*[,.])/i);
  return match?.[1] ? clean(match[1]) : '';
}

function enrichSaleLegacy(legacy, raw) {
  const { quantity, unit } = extractQuantity(raw);
  const amount = extractPaymentAmount(raw);
  const method = extractPaymentMethod(raw);
  const paid = extractPaymentStatus(raw) === 'paid';
  legacy.draft_fields = {
    ...legacy.draft_fields,
    quantity: quantity || legacy.draft_fields?.quantity,
    unit: unit || legacy.draft_fields?.unit,
    payment_amount: amount || legacy.draft_fields?.payment_amount,
    montant_total: amount || legacy.draft_fields?.montant_total,
    payment_status: paid ? 'paid' : legacy.draft_fields?.payment_status,
    payment_method: method,
    moyen_paiement: method,
    montant_paye: paid ? amount : legacy.draft_fields?.montant_paye,
  };
  if (paid && amount) {
    legacy.draft_fields.montant_paye = amount;
    legacy.warnings = [...arr(legacy.warnings), 'Paiement détecté — vente + encaissement via workflow unique (pas de doublon finance).'];
  }
  return legacy;
}

function buildMortalityParse(raw = '', dataMap = {}) {
  const legacy = interpretHorizonCommand(raw, dataMap);
  const lotRef = resolveLotInContext(raw, dataMap.lots || dataMap.avicole);
  if (typeof lotRef === 'object' && lotRef?.ambiguous) {
    const gw = legacyToGateway(legacy, raw, { scenario: 'mortality', target_workflow: TARGET_WORKFLOWS.HEALTH });
    return {
      drafts: [gw],
      clarify: 'Plusieurs lots correspondent. Précisez « lot chair 3 » ou l\'identifiant LOT-…',
      phrase: raw,
      scenario: 'mortality',
    };
  }
  legacy.draft_fields = {
    ...legacy.draft_fields,
    lot_id: typeof lotRef === 'string' ? lotRef : legacy.draft_fields?.lot_id,
    quantity: legacy.draft_fields?.quantity || extractQuantity(raw).quantity || extractAnyNumber(raw),
  };
  if (!legacy.draft_fields?.lot_id) {
    legacy.missing_fields = [...new Set([...arr(legacy.missing_fields), 'lot_id'])];
    legacy.status = 'draft_incomplete';
  }
  const primary = legacyToGateway(legacy, raw, { scenario: 'mortality', target_workflow: TARGET_WORKFLOWS.HEALTH });
  return {
    drafts: [primary],
    clarify: legacy.missing_fields?.includes('lot_id') ? 'Précisez le lot avicole concerné.' : '',
    phrase: raw,
    scenario: 'mortality',
  };
}

/**
 * Parse un message WhatsApp simulé → brouillons gateway + éventuelle clarification.
 */
export function parseWhatsAppCommand(message = '', dataMap = {}) {
  const raw = clean(message);
  if (!raw) {
    return { drafts: [], clarify: 'Message vide — saisissez une action terrain.', phrase: raw, scenario: 'empty' };
  }

  if (isHotelTerminusInvestorOrder(raw)) {
    return buildHotelTerminusOrderDraft(raw, dataMap);
  }

  const scenario = detectWhatsAppScenario(raw);

  if (scenario === 'payment_collection') {
    return buildPaymentCollectionParse(raw, dataMap);
  }
  if (scenario === 'delivery') {
    return buildDeliveryParse(raw, dataMap);
  }
  if (scenario === 'mortality') {
    return buildMortalityParse(raw, dataMap);
  }

  const voice = parseContextualVoicePhrase(raw, dataMap);
  if (voice.wake) {
    return { drafts: [], clarify: '', phrase: raw, scenario, wake: true };
  }

  if (scenario === 'sale' && voice.drafts?.[0]?.intent === 'sale_record') {
    const legacy = enrichSaleLegacy(
      voice.drafts[0].draft?.legacy_hey || interpretHorizonCommand(raw, dataMap),
      raw,
    );
    const primary = legacyToGateway(legacy, raw, { scenario: 'sale', target_workflow: TARGET_WORKFLOWS.SALE });
    const chains = voice.drafts.slice(1).map((d) => ({
      ...d,
      source: AI_DRAFT_SOURCES.WHATSAPP,
      meta: { ...d.meta, channel: 'whatsapp_demo', scenario: 'sale' },
    }));
    return {
      drafts: [primary, ...chains],
      clarify: voice.clarify,
      phrase: raw,
      scenario: 'sale',
    };
  }

  return {
    ...voice,
    drafts: tagWhatsAppDrafts(voice.drafts, scenario),
    scenario,
  };
}

export default parseWhatsAppCommand;
