/**
 * Garde-fous : l'IA ne peut pas écrire en base ni contourner les workflows métier.
 */

import {
  TARGET_WORKFLOWS,
  clampConfidence,
  isExecutableWorkflow,
} from './aiActionDrafts.js';

/** Seuil en dessous duquel la validation utilisateur est toujours obligatoire. */
export const LOW_CONFIDENCE_THRESHOLD = 0.65;

/** Seuil en dessous duquel l'exécution est refusée même si « validé » côté UI. */
export const BLOCK_EXECUTION_CONFIDENCE = 0.35;

const arr = (value) => (Array.isArray(value) ? value : []);

/** Clés de handlers interdites en entrée directe depuis l'IA (contournement workflow). */
export const FORBIDDEN_DIRECT_HANDLER_KEYS = [
  'onCreateFinanceTransaction',
  'onUpdateFinanceTransaction',
  'onDeleteFinanceTransaction',
  'onCreateStock',
  'onUpdateStock',
  'onDeleteStock',
  'onCreateSale',
  'onUpdateSale',
  'onCreatePayment',
  'onUpdatePayment',
  'onCreateAnimal',
  'onUpdateAnimal',
  'onCreateLot',
  'onUpdateLot',
  'onCreateHealthRecord',
  'onCreateDocument',
  'onBulkInsert',
  'onBulkUpdate',
  'supabaseInsert',
  'supabaseUpdate',
  'supabaseDelete',
  'directWrite',
  'bypassWorkflow',
];

/** Seuls ces identifiants peuvent être passés à executeValidatedDraft. */
export const ALLOWED_WORKFLOW_EXECUTORS = new Set([
  TARGET_WORKFLOWS.PURCHASE,
  TARGET_WORKFLOWS.STOCK_PURCHASE,
  TARGET_WORKFLOWS.SALE,
  TARGET_WORKFLOWS.COMMERCIAL_SALE,
  TARGET_WORKFLOWS.SALE_PAYMENT,
  TARGET_WORKFLOWS.FEEDING,
  TARGET_WORKFLOWS.HEALTH,
  TARGET_WORKFLOWS.BIOSECURITY,
  TARGET_WORKFLOWS.HARVEST,
  TARGET_WORKFLOWS.HARVEST_LEGACY,
  TARGET_WORKFLOWS.DOCUMENT_LINK,
  TARGET_WORKFLOWS.EQUIPMENT,
  TARGET_WORKFLOWS.ALERT_ACTION,
]);

export function containsForbiddenDirectHandlers(payload = {}) {
  const keys = new Set([
    ...Object.keys(payload.handlers || {}),
    ...Object.keys(payload.direct_handlers || {}),
    ...Object.keys(payload),
  ]);
  return FORBIDDEN_DIRECT_HANDLER_KEYS.some((k) => keys.has(k));
}

export function assessDraftSafety(draft = {}) {
  const confidence = clampConfidence(draft.confidence);
  const missing = arr(draft.missing_fields);
  const warnings = arr(draft.warnings);
  const reasons = [];

  if (containsForbiddenDirectHandlers(draft.draft || draft)) {
    reasons.push('forbidden_direct_handlers');
  }

  if (draft.direct_write === true || draft.draft?.direct_write === true) {
    reasons.push('direct_write_flag');
  }

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    reasons.push('low_confidence');
  }

  if (missing.length > 0) {
    reasons.push('missing_fields');
  }

  if (draft.confirmation_required || draft.status === 'draft_incomplete') {
    reasons.push('confirmation_required');
  }

  if (!isExecutableWorkflow(draft.target_workflow) && draft.target_workflow !== TARGET_WORKFLOWS.OPEN_FORM) {
    if (draft.target_workflow === TARGET_WORKFLOWS.INSIGHT_ONLY) {
      reasons.push('insight_only_no_execution');
    }
  }

  const requiresValidation =
    draft.required_validation !== false
    || confidence < LOW_CONFIDENCE_THRESHOLD
    || missing.length > 0
    || draft.confirmation_required === true;

  const canExecute =
    reasons.filter((r) => r !== 'insight_only_no_execution').length === 0
    && draft.user_validated === true
    && !requiresValidation
    && confidence >= BLOCK_EXECUTION_CONFIDENCE
    && isExecutableWorkflow(draft.target_workflow);

  return {
    confidence,
    requiresValidation,
    canExecute,
    needsConfirmation: reasons.includes('confirmation_required') || reasons.includes('missing_fields') || reasons.includes('low_confidence'),
    blockedReasons: reasons,
    safeForDisplay: !reasons.includes('forbidden_direct_handlers') && !reasons.includes('direct_write_flag'),
  };
}

/**
 * Valide qu'un brouillon peut être présenté ; ne autorise jamais l'écriture directe.
 */
export function validateDraftForExecution(draft = {}) {
  const assessment = assessDraftSafety(draft);

  if (!assessment.safeForDisplay) {
    return {
      ok: false,
      error: 'Les brouillons IA ne peuvent pas contenir de handlers d\'écriture directe.',
      assessment,
    };
  }

  if (draft.target_workflow === TARGET_WORKFLOWS.INSIGHT_ONLY) {
    return {
      ok: false,
      error: 'Ce brouillon est informatif uniquement (insight_only).',
      assessment,
    };
  }

  if (!draft.user_validated) {
    return {
      ok: false,
      error: 'Validation utilisateur requise avant exécution.',
      assessment,
    };
  }

  if (assessment.requiresValidation) {
    return {
      ok: false,
      error: assessment.needsConfirmation
        ? 'Données ambiguës ou incomplètes : confirmation utilisateur requise.'
        : 'Confiance insuffisante : validation obligatoire.',
      assessment,
    };
  }

  if (!ALLOWED_WORKFLOW_EXECUTORS.has(draft.target_workflow)) {
    return {
      ok: false,
      error: `Workflow non autorisé pour exécution automatique : ${draft.target_workflow}`,
      assessment,
    };
  }

  if (!assessment.canExecute) {
    return {
      ok: false,
      error: 'Exécution refusée par les garde-fous IA.',
      assessment,
    };
  }

  return { ok: true, assessment };
}

/**
 * Refuse toute tentative d'appel CRUD direct depuis la couche IA.
 */
export function assertNoDirectDatabaseWrite(action = {}) {
  const type = String(action.type || action.kind || '').toLowerCase();
  const blocked = ['insert', 'update', 'delete', 'upsert', 'bulk_write', 'raw_sql'];
  if (blocked.includes(type) || action.direct_write === true) {
    throw new Error('AI_GATEWAY_DIRECT_WRITE_FORBIDDEN');
  }
  if (containsForbiddenDirectHandlers(action)) {
    throw new Error('AI_GATEWAY_FORBIDDEN_HANDLERS');
  }
}

export function guardWorkflowExecutor(targetWorkflow = '') {
  if (!ALLOWED_WORKFLOW_EXECUTORS.has(targetWorkflow)) {
    return {
      allowed: false,
      reason: targetWorkflow === TARGET_WORKFLOWS.OPEN_FORM
        ? 'open_form_requires_ui'
        : 'workflow_not_in_allowlist',
    };
  }
  return { allowed: true };
}
