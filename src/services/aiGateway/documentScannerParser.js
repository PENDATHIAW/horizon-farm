/**
 * Compréhension déterministe du texte scanné (MVP sans LLM obligatoire).
 */

import { SCANNER_DOC_TYPES } from './documentScannerTypes.js';

const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const arr = (value) => (Array.isArray(value) ? value : []);

const toNum = (value) => {
  const n = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const toISODate = (input = '') => {
  const text = lower(input);
  const numeric = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (numeric) {
    const y = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${y}-${String(numeric[2]).padStart(2, '0')}-${String(numeric[1]).padStart(2, '0')}`;
  }
  if (text.includes('aujourd')) return new Date().toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
};

const extractAmounts = (text = '') => {
  const matches = [...text.matchAll(/(\d[\d\s.,]*)\s*(?:fcfa|f\s*cfa|xof|francs?)/gi)];
  return matches.map((m) => toNum(m[1])).filter((n) => n != null && n > 0);
};

const extractPaymentStatus = (text = '') => {
  const t = lower(text);
  if (/(paye|payé|regle|réglé|especes|espèces|cash|recu|reçu)/.test(t) && !/(a payer|à payer|credit|crédit|impaye)/.test(t)) return 'paye';
  if (/(credit|crédit|a payer|à payer|echeance)/.test(t)) return 'a_payer';
  if (/(partiel|acompte|avance)/.test(t)) return 'partiel';
  return 'unknown';
};

/**
 * Détecte le type de document parmi les 4 MVP.
 */
export function classifyScannerDocumentType(text = '', fileName = '', forcedType = '') {
  if (forcedType && Object.values(SCANNER_DOC_TYPES).includes(forcedType)) return forcedType;
  const combined = lower(`${text} ${fileName}`);
  if (/(ordonnance|veterinaire|vétérinaire|prescription|vaccin|antibiot|dose|mg\/|ml\/)/.test(combined)) {
    return SCANNER_DOC_TYPES.VET_PRESCRIPTION;
  }
  if (/(recu de paiement|reçu de paiement|ticket caisse|encaissement|paiement recu|reçu client)/.test(combined)) {
    return SCANNER_DOC_TYPES.PAYMENT_RECEIPT;
  }
  if (/(bon de livraison|bon livraison|\bbl\b|livraison n)/.test(combined)) {
    return SCANNER_DOC_TYPES.DELIVERY_NOTE;
  }
  if (/(facture|invoice|fournisseur|achat|ttc|ht\b|tva)/.test(combined)) {
    return SCANNER_DOC_TYPES.PURCHASE_INVOICE;
  }
  return SCANNER_DOC_TYPES.PURCHASE_INVOICE;
}

function extractSupplierName(text = '') {
  const patterns = [
    /fournisseur\s*[:-]?\s*([^\n]+)/i,
    /vendeur\s*[:-]?\s*([^\n]+)/i,
    /de\s+la\s+societe\s+([^\n]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return clean(m[1]).slice(0, 80);
  }
  const firstLine = text.split('\n').map(clean).find((l) => l.length > 3 && !/facture|date|fcfa/i.test(l));
  return firstLine || '';
}

function extractProductLines(text = '') {
  const lines = [];
  const rowRe = /([^\d\n]{2,40}?)\s+(\d+(?:[.,]\d+)?)\s*(?:kg|sac|sacs|u|unit|l|litre)?\s*(?:x|×|@)?\s*(\d+(?:[.,]\d+)?)?\s*(?:fcfa)?/gi;
  let match;
  while ((match = rowRe.exec(text)) !== null && lines.length < 8) {
    const name = clean(match[1]);
    const qty = toNum(match[2]);
    const unitPrice = toNum(match[3]);
    if (name && qty) {
      lines.push({
        produit: name,
        quantite: qty,
        prix_unitaire: unitPrice || null,
        unite: /sac/i.test(match[0]) ? 'sac' : 'kg',
      });
    }
  }
  if (!lines.length) {
    const simple = text.match(/(aliment|ma[iï]s|son|vaccin|antibio|materiel|équipement|equipement|pondeuse|chair)[^\n]*/i);
    if (simple) {
      const qtyMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|sac|sacs|unit)/i);
      lines.push({
        produit: clean(simple[0]),
        quantite: toNum(qtyMatch?.[1]) || 1,
        prix_unitaire: null,
        unite: 'kg',
      });
    }
  }
  return lines;
}

export function parsePurchaseInvoice(text = {}, context = {}) {
  const raw = typeof text === 'string' ? text : text.text || '';
  const amounts = extractAmounts(raw);
  const total = amounts.length ? Math.max(...amounts) : null;
  const lines = extractProductLines(raw);
  const first = lines[0] || {};
  const paymentStatus = extractPaymentStatus(raw);
  const supplierName = extractSupplierName(raw);
  const supplier = arr(context.fournisseurs).find((f) => {
    const name = lower(f.name || f.nom || f.raison_sociale);
    return name && lower(supplierName).includes(name);
  });

  return {
    doc_type: SCANNER_DOC_TYPES.PURCHASE_INVOICE,
    fournisseur: supplierName,
    fournisseur_id: supplier?.id || '',
    date: toISODate(raw),
    lignes: lines,
    produit: first.produit || '',
    quantite: first.quantite || null,
    prix_unitaire: first.prix_unitaire || (total && first.quantite ? Math.round(total / first.quantite) : null),
    unite: first.unite || 'kg',
    montant_total: total,
    statut_paiement: paymentStatus === 'unknown' ? 'paye' : paymentStatus,
    payment_status: paymentStatus,
    preuve_texte: raw.slice(0, 2000),
  };
}

export function parseVetPrescription(text = {}, context = {}) {
  const raw = typeof text === 'string' ? text : text.text || '';
  const medMatch = raw.match(/(?:medicament|médicament|produit|traitement)\s*[:-]?\s*([^\n]+)/i)
    || raw.match(/(vaccin[a-zéèêë\s-]+|antibio[a-zéèêë\s-]+|ivermectin[a-z]*|vitamine[a-z\s]*)/i);
  const doseMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|mg|g|dose|doses)/i);
  const durationMatch = raw.match(/(\d+)\s*(?:jour|jours|semaine|semaines)/i);
  const lotMatch = raw.match(/\b(LOT[-_\s]?\w+|\bL\d{2,6}\b)/i);
  const animalMatch = raw.match(/\b(BOV|OVI|CAP|ANI)[-_]?\d{1,6}\b/i);

  const lotId = lotMatch?.[0]?.replace(/\s+/g, '') || '';
  const animalId = animalMatch?.[0]?.replace(/\s+/g, '') || '';
  const lot = lotId ? arr(context.lots).find((l) => clean(l.id).toUpperCase() === lotId.toUpperCase()) : null;
  const animal = animalId ? arr(context.animaux).find((a) => clean(a.id).toUpperCase() === animalId.toUpperCase()) : null;

  const stockProduct = arr(context.stocks).find((s) => /vaccin|medic|antibio|vermifuge/i.test(lower(`${s.produit} ${s.nom}`)));

  return {
    doc_type: SCANNER_DOC_TYPES.VET_PRESCRIPTION,
    nom: clean(medMatch?.[1] || medMatch?.[0] || 'Intervention sanitaire'),
    type_soin: /vaccin/i.test(raw) ? 'vaccin' : 'curatif',
    vaccin: /vaccin/i.test(raw) ? clean(medMatch?.[1] || 'Vaccin') : '',
    dose: doseMatch ? `${doseMatch[1]} ${doseMatch[0].replace(/[\d.,]/g, '').trim()}` : '',
    duree_jours: toNum(durationMatch?.[1]),
    lot_id: lot?.id || lotId,
    animal_id: animal?.id || animalId,
    stock_id: stockProduct?.id || '',
    quantite_stock: stockProduct ? 1 : null,
    date: toISODate(raw),
    rappel_jours: toNum(durationMatch?.[1]) || 7,
    preuve_texte: raw.slice(0, 2000),
  };
}

export function parsePaymentReceipt(text = {}) {
  const raw = typeof text === 'string' ? text : text.text || '';
  const amounts = extractAmounts(raw);
  const amount = amounts.length ? amounts[amounts.length - 1] : null;
  const clientMatch = raw.match(/client\s*[:-]?\s*([^\n]+)/i);
  const saleMatch = raw.match(/\b(CMD|VTE|SALE|ORD)[-_]?\d{1,8}\b/i);
  const paymentMethod = /mobile|wave|orange|om\b/i.test(raw) ? 'mobile_money' : /virement|banque/i.test(raw) ? 'virement' : 'especes';

  return {
    doc_type: SCANNER_DOC_TYPES.PAYMENT_RECEIPT,
    client_name: clean(clientMatch?.[1] || ''),
    sale_id: saleMatch?.[0]?.replace(/\s+/g, '') || '',
    montant: amount,
    requestedAmount: amount,
    payment_method: paymentMethod,
    date: toISODate(raw),
    preuve_texte: raw.slice(0, 2000),
  };
}

export function parseDeliveryNote(text = {}, context = {}) {
  const purchase = parsePurchaseInvoice(text, context);
  return {
    ...purchase,
    doc_type: SCANNER_DOC_TYPES.DELIVERY_NOTE,
    notes: 'Réception bon de livraison (scan de document)',
    entry_kind: 'achat_stockable',
  };
}

/**
 * Parse selon type détecté ou forcé.
 */
export function parseScannedDocument({ text = '', fileName = '', docType = '', context = {} } = {}) {
  const type = classifyScannerDocumentType(text, fileName, docType);
  switch (type) {
    case SCANNER_DOC_TYPES.VET_PRESCRIPTION:
      return { type, fields: parseVetPrescription(text, context), confidence: 0.72 };
    case SCANNER_DOC_TYPES.PAYMENT_RECEIPT:
      return { type, fields: parsePaymentReceipt(text, context), confidence: 0.7 };
    case SCANNER_DOC_TYPES.DELIVERY_NOTE:
      return { type, fields: parseDeliveryNote(text, context), confidence: 0.68 };
    default:
      return { type: SCANNER_DOC_TYPES.PURCHASE_INVOICE, fields: parsePurchaseInvoice(text, context), confidence: 0.75 };
  }
}

export function listMissingScannerFields(type, fields = {}) {
  const missing = [];
  if (type === SCANNER_DOC_TYPES.PURCHASE_INVOICE || type === SCANNER_DOC_TYPES.DELIVERY_NOTE) {
    if (!clean(fields.fournisseur) && !fields.fournisseur_id) missing.push('fournisseur');
    if (!clean(fields.produit) && !(fields.lignes || []).length) missing.push('produit');
    if (!fields.quantite && !(fields.lignes || []).length) missing.push('quantite');
    if (!fields.montant_total && !fields.prix_unitaire) missing.push('montant');
    if (fields.payment_status === 'unknown' || fields.statut_paiement === 'unknown') missing.push('paiement');
  }
  if (type === SCANNER_DOC_TYPES.VET_PRESCRIPTION) {
    if (!clean(fields.nom) && !clean(fields.vaccin)) missing.push('medicament');
    if (!fields.lot_id && !fields.animal_id) missing.push('cible');
  }
  if (type === SCANNER_DOC_TYPES.PAYMENT_RECEIPT) {
    if (!fields.montant && !fields.requestedAmount) missing.push('montant');
    if (!fields.sale_id && !fields.client_name) missing.push('reference_vente');
  }
  return missing;
}
