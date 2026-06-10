/**
 * Démo investisseur — commande WhatsApp multi-produits (Hôtel Terminus).
 * Pipeline : client → lignes → stock → commitCommercialSale (créance virement).
 */

import { makeId } from '../../utils/ids.js';
import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from '../aiGateway/aiActionDrafts.js';
import { validateSaleStockAvailability } from '../../utils/commercialStockValidation.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const n = (v) => {
  const num = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
};

function includesAny(text, words) {
  return words.some((w) => text.includes(lower(w)));
}

function findClientByLabel(needle = '', clients = []) {
  const q = lower(needle);
  if (!q) return null;
  return arr(clients).find((c) => {
    const label = lower(`${c.nom || ''} ${c.name || ''} ${c.raison_sociale || ''}`);
    return label.includes(q) || q.includes(label);
  }) || null;
}

function findStockForHints(stocks = [], hints = []) {
  return arr(stocks).find((row) => {
    const text = lower(`${row.produit || ''} ${row.nom || ''} ${row.name || ''} ${row.categorie || ''}`);
    return hints.some((h) => text.includes(lower(h)));
  }) || null;
}

function unitPriceOf(stock = {}) {
  return n(stock.prix_vente_unitaire ?? stock.prix_unitaire ?? stock.prixUnit ?? stock.unit_price ?? 0);
}

export function isHotelTerminusInvestorOrder(raw = '') {
  const text = lower(raw);
  if (!text) return false;
  const hotel = includesAny(text, ['hotel terminus', 'hôtel terminus', 'ici hotel', 'ici hôtel']);
  const order = includesAny(text, ['commande', 'je commande']);
  const products = /plateau|oeuf|œuf/.test(text) && /poulet|chair|volaille|kg/.test(text);
  const invoice = includesAny(text, ['facture', 'facturez', 'virement']);
  return hotel && (order || products) && products && invoice;
}

function extractOrderLines(raw = '', stocks = []) {
  const lines = [];
  const eggQty = raw.match(/(\d+)\s*plateaux?\s+d['']?\s*oeufs?/i)
    || raw.match(/(\d+)\s*plateaux?\s+d['']?\s*œufs?/i)
    || raw.match(/(\d+)\s*plateaux?/i);
  const chickenQty = raw.match(/(\d+(?:[.,]\d+)?)\s*kg\s+(?:de\s+)?poulets?/i)
    || raw.match(/(\d+(?:[.,]\d+)?)\s*kg.*?poulet/i);

  if (eggQty) {
    const quantity = n(eggQty[1]);
    const stock = findStockForHints(stocks, ['plateau', 'oeuf', 'œuf', 'tablette']);
    const unitPrice = unitPriceOf(stock) || 3500;
    lines.push({
      product_name: stock?.produit || stock?.nom || 'Plateaux œufs',
      quantity: quantity,
      unit: 'plateau',
      unit_price: unitPrice,
      line_total: quantity * unitPrice,
      source_type: 'stock',
      source_id: stock?.id || '',
    });
  }

  if (chickenQty) {
    const quantity = n(chickenQty[1].replace(',', '.'));
    const stock = findStockForHints(stocks, ['poulet', 'chair', 'volaille', 'viande']);
    const unitPrice = unitPriceOf(stock) || 4500;
    lines.push({
      product_name: stock?.produit || stock?.nom || 'Poulet',
      quantity: quantity,
      unit: 'kg',
      unit_price: unitPrice,
      line_total: quantity * unitPrice,
      source_type: 'stock',
      source_id: stock?.id || '',
    });
  }

  return lines;
}

/**
 * Parse message investisseur → brouillon commitCommercialSale (multi-lignes).
 */
export function buildHotelTerminusOrderDraft(raw = '', dataMap = {}) {
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const clients = arr(dataMap.clients);
  const lines = extractOrderLines(raw, stocks);

  if (lines.length < 2) {
    return {
      drafts: [],
      clarify: 'Commande investisseur incomplète — précisez quantités (plateaux œufs + kg poulets).',
      phrase: raw,
      scenario: 'investor_hotel_order',
    };
  }

  const client = findClientByLabel('terminus', clients)
    || findClientByLabel('hotel terminus', clients);
  const createClient = !client;
  const clientId = client?.id || '';
  const clientName = client?.nom || client?.name || 'Hôtel Terminus';
  const clientType = 'hotel';

  const form = {
    date: new Date().toISOString().slice(0, 10),
    client_id: clientId,
    client_label: clientName,
    lines,
    payment_status: 'credit',
    payment_method: 'virement',
    fulfillment_mode: 'a_livrer',
    invoice_issued: true,
    facture_emise: true,
    notes: raw,
  };

  const stockCheck = validateSaleStockAvailability(form, { stocks }, { warnOnUnknownAvailability: true });
  const warnings = [];
  if (stockCheck) warnings.push(stockCheck);
  if (createClient) warnings.push('Client « Hôtel Terminus » sera créé à la validation.');
  if (lines.some((l) => !l.source_id)) warnings.push('Certaines lignes sans stock lié — vérifiez disponibilité avant validation.');

  const missing = [];
  if (createClient) missing.push('confirm_create_client');

  const draft = createAiActionDraft({
    intent: 'investor_hotel_order',
    confidence: missing.length ? 0.78 : 0.92,
    source: AI_DRAFT_SOURCES.WHATSAPP,
    draft: {
      preview: {
        client_name: clientName,
        lines: lines.map((l) => `${l.quantity} ${l.unit} ${l.product_name}`).join(' · '),
        payment_status: 'credit',
        payment_method: 'virement',
        montant_total: lines.reduce((s, l) => s + l.line_total, 0),
      },
      fields: {
        ...form,
        create_client: createClient,
        new_client: createClient ? {
          nom: 'Hôtel Terminus',
          type_client: clientType,
          type: 'hotel',
          notes: 'Client démo investisseur — créé depuis WhatsApp',
        } : null,
      },
      primary_module: 'commercial',
      form_type: 'sale_record',
    },
    target_workflow: TARGET_WORKFLOWS.COMMERCIAL_SALE,
    required_validation: true,
    missing_fields: missing,
    warnings,
    confirmation_required: true,
    raw_input: raw,
    status: 'awaiting_validation',
    meta: {
      role: 'primary',
      scenario: 'investor_hotel_order',
      channel: 'whatsapp_demo',
      pipeline: 'commitCommercialSale',
      trace_chain: ['client', 'commande', 'stock', 'facture', 'creance', 'livraison'],
    },
  });

  return {
    drafts: [draft],
    clarify: missing.includes('confirm_create_client')
      ? 'Confirmez la création du client Hôtel Terminus puis validez pour exécuter la commande complète.'
      : '',
    phrase: raw,
    scenario: 'investor_hotel_order',
  };
}

export function buildClientPayloadFromDraft(draft = {}) {
  const fields = draft.draft?.fields || {};
  if (!fields.create_client || !fields.new_client) return null;
  return {
    id: makeId('CLI'),
    nom: fields.new_client.nom || 'Hôtel Terminus',
    name: fields.new_client.nom || 'Hôtel Terminus',
    type_client: fields.new_client.type_client || 'hotel',
    type: fields.new_client.type || 'hotel',
    notes: fields.new_client.notes || '',
    created_from: 'whatsapp_investor_demo',
  };
}
