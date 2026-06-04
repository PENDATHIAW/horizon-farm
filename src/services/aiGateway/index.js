/**
 * AI Gateway — point d'entrée unique pour l'IA générative future.
 * Produits : brouillons structurés. Écritures : workflows métier validés uniquement.
 */

export {
  AI_DRAFT_VERSION,
  TARGET_WORKFLOWS,
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  normalizeLegacyDraft,
  resolveTargetWorkflow,
  isExecutableWorkflow,
  markDraftValidated,
  INTENT_TO_WORKFLOW,
} from './aiActionDrafts.js';

export {
  LOW_CONFIDENCE_THRESHOLD,
  BLOCK_EXECUTION_CONFIDENCE,
  FORBIDDEN_DIRECT_HANDLER_KEYS,
  ALLOWED_WORKFLOW_EXECUTORS,
  assessDraftSafety,
  validateDraftForExecution,
  assertNoDirectDatabaseWrite,
  guardWorkflowExecutor,
  containsForbiddenDirectHandlers,
} from './aiSafetyGuard.js';

/**
 * Parse vocal : import depuis `./voiceCommandParser.js` (évite dépendances lourdes au boot).
 * Exécuteurs : import depuis `./workflowExecutors.js`.
 */

export {
  proposeDocumentLinkDraft,
  suggestMissingProofFields,
  inferDocumentTypeFromText,
} from './documentUnderstanding.js';
export { generateChartInsightDraft } from './chartInsightGenerator.js';
export {
  explainChartCurve,
  proposeChartExplainDraft,
  buildChartExplainPayload,
  CHART_EXPLAIN_MODULES,
} from './chartExplainService.js';
export {
  proposeClientMessageDraft,
  proposeSaleDraft,
  proposePaymentDraft,
} from './commercialContentGenerator.js';
export {
  generateSalesPublication,
  proposeSalesPublicationDraft,
  CLIENT_TYPES,
  PUBLICATION_CHANNELS,
  DEFAULT_MIN_MARGIN_PCT,
} from './salesPublicationGenerator.js';
export {
  findUnmatchedPayments,
  proposeReconciliationDraft,
  proposeReconciliationDraftFromRow,
  proposeReconciliationDraftsFromRows,
  proposeReconciliationDraftsForOrphans,
} from './smartReconciliation.js';

export { scanDocumentToDraft, SCANNER_DOC_TYPES } from './documentScannerService.js';
export { buildScannerDraft } from './documentScannerDrafts.js';
export { executeScannerDraft } from './documentScannerExecute.js';
export { extractTextFromDocument, fetchDocumentOcr } from './documentTextExtraction.js';
export {
  SCANNER_DOC_TYPE_LABELS,
  SCANNER_MIME_ACCEPT,
} from './documentScannerTypes.js';

export { parseContextualVoicePhrase } from './contextualVoiceParser.js';
export {
  processContextualVoiceInput,
  getValidatableDrafts,
  getLegacyDraftForValidation,
} from './contextualVoiceService.js';
export { journalizeVoiceParse } from './heyHorizonVoiceJournal.js';
export { gatewayDraftToFormRequest, gatewayDraftToLegacyHeyDraft } from './gatewayFormBridge.js';

import { markDraftValidated, TARGET_WORKFLOWS } from './aiActionDrafts.js';
import {
  assertNoDirectDatabaseWrite,
  validateDraftForExecution,
  containsForbiddenDirectHandlers,
} from './aiSafetyGuard.js';

/**
 * Prépare un brouillon pour affichage (jamais d'écriture).
 */
export function proposeAiAction(draftFactory, ...args) {
  const draft = typeof draftFactory === 'function' ? draftFactory(...args) : draftFactory;
  assertNoDirectDatabaseWrite({ type: 'propose', draft });
  return draft;
}

/**
 * Marque un brouillon validé par l'utilisateur (UI / Hey Horizon).
 */
export function validateAiDraftByUser(draft = {}, meta = {}) {
  return markDraftValidated(draft, meta);
}

/**
 * Exécute un brouillon validé via le workflow métier autorisé uniquement.
 * @returns {Promise<{ ok: boolean, result?: unknown, error?: string, assessment?: object }>}
 */
export async function executeValidatedDraft(draft = {}, handlers = {}) {
  assertNoDirectDatabaseWrite({ type: 'execute', draft });

  if (containsForbiddenDirectHandlers({ handlers })) {
    return { ok: false, error: 'Handlers interdits : utilisez les workflows métier.' };
  }

  const check = validateDraftForExecution(draft);
  if (!check.ok) {
    return { ok: false, error: check.error, assessment: check.assessment };
  }

  const { resolveWorkflowExecutor } = await import('./workflowExecutors.js');
  const executor = resolveWorkflowExecutor(draft.target_workflow);
  if (!executor) {
    return { ok: false, error: `Exécuteur introuvable pour ${draft.target_workflow}` };
  }

  const payload = draft.draft?.preview ?? draft.draft?.form ?? draft.draft;
  const context = draft.draft?.context || {};

  try {
    let result;
    if (draft.target_workflow === 'recordSalePayment') {
      result = await executor({ ...payload, handlers });
    } else if (draft.target_workflow === TARGET_WORKFLOWS.FINANCE_RECONCILIATION) {
      result = await executor({
        payment: payload.payment,
        order: payload.order || payload.sale,
        sale: payload.sale,
        transactions: payload.context?.transactions || [],
        handlers,
      });
    } else if (draft.target_workflow === 'commitDocumentLink') {
      result = await executor({ form: payload.form || payload, context, handlers });
    } else if (draft.target_workflow === 'commitCultureHarvest') {
      result = await executor({ form: payload.form || payload.fields || payload, context, handlers });
    } else if (draft.target_workflow === 'commitCommercialSale') {
      result = await executor(payload.records || payload, handlers, context);
    } else {
      result = await executor(payload, handlers);
    }
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
