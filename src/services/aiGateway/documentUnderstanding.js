/**
 * Compréhension documentaire → brouillon de liaison preuve (commitDocumentLink après validation).
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

const DOC_TYPE_HINTS = [
  { pattern: /facture|invoice/i, type: 'facture' },
  { pattern: /bon\s+de\s+livraison|bl\b/i, type: 'bon_livraison' },
  { pattern: /reçu|recu|ticket/i, type: 'recu' },
  { pattern: /contrat/i, type: 'contrat' },
  { pattern: /photo|preuve/i, type: 'preuve_photo' },
];

export function inferDocumentTypeFromText(text = '') {
  const hit = DOC_TYPE_HINTS.find((h) => h.pattern.test(text));
  return hit?.type || 'preuve';
}

export function inferLinkedModule(text = '', context = {}) {
  const t = lower(text);
  if (context.module_lie) return context.module_lie;
  if (/vente|client|facture\s+client/i.test(t)) return 'commercial';
  if (/achat|fournisseur|stock/i.test(t)) return 'achats_stock';
  if (/finance|paiement|encaissement/i.test(t)) return 'finance_pilotage';
  if (/santé|vaccin|soin/i.test(t)) return 'elevage';
  return context.default_module || 'documents_rapports';
}

/**
 * Propose un brouillon de rattachement document — pas d'upload ni de lien en base.
 */
export function proposeDocumentLinkDraft({
  text = '',
  fileName = '',
  context = {},
} = {}) {
  const combined = `${text} ${fileName}`.trim();
  const docType = inferDocumentTypeFromText(combined);
  const moduleLie = inferLinkedModule(combined, context);
  const relatedId = clean(context.related_id || context.transaction_id || '');
  const missing = [];
  if (!relatedId) missing.push('related_id');
  if (!clean(fileName) && !clean(text)) missing.push('document_reference');

  const warnings = [];
  if (!relatedId) {
    warnings.push('Sélectionnez la transaction ou l\'enregistrement métier à lier avant validation.');
  }

  return createAiActionDraft({
    intent: 'document_link',
    confidence: missing.length ? 0.5 : 0.82,
    source: AI_DRAFT_SOURCES.DOCUMENT,
    draft: {
      form: {
        type_document: docType,
        module_lie: moduleLie,
        related_id: relatedId,
        libelle: clean(text) || clean(fileName) || 'Document à lier',
        notes: combined,
      },
      context: {
        ...context,
        source: 'ai_gateway_document',
      },
    },
    target_workflow: TARGET_WORKFLOWS.DOCUMENT_LINK,
    required_validation: true,
    warnings,
    missing_fields: missing,
    confirmation_required: missing.length > 0,
    raw_input: combined,
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}

/**
 * Suggestions de champs manquants pour preuve finance (lecture seule).
 */
export function suggestMissingProofFields(transactions = [], documents = []) {
  const txs = arr(transactions);
  const docs = arr(documents);
  const linkedIds = new Set(docs.map((d) => clean(d.related_id || d.transaction_id)).filter(Boolean));

  return txs
    .filter((tx) => !linkedIds.has(clean(tx.id)) && (tx.preuve_requise || tx.requires_proof))
    .slice(0, 10)
    .map((tx) =>
      proposeDocumentLinkDraft({
        text: `Preuve manquante — ${tx.libelle || tx.label || tx.id}`,
        context: {
          related_id: tx.id,
          module_lie: 'finance_pilotage',
          transaction_id: tx.id,
        },
      }),
    );
}
