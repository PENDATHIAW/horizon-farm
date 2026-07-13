/**
 * PHASE 10–12 — Complétion conversationnelle de documents.
 * Transforme les champs manquants en questions naturelles (jamais messages d'erreur ERP).
 */

import { parseInvoiceOcrText } from './ocrIntelligent/invoiceOcrParser.js';


import { updateHorizonDraft } from './aiIntentEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const n = (v) => {
  const num = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};
const lower = (v) => clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const CONFIDENCE_THRESHOLDS = Object.freeze({
  VALIDATE: 90,
  CONFIRM: 70,
});

const FIELD_LABELS = Object.freeze({
  product_name: 'Produit',
  quantity: 'Quantité',
  unit: 'Unité',
  supplier_name: 'Fournisseur',
  client_name: 'Client',
  date: 'Date',
  payment_status: 'Paiement',
  payment_amount: 'Montant',
});

const DEFAULT_SUPPLIER_HINTS = ['Sedima', 'NMA Sanders'];

const GENERIC_PRODUCT_WORDS = new Set([
  'facture', 'invoice', 'facture fournisseur', 'facture client', 'total', 'ttc', 'ht',
]);

function isRealProductName(name = '') {
  const n = lower(name);
  if (!n || GENERIC_PRODUCT_WORDS.has(n)) return false;
  if (/^facture\b/.test(n)) return false;
  return n.length > 2;
}

/** @typedef {'validate' | 'confirm' | 'conversation'} CompletionMode */

/**
 * @param {object} draft
 * @returns {Array<{ key: string, label: string, filled: boolean }>}
 */
export function buildDraftFieldChecklist(draft = {}) {
  const fields = draft.draft_fields || {};
  const missing = new Set(arr(draft.missing_fields));
  const keys = Object.keys(FIELD_LABELS);

  const allKeys = [...new Set([...keys, ...Object.keys(fields)])].filter((k) => FIELD_LABELS[k]);
  return allKeys.map((key) => ({
    key,
    label: FIELD_LABELS[key] || key,
    filled: !missing.has(key) && fields[key] != null && fields[key] !== '' && fields[key] !== 'unknown',
  }));
}

function findStockProduct(name = '', dataMap = {}) {
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const needle = lower(name);
  if (!needle) return null;
  return stocks.find((s) => {
    const label = lower(`${s.produit || ''} ${s.nom || ''} ${s.name || ''}`);
    return label.includes(needle) || needle.includes(label);
  }) || null;
}

function findSupplier(name = '', dataMap = {}) {
  const suppliers = arr(dataMap.fournisseurs);
  const needle = lower(name);
  if (!needle) return null;
  return suppliers.find((s) => {
    const label = lower(`${s.name || ''} ${s.nom || ''} ${s.raison_sociale || ''}`);
    return label.includes(needle) || needle.includes(label);
  }) || null;
}

function findClient(name = '', dataMap = {}) {
  const clients = arr(dataMap.clients);
  const needle = lower(name);
  if (!needle) return null;
  return clients.find((c) => lower(c.nom || c.name || '').includes(needle) || needle.includes(lower(c.nom || c.name || ''))) || null;
}

function suggestSuppliers(productName = '', dataMap = {}) {
  const suppliers = arr(dataMap.fournisseurs);
  const isAliment = /aliment|feed|provende/i.test(productName);
  const fromErp = suppliers
    .map((s) => clean(s.nom || s.name || s.raison_sociale))
    .filter(Boolean)
    .slice(0, 4);
  const hints = isAliment ? DEFAULT_SUPPLIER_HINTS : [];
  return [...new Set([...fromErp, ...hints])].slice(0, 5);
}

function suggestProductAttachments(productName = '', dataMap = {}) {
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const needle = lower(productName);
  const aliment = stocks.filter((s) => /aliment/i.test(lower(`${s.produit || ''} ${s.nom || ''}`)));
  if (/pondeuse|layer|super/i.test(needle)) {
    const pondeuse = aliment.find((s) => /pondeuse/i.test(lower(`${s.produit || ''} ${s.nom || ''}`)));
    if (pondeuse) return [{ id: pondeuse.id, label: clean(pondeuse.produit || pondeuse.nom || 'Aliment Pondeuses') }];
  }
  if (aliment.length) {
    return aliment.slice(0, 3).map((s) => ({
      id: s.id,
      label: clean(s.produit || s.nom || s.name),
    }));
  }
  return [{ id: null, label: 'Aliment Pondeuses' }];
}

function detectInconsistencies(fields = {}) {
  const issues = [];
  const qty = n(fields.quantite ?? fields.quantity);
  const unitPrice = n(fields.prix_unitaire);
  const total = n(fields.montant_total ?? fields.payment_amount);
  if (qty && unitPrice && total) {
    const computed = Math.round(qty * unitPrice);
    const diff = Math.abs(computed - total);
    if (diff > computed * 0.05 && diff > 1000) {
      issues.push({
        type: 'total_mismatch',
        quantity: qty,
        unitPrice,
        computedTotal: computed,
        statedTotal: total,
      });
    }
  }
  return issues;
}

function detectAmbiguousMaize(text = '') {
  const t = lower(text);
  if (!/\bmais\b/.test(t)) return null;
  const hasPurchase = /achat|facture fournisseur|fournisseur/.test(t);
  const hasHarvest = /recolte|récolte|parcelle|culture/.test(t);
  const hasSale = /vente|client|vendu/.test(t);
  if (hasPurchase || hasHarvest || hasSale) return null;
  const qtyMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|sac)/i);
  return {
    product: 'maïs',
    quantity: n(qtyMatch?.[1]),
    unit: /sac/i.test(text) ? 'sac' : 'kg',
  };
}

function detectDocumentKind(text = '') {
  const t = lower(text);
  if (/facture\s+client|client\s+facture|vendu|vente\s+client/.test(t) || (/\boeuf|œuf\b/.test(t) && /facture/.test(t) && !/fournisseur/.test(t))) {
    return 'sale_invoice';
  }
  if (detectAmbiguousMaize(text)) return 'ambiguous_maize';
  if (/ordonnance|veterinaire|vétérinaire/.test(t)) return 'vet';
  return 'purchase_invoice';
}

function paymentStatusFromScan(status = '') {
  const s = lower(status);
  if (s === 'paye' || s === 'paid') return 'paid';
  if (s === 'a_payer' || s === 'credit') return 'credit';
  if (s === 'partiel' || s === 'partial') return 'partial';
  return 'unknown';
}

function buildPurchaseDraftFields(parsed = {}, dataMap = {}) {
  const supplier = findSupplier(parsed.fournisseur, dataMap);
  const rawProduct = clean(parsed.produit);
  const productName = isRealProductName(rawProduct) ? rawProduct : '';
  const stock = productName ? findStockProduct(productName, dataMap) : null;
  return {
    product_name: productName,
    product_id: stock?.id || null,
    quantity: parsed.quantite ?? null,
    unit: parsed.unite || 'sac',
    unit_weight_kg: null,
    supplier_name: clean(parsed.fournisseur),
    supplier_id: supplier?.id || parsed.fournisseur_id || null,
    payment_status: paymentStatusFromScan(parsed.payment_status || parsed.statut_paiement),
    payment_amount: parsed.montant_total ?? null,
    date: parsed.date || new Date().toISOString().slice(0, 10),
    notes: parsed.preuve_texte?.slice(0, 500) || '',
  };
}

function buildSaleDraftFields(parsed = {}, text = '') {
  const eggMatch = text.match(/(\d+)\s*(?:oeufs?|œufs?)/i);

  return {
    product_name: /oeuf|œuf/i.test(text) ? 'oeufs' : clean(parsed.produit),
    quantity: eggMatch ? n(eggMatch[1]) : parsed.quantite,
    unit: /oeuf|œuf/i.test(text) ? 'oeuf' : parsed.unite || 'u',
    client_name: clean(parsed.client_name),
    payment_status: paymentStatusFromScan(parsed.payment_status),
    payment_amount: parsed.montant_total ?? null,
    date: parsed.date || new Date().toISOString().slice(0, 10),
    notes: parsed.preuve_texte?.slice(0, 500) || '',
  };
}

function computeMissingForIntent(intent, fields = {}) {
  if (intent === 'sale_record') {
    const missing = [];
    if (!clean(fields.product_name)) missing.push('product_name');
    if (!fields.quantity) missing.push('quantity');
    if (!clean(fields.client_name)) missing.push('client_name');
    if (!fields.payment_amount) missing.push('payment_amount');
    if (!fields.date) missing.push('date');
    if (!fields.payment_status || fields.payment_status === 'unknown') missing.push('payment_status');
    return missing;
  }
  const missing = [];
  if (!clean(fields.product_name)) missing.push('product_name');
  if (!fields.quantity) missing.push('quantity');
  if (!fields.unit) missing.push('unit');
  if (!clean(fields.supplier_name) && !fields.supplier_id) missing.push('supplier_name');
  if (!fields.date) missing.push('date');
  if (!fields.payment_status || fields.payment_status === 'unknown') missing.push('payment_status');
  if (!fields.payment_amount) missing.push('payment_amount');
  return missing;
}

function computeConfidence({ missingFields, inconsistencies, ambiguous, productMatch, erpMatches = 0 }) {
  let score = 100;
  score -= missingFields.length * 11;
  if (inconsistencies.length) score -= 14;
  if (ambiguous) score -= 22;
  if (productMatch?.status === 'not_in_catalog') score -= 7;
  if (productMatch?.status === 'matched') score += 4;
  score += erpMatches * 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function completionModeFromScore(score, missingCount, hasPendingChoice) {
  if (hasPendingChoice || missingCount > 0) {
    if (score >= CONFIDENCE_THRESHOLDS.VALIDATE && missingCount === 0) return 'validate';
    if (score >= CONFIDENCE_THRESHOLDS.CONFIRM) return 'confirm';
    return 'conversation';
  }
  if (score >= CONFIDENCE_THRESHOLDS.VALIDATE) return 'validate';
  if (score >= CONFIDENCE_THRESHOLDS.CONFIRM) return 'confirm';
  return 'conversation';
}

function fmtMoney(amount) {
  return `${n(amount)?.toLocaleString('fr-FR') || '0'} FCFA`;
}

/**
 * Construit le message conversationnel principal (jamais « champ manquant »).
 */
export function buildConversationalCompletionMessage({
  docKind,
  fields = {},
  missingFields = [],
  inconsistencies = [],
  ambiguous = null,
  productMatch = null,
  supplierSuggestions = [],
  productAttachOptions = [],
  mode = 'conversation',
} = {}) {
  const lines = [];

  if (docKind === 'sale_invoice') {
    lines.push('J\'ai reconnu une vente.');
    if (fields.product_name && fields.quantity) {
      lines.push(`Produit : ${fields.quantity} ${fields.unit || ''} ${fields.product_name}`.trim());
    }
    if (fields.payment_amount) lines.push(`Montant : ${fmtMoney(fields.payment_amount)}`);
    if (missingFields.includes('client_name')) {
      lines.push('Je ne trouve pas le client.');
      lines.push('À qui avez-vous vendu ces produits ?');
      return lines.join('\n');
    }
  }

  if (ambiguous) {
    lines.push(`Je reconnais ${ambiguous.quantity || ''} ${ambiguous.unit || 'kg'} de maïs.`);
    lines.push('S\'agit-il :');
    lines.push('• d\'une récolte');
    lines.push('• d\'une vente');
    lines.push('• d\'un achat');
    lines.push('• d\'un mouvement de stock ?');
    return lines.join('\n');
  }

  if (inconsistencies.length) {
    const issue = inconsistencies[0];
    if (issue.type === 'total_mismatch') {
      lines.push('Une incohérence a été détectée.');
      lines.push(`${issue.quantity} × ${fmtMoney(issue.unitPrice)} = ${fmtMoney(issue.computedTotal)}`);
      lines.push(`mais le total affiché est ${fmtMoney(issue.statedTotal)}.`);
      lines.push('Quel montant doit être utilisé ?');
      return lines.join('\n');
    }
  }

  if (productMatch?.status === 'not_in_catalog' && clean(fields.product_name)) {
    lines.push(`Ce produit n'existe pas encore dans Horizon : ${fields.product_name}.`);
    lines.push('Souhaitez-vous :');
    productAttachOptions.forEach((opt) => lines.push(`• le rattacher à ${opt.label}`));
    lines.push('• créer un nouveau produit');
    return lines.join('\n');
  }

  if (docKind === 'purchase_invoice' || docKind === 'purchase') {
    if (clean(fields.product_name)) {
      lines.push(`J'ai reconnu un achat d'${fields.product_name}.`);
    } else if (fields.payment_amount) {
      lines.push(`Je vois une facture de ${fmtMoney(fields.payment_amount)}.`);
      lines.push('Je n\'arrive pas à identifier le produit concerné.');
      lines.push('Que contient cette facture ?');
      return lines.join('\n');
    } else {
      lines.push('J\'ai reconnu un document d\'achat.');
    }

    if (fields.quantity) lines.push(`Quantité : ${fields.quantity} ${fields.unit || ''}`.trim());
    if (fields.payment_amount) lines.push(`Montant : ${fmtMoney(fields.payment_amount)}`);

    if (missingFields.includes('supplier_name')) {
      lines.push('Fournisseur non identifié.');
      if (supplierSuggestions.length) {
        lines.push('Fournisseur probable :');
        supplierSuggestions.forEach((s) => lines.push(`• ${s}`));
        lines.push('• Autre');
      }
      lines.push('Pouvez-vous confirmer ?');
      return lines.join('\n');
    }

    if (missingFields.includes('quantity') && clean(fields.product_name)) {
      lines.push('Je connais le montant mais pas la quantité.');
      lines.push('Combien de sacs avez-vous achetés ?');
      return lines.join('\n');
    }
  }

  if (missingFields.length) {
    const humanMissing = missingFields.map((f) => FIELD_LABELS[f] || f).join(', ');
    lines.push(`Il me manque encore : ${humanMissing}.`);
    lines.push('Pouvez-vous préciser ?');
  } else if (mode === 'confirm') {
    lines.push('Tout semble cohérent. Confirmez si les informations sont correctes.');
  } else {
    lines.push('Vérifiez le brouillon ci-dessous et validez si tout est correct.');
  }

  return lines.join('\n');
}

/**
 * Analyse un texte document (OCR ou collé) et produit brouillon + complétion.
 */
export function analyzeDocumentForCompletion(text = '', dataMap = {}, options = {}) {
  const raw = clean(text);
  if (!raw) {
    return {
      ok: false,
      assistantText: 'Je n\'ai pas pu lire le document. Collez le texte ou envoyez une photo plus nette.',
      confidence: 0,
      missingFields: [],
      mode: 'conversation',
    };
  }

  const docKind = options.forcedKind || detectDocumentKind(raw);
  const ambiguous = docKind === 'ambiguous_maize' ? detectAmbiguousMaize(raw) : null;
  const parsed = parseInvoiceOcrText(raw, dataMap);
  const inconsistencies = detectInconsistencies(parsed);

  let intent = 'purchase_stock';
  let primary_module = 'stock';
  let form_type = 'stock_purchase';
  let fields;

  if (docKind === 'sale_invoice') {
    intent = 'sale_record';
    primary_module = 'commercial';
    form_type = 'sale_record';
    fields = buildSaleDraftFields(parsed, raw);
  } else if (ambiguous) {
    intent = 'purchase_stock';
    fields = {
      product_name: 'maïs',
      quantity: ambiguous.quantity,
      unit: ambiguous.unit,
      payment_status: 'unknown',
      date: new Date().toISOString().slice(0, 10),
    };
  } else {
    fields = buildPurchaseDraftFields(parsed, dataMap);
  }

  const productMatch = isRealProductName(fields.product_name)
    ? (findStockProduct(fields.product_name, dataMap)
      ? { status: 'matched', product: findStockProduct(fields.product_name, dataMap) }
      : { status: 'not_in_catalog', name: fields.product_name })
    : { status: 'unknown' };

  let missingFields = computeMissingForIntent(intent, fields);
  if (ambiguous) missingFields = ['interpretation'];
  if (inconsistencies.length && !ambiguous) {
    missingFields = [...new Set([...missingFields, 'total_consistency'])];
  }

  const supplierSuggestions = missingFields.includes('supplier_name')
    ? suggestSuppliers(fields.product_name, dataMap)
    : [];
  const productAttachOptions = productMatch.status === 'not_in_catalog'
    ? suggestProductAttachments(fields.product_name, dataMap)
    : [];

  const erpMatches = (findSupplier(fields.supplier_name, dataMap) ? 1 : 0)
    + (productMatch.status === 'matched' ? 1 : 0);

  const confidence = computeConfidence({
    missingFields,
    inconsistencies,
    ambiguous,
    productMatch,
    erpMatches,
  });

  const pendingChoice = ambiguous
    || productMatch.status === 'not_in_catalog'
    || inconsistencies.length > 0;

  const mode = completionModeFromScore(confidence, missingFields.length, pendingChoice);

  const assistantText = buildConversationalCompletionMessage({
    docKind,
    fields,
    missingFields,
    inconsistencies,
    ambiguous,
    productMatch,
    supplierSuggestions,
    productAttachOptions,
    confidence,
    mode,
  });

  const choices = [];
  if (ambiguous) {
    choices.push(
      { id: 'interpret_harvest', label: 'Récolte', intent: 'culture_harvest' },
      { id: 'interpret_sale', label: 'Vente', intent: 'sale_record' },
      { id: 'interpret_purchase', label: 'Achat', intent: 'purchase_stock' },
      { id: 'interpret_stock', label: 'Stock', intent: 'purchase_stock' },
    );
  }
  if (productMatch.status === 'not_in_catalog') {
    productAttachOptions.forEach((opt, i) => {
      choices.push({
        id: `attach_product_${i}`,
        label: `Rattacher à ${opt.label}`,
        action: 'attach_product',
        productId: opt.id,
        productName: opt.label,
      });
    });
    choices.push({ id: 'create_product', label: 'Créer produit', action: 'create_product' });
  }
  if (inconsistencies.length) {
    const issue = inconsistencies[0];
    choices.push(
      { id: 'use_computed_total', label: `Utiliser ${fmtMoney(issue.computedTotal)}`, action: 'set_amount', amount: issue.computedTotal },
      { id: 'use_stated_total', label: `Utiliser ${fmtMoney(issue.statedTotal)}`, action: 'set_amount', amount: issue.statedTotal },
    );
  }

  const documentCompletion = {
    confidence,
    missingFields,
    mode,
    docKind,
    inconsistencies,
    ambiguous,
    productMatch,
    supplierSuggestions,
    productAttachOptions,
    pendingField: missingFields[0] || null,
    pendingQuestion: assistantText,
    choices,
    sourceText: raw.slice(0, 4000),
    awaitingReply: missingFields.length > 0 || pendingChoice,
  };

  const draft = {
    status: missingFields.length ? 'draft_incomplete' : 'awaiting_validation',
    intent,
    confidence: confidence / 100,
    raw_input: raw,
    history: [{ role: 'system', content: 'document_scan' }],
    primary_module,
    form_type,
    requires_validation: true,
    missing_fields: missingFields.filter((f) => f !== 'interpretation' && f !== 'total_consistency'),
    warnings: inconsistencies.length ? ['Incohérence de montants détectée'] : [],
    draft_fields: fields,
    impacted_modules: intent === 'sale_record'
      ? ['commercial', 'stock', 'finances', 'clients', 'tracabilite', 'centre_ia']
      : ['stock', 'finances', 'fournisseurs', 'tracabilite', 'centre_ia'],
    documentCompletion,
    ui: {
      title: intent === 'sale_record' ? 'Brouillon vente' : 'Brouillon achat',
      subtitle: mode === 'conversation' ? 'Complétons ensemble les informations.' : 'Vérifiez puis validez.',
      validation_label: 'Valider',
      cancel_label: 'Annuler',
    },
  };

  return {
    ok: true,
    draft,
    assistantText,
    confidence,
    missingFields,
    mode,
    documentCompletion,
    checklist: buildDraftFieldChecklist(draft),
  };
}

/**
 * Applique une réponse utilisateur pour compléter le brouillon document.
 */
export function applyDocumentCompletionReply(draft = null, userText = '', dataMap = {}) {
  if (!draft?.documentCompletion) {
    return { draft, assistantText: null, done: false };
  }

  const text = clean(userText);
  const completion = { ...draft.documentCompletion };
  const t = lower(text);

  let nextDraft = updateHorizonDraft(draft, userText, dataMap);
  const fields = { ...(nextDraft.draft_fields || {}) };

  if (/recolte|récolte/.test(t)) {
    nextDraft = {
      ...nextDraft,
      intent: 'culture_harvest',
      form_type: 'culture_harvest',
      primary_module: 'cultures',
      draft_fields: {
        culture_name: 'maïs',
        quantity: fields.quantity || completion.ambiguous?.quantity,
        unit: fields.unit || 'kg',
        date: fields.date,
      },
      missing_fields: fields.quantity ? [] : ['quantity'],
      documentCompletion: { ...completion, ambiguous: null, awaitingReply: !fields.quantity },
    };
  } else if (/vente/.test(t) && completion.ambiguous) {
    nextDraft.intent = 'sale_record';
    nextDraft.form_type = 'sale_record';
    nextDraft.primary_module = 'commercial';
  } else if (/achat/.test(t) && completion.ambiguous) {
    nextDraft.intent = 'purchase_stock';
    nextDraft.form_type = 'stock_purchase';
    nextDraft.primary_module = 'stock';
    completion.ambiguous = null;
  } else if (/stock/.test(t) && completion.ambiguous) {
    completion.ambiguous = null;
  }

  if (/rattacher|ratache/.test(t) || /aliment\s+pondeuse/i.test(t)) {
    const attach = completion.productAttachOptions?.[0];
    if (attach) {
      fields.product_name = attach.label;
      fields.product_id = attach.id;
      completion.productMatch = { status: 'matched' };
    }
  } else if (/creer|créer|nouveau produit/.test(t)) {
    completion.productMatch = { status: 'pending_create' };
  }

  if (completion.supplierSuggestions?.some((s) => lower(s) === t || t.includes(lower(s)))) {
    const match = completion.supplierSuggestions.find((s) => lower(s) === t || t.includes(lower(s)));
    fields.supplier_name = match;
    const supplier = findSupplier(match, dataMap);
    if (supplier) fields.supplier_id = supplier.id;
  } else if (completion.pendingField === 'supplier_name' && text.length > 2) {
    fields.supplier_name = text;
    const supplier = findSupplier(text, dataMap);
    if (supplier) fields.supplier_id = supplier.id;
  }

  if (completion.pendingField === 'product_name' && text.length > 2 && !fields.product_name) {
    fields.product_name = text;
    const stock = findStockProduct(text, dataMap);
    if (stock) {
      fields.product_id = stock.id;
      completion.productMatch = { status: 'matched' };
    } else {
      completion.productMatch = { status: 'not_in_catalog', name: text };
    }
  }

  if (completion.pendingField === 'client_name' && text.length > 2) {
    fields.client_name = text;
    const client = findClient(text, dataMap);
    if (client) fields.client_id = client.id;
  }

  const qtyMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(sacs?|kg|oeufs?|œufs?)?/i);
  if (qtyMatch && (!fields.quantity || completion.pendingField === 'quantity')) {
    fields.quantity = n(qtyMatch[1]);
    if (qtyMatch[2]) fields.unit = lower(qtyMatch[2]).replace(/s$/, '');
  }

  const amountMatch = text.match(/(\d[\d\s.,]*)\s*(?:fcfa|f\s*cfa)?/i);
  if (amountMatch && (completion.inconsistencies?.length || !fields.payment_amount)) {
    const amt = n(amountMatch[1]);
    if (amt) fields.payment_amount = amt;
    completion.inconsistencies = [];
  }

  nextDraft.draft_fields = fields;
  const missingFields = computeMissingForIntent(nextDraft.intent, fields);
  if (completion.ambiguous) missingFields.push('interpretation');
  if (completion.inconsistencies?.length) missingFields.push('total_consistency');

  const uniqueMissing = [...new Set(missingFields)].filter(
    (f) => f !== 'interpretation' && f !== 'total_consistency',
  );

  const confidence = computeConfidence({
    missingFields,
    inconsistencies: completion.inconsistencies || [],
    ambiguous: completion.ambiguous,
    productMatch: completion.productMatch,
    erpMatches: (findSupplier(fields.supplier_name, dataMap) ? 1 : 0)
      + (findStockProduct(fields.product_name, dataMap) ? 1 : 0),
  });

  const mode = completionModeFromScore(
    confidence,
    uniqueMissing.length,
    Boolean(completion.ambiguous || completion.productMatch?.status === 'not_in_catalog'),
  );

  completion.confidence = confidence;
  completion.missingFields = missingFields;
  completion.mode = mode;
  completion.pendingField = uniqueMissing[0] || null;
  completion.awaitingReply = uniqueMissing.length > 0
    || completion.ambiguous
    || completion.productMatch?.status === 'not_in_catalog'
    || (completion.inconsistencies?.length > 0);

  const assistantText = buildConversationalCompletionMessage({
    docKind: completion.docKind,
    fields,
    missingFields,
    inconsistencies: completion.inconsistencies || [],
    ambiguous: completion.ambiguous,
    productMatch: completion.productMatch,
    supplierSuggestions: completion.supplierSuggestions,
    productAttachOptions: completion.productAttachOptions,
    confidence,
    mode,
  });

  completion.pendingQuestion = assistantText;

  nextDraft = {
    ...nextDraft,
    status: uniqueMissing.length ? 'draft_incomplete' : 'awaiting_validation',
    missing_fields: uniqueMissing,
    confidence: confidence / 100,
    documentCompletion: completion,
    history: [...(nextDraft.history || []), { role: 'user', content: userText }],
  };

  return {
    draft: nextDraft,
    assistantText: uniqueMissing.length ? assistantText : 'Merci — le brouillon est complet. Vous pouvez valider.',
    done: !completion.awaitingReply,
    confidence,
    checklist: buildDraftFieldChecklist(nextDraft),
  };
}

/**
 * Applique un choix UI (bouton interprétation, rattacher, montant).
 */
export function applyDocumentCompletionChoice(draft = null, choice = {}, dataMap = {}) {
  if (!draft || !choice?.id) return { draft, assistantText: null, done: false };

  let syntheticText = choice.label || '';
  if (choice.action === 'set_amount' && choice.amount) {
    syntheticText = `${choice.amount} FCFA`;
  } else if (choice.action === 'attach_product') {
    syntheticText = `rattacher à ${choice.productName || choice.label}`;
  } else if (choice.id?.startsWith('interpret_')) {
    syntheticText = choice.label;
  }

  return applyDocumentCompletionReply(draft, syntheticText, dataMap);
}

export default {
  CONFIDENCE_THRESHOLDS,
  analyzeDocumentForCompletion,
  applyDocumentCompletionReply,
  applyDocumentCompletionChoice,
  buildConversationalCompletionMessage,
  buildDraftFieldChecklist,
};
