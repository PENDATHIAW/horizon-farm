/**
 * Brouillons gateway à partir d'un document scanné.
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';
import { SCANNER_DOC_TYPES, SCANNER_DOC_TYPE_LABELS } from './documentScannerTypes.js';
import {
  classifyScannerDocumentType,
  listMissingScannerFields,
  parseScannedDocument,
} from './documentScannerParser.js';

const clean = (value) => String(value || '').trim();

function intentForType(type) {
  switch (type) {
    case SCANNER_DOC_TYPES.VET_PRESCRIPTION:
      return 'health_prescription_scan';
    case SCANNER_DOC_TYPES.PAYMENT_RECEIPT:
      return 'payment_receipt_scan';
    case SCANNER_DOC_TYPES.DELIVERY_NOTE:
      return 'delivery_note_scan';
    default:
      return 'purchase_invoice_scan';
  }
}

function workflowForType(type) {
  switch (type) {
    case SCANNER_DOC_TYPES.VET_PRESCRIPTION:
      return TARGET_WORKFLOWS.HEALTH;
    case SCANNER_DOC_TYPES.PAYMENT_RECEIPT:
      return TARGET_WORKFLOWS.SALE_PAYMENT;
    default:
      return TARGET_WORKFLOWS.STOCK_PURCHASE;
  }
}

/**
 * Construit le payload achat pour prepareStockPurchaseWorkflow.
 */
export function buildPurchasePayloadFromScan(fields = {}, proofMeta = {}) {
  const line = (fields.lignes || [])[0] || {};
  return {
    produit: clean(fields.produit || line.produit),
    product_name: clean(fields.produit || line.produit),
    quantite: fields.quantite ?? line.quantite,
    quantite_recue: fields.quantite ?? line.quantite,
    unite: fields.unite || line.unite || 'kg',
    prix_unitaire: fields.prix_unitaire ?? line.prix_unitaire,
    montant: fields.montant_total,
    fournisseur_id: fields.fournisseur_id || '',
    supplier_name: fields.fournisseur,
    statut_paiement: fields.statut_paiement || fields.payment_status || 'paye',
    payment_status: fields.statut_paiement || fields.payment_status || 'paye',
    date: fields.date,
    proof_url: proofMeta.proof_url || proofMeta.file_url || '',
    file_url: proofMeta.file_url || proofMeta.proof_url || '',
    document_id: proofMeta.document_id || '',
    document_title: proofMeta.document_title || `Facture ${fields.fournisseur || 'achat'}`,
    notes: fields.notes || 'Scanner document IA',
    entry_kind: fields.entry_kind || 'achat_stockable',
    lignes: fields.lignes || [],
  };
}

/**
 * Construit le payload santé pour prepareHealthWorkflow.
 */
export function buildHealthPayloadFromScan(fields = {}, proofMeta = {}) {
  return {
    nom: fields.nom || fields.vaccin || 'Soin',
    type_soin: fields.type_soin || 'vaccin',
    vaccin: fields.vaccin || '',
    lot_id: fields.lot_id || '',
    animal_id: fields.animal_id || '',
    stock_id: fields.stock_id || '',
    quantite_stock: fields.quantite_stock ?? 1,
    cout: fields.cout || 0,
    date: fields.date,
    effectuee: fields.date,
    dose: fields.dose || '',
    notes: fields.preuve_texte || '',
    proof_url: proofMeta.proof_url || proofMeta.file_url || '',
    document_id: proofMeta.document_id || '',
    rappel_jours: fields.rappel_jours,
  };
}

/**
 * Construit le payload encaissement pour recordSalePayment.
 */
export function buildPaymentPayloadFromScan(fields = {}, proofMeta = {}) {
  return {
    sale: { id: fields.sale_id || '', order_id: fields.sale_id || '' },
    requestedAmount: fields.requestedAmount ?? fields.montant,
    paymentMethod: fields.payment_method || 'especes',
    paymentDate: fields.date,
    proof_url: proofMeta.proof_url || proofMeta.file_url || '',
    document_id: proofMeta.document_id || '',
  };
}

/**
 * Crée un brouillon IA gateway complet depuis texte extrait.
 */
export function buildScannerDraft({
  text = '',
  fileName = '',
  docType = '',
  extraction = {},
  context = {},
  proofMeta = {},
} = {}) {
  const parsed = parseScannedDocument({ text, fileName, docType, context });
  const type = parsed.type;
  const fields = parsed.fields;
  const missing = listMissingScannerFields(type, fields);
  const extractionConfidence = extraction.confidence ?? 0.5;
  const parseConfidence = parsed.confidence ?? 0.6;
  const confidence = Math.min(0.95, extractionConfidence * 0.4 + parseConfidence * 0.6 - missing.length * 0.08);

  const warnings = [];
  if (extraction.needsManualText) {
    warnings.push('Texte OCR incomplet : vérifiez ou collez le contenu du document.');
  }
  if (missing.length) {
    warnings.push(`Champs à confirmer : ${missing.join(', ')}.`);
  }

  let payload;
  if (type === SCANNER_DOC_TYPES.VET_PRESCRIPTION) {
    payload = buildHealthPayloadFromScan(fields, proofMeta);
  } else if (type === SCANNER_DOC_TYPES.PAYMENT_RECEIPT) {
    payload = buildPaymentPayloadFromScan(fields, proofMeta);
  } else {
    payload = buildPurchasePayloadFromScan(fields, proofMeta);
  }

  return createAiActionDraft({
    intent: intentForType(type),
    confidence,
    source: AI_DRAFT_SOURCES.DOCUMENT,
    draft: {
      scanner_doc_type: type,
      scanner_doc_label: SCANNER_DOC_TYPE_LABELS[type],
      fields,
      payload,
      proof: proofMeta,
      extracted_text: text.slice(0, 4000),
      context_snapshot: {
        fournisseurs_count: (context.fournisseurs || []).length,
        stocks_count: (context.stocks || []).length,
      },
    },
    target_workflow: workflowForType(type),
    required_validation: true,
    warnings,
    missing_fields: missing,
    confirmation_required: missing.length > 0 || confidence < 0.65,
    raw_input: text.slice(0, 500),
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
    meta: {
      detected_type: classifyScannerDocumentType(text, fileName, docType),
    },
  });
}
