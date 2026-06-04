/**
 * OCR Intelligent Horizon — diagnostic économique + brouillon validable (AI Gateway).
 */

import {
  AI_DRAFT_SOURCES,
  TARGET_WORKFLOWS,
  createAiActionDraft,
  markDraftValidated,
} from '../aiGateway/aiActionDrafts.js';
import { assertNoDirectDatabaseWrite, validateDraftForExecution } from '../aiGateway/aiSafetyGuard.js';
import { buildPurchasePayloadFromScan } from '../aiGateway/documentScannerDrafts.js';
import { extractTextFromDocument } from '../aiGateway/documentTextExtraction.js';
import { executeScannerDraft } from '../aiGateway/documentScannerExecute.js';
import { parseInvoiceOcrText } from './invoiceOcrParser.js';
import { analyzeMarginImpact } from './marginImpactAnalyzer.js';

/**
 * Analyse une facture (fichier ou texte simulé) → extraction + diagnostic + brouillon.
 * Aucune écriture métier.
 */
export async function analyzeInvoiceDiagnostic({
  file = null,
  pastedText = '',
  context = {},
  dataMap = {},
  proofMeta = {},
} = {}) {
  const extraction = await extractTextFromDocument(file, { pastedText });
  const text = extraction.text || pastedText || '';
  const invoice = parseInvoiceOcrText(text, context);
  const diagnostic = analyzeMarginImpact(invoice, { ...dataMap, ...context });

  const missing = [...arr(invoice.missing_fields)];
  const warnings = [...arr(diagnostic.recommendation?.bullets || [])];
  if (extraction.needsManualText) {
    warnings.unshift('Texte OCR incomplet — vérifiez ou collez le contenu de la facture.');
  }
  if (diagnostic.price_comparison.trend === 'hausse' && (diagnostic.price_comparison.delta_pct || 0) >= 5) {
    warnings.unshift(`Hausse prix ${Math.abs(diagnostic.price_comparison.delta_pct)} % vs dernier achat.`);
  }

  const payload = buildPurchasePayloadFromScan(
    {
      ...invoice,
      entry_kind: invoice.stockable ? 'achat_stockable' : 'charge_fournisseur',
      notes: diagnostic.recommendation.summary,
    },
    {
      ...proofMeta,
      document_title: proofMeta.document_title || `Facture ${invoice.fournisseur || 'fournisseur'}`,
      module_source: proofMeta.module_source || 'documents_rapports',
    },
  );

  const confidenceBase = invoice.missing_fields?.length ? 0.55 : 0.82;
  const confidence = Math.min(
    0.94,
    confidenceBase * 0.5 + (extraction.confidence ?? 0.6) * 0.3 + (diagnostic.price_comparison.samples ? 0.12 : 0.05),
  );

  const draft = createAiActionDraft({
    intent: invoice.stockable ? 'purchase_invoice_ocr' : 'expense_invoice_ocr',
    confidence,
    source: AI_DRAFT_SOURCES.DOCUMENT,
    draft: {
      ocr_intelligent: true,
      invoice,
      diagnostic,
      fields: invoice,
      payload,
      proof: proofMeta,
      extracted_text: text.slice(0, 4000),
      recommendation: diagnostic.recommendation,
    },
    target_workflow: invoice.stockable ? TARGET_WORKFLOWS.STOCK_PURCHASE : TARGET_WORKFLOWS.OPEN_FORM,
    required_validation: true,
    warnings,
    missing_fields: missing,
    confirmation_required: missing.length > 0 || confidence < 0.65,
    raw_input: text.slice(0, 500),
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
    meta: { channel: 'ocr_intelligent_horizon' },
  });

  assertNoDirectDatabaseWrite({ type: 'propose', draft });

  return {
    draft,
    invoice,
    diagnostic,
    extraction,
    empty: !text && extraction.needsManualText,
  };
}

/**
 * Marque le brouillon diagnostic validé par l'utilisateur.
 */
export function validateInvoiceDiagnosticDraft(draft = {}, meta = {}) {
  if (!draft?.id) throw new Error('Brouillon OCR invalide.');
  if (arr(draft.missing_fields).length > 0) {
    throw new Error(`Complétez : ${draft.missing_fields.join(', ')}`);
  }
  const validated = markDraftValidated(draft, { userId: meta.userId || 'ocr_user' });
  validated.required_validation = false;
  validated.confirmation_required = false;
  validated.missing_fields = [];
  validated.confidence = Math.max(validated.confidence ?? 0.5, 0.75);
  validated.status = 'validated';
  return validated;
}

/**
 * Exécute le brouillon validé via workflow métier (réception stock ou ouverture formulaire).
 */
export async function executeInvoiceDiagnosticDraft(draft = {}, handlers = {}, context = {}) {
  const check = validateDraftForExecution(draft);
  if (!check.ok) {
    return { ok: false, error: check.error, assessment: check.assessment };
  }

  if (draft.target_workflow === TARGET_WORKFLOWS.OPEN_FORM) {
    return {
      ok: true,
      workflow: TARGET_WORKFLOWS.OPEN_FORM,
      openedForm: true,
      message: 'Ouvrez Finance & Pilotage pour valider la dépense fournisseur.',
    };
  }

  const scannerDraft = {
    ...draft,
    draft: {
      ...draft.draft,
      scanner_doc_type: 'facture_achat_stock',
      fields: draft.draft?.fields || draft.draft?.invoice,
      payload: draft.draft?.payload,
    },
    target_workflow: TARGET_WORKFLOWS.STOCK_PURCHASE,
  };

  return executeScannerDraft(scannerDraft, handlers, context);
}

const arr = (value) => (Array.isArray(value) ? value : []);

export default analyzeInvoiceDiagnostic;
