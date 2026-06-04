/**
 * Contrat standard des brouillons IA — aucune écriture base sans validation utilisateur.
 */

export const AI_DRAFT_VERSION = '1.0';

/** Workflows métier autorisés pour l'exécution post-validation. */
export const TARGET_WORKFLOWS = {
  PURCHASE: 'commitPurchaseWorkflow',
  STOCK_PURCHASE: 'commitStockPurchaseWorkflow',
  SALE: 'commitSaleWorkflow',
  COMMERCIAL_SALE: 'commitCommercialSale',
  SALE_PAYMENT: 'recordSalePayment',
  FEEDING: 'commitFeedingWorkflow',
  HEALTH: 'commitHealthWorkflow',
  BIOSECURITY: 'commitBiosecurityWorkflow',
  HARVEST: 'commitCultureHarvest',
  HARVEST_LEGACY: 'commitHarvestWorkflow',
  DOCUMENT_LINK: 'commitDocumentLink',
  EQUIPMENT: 'commitEquipmentWorkflow',
  ALERT_ACTION: 'commitAlertActionWorkflow',
  FINANCE_RECONCILIATION: 'commitFinanceReconciliationRepair',
  INSIGHT_ONLY: 'insight_only',
  OPEN_FORM: 'open_form',
};

export const AI_DRAFT_SOURCES = {
  HEY_HORIZON: 'hey_horizon',
  VOICE: 'voice_command',
  DOCUMENT: 'document_understanding',
  CHART: 'chart_insight',
  COMMERCIAL: 'commercial_content',
  RECONCILIATION: 'smart_reconciliation',
  HEALTH_ENGINE: 'erp_health_engine',
  WHATSAPP: 'whatsapp_horizon',
  MANUAL: 'manual',
};

const arr = (value) => (Array.isArray(value) ? value : []);

export function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * @typedef {Object} AiActionDraft
 * @property {string} intent
 * @property {number} confidence
 * @property {string} source
 * @property {Record<string, unknown>} draft
 * @property {string} target_workflow
 * @property {boolean} required_validation
 * @property {string[]} warnings
 * @property {string[]} missing_fields
 * @property {string} [id]
 * @property {string} [status]
 * @property {boolean} [user_validated]
 * @property {boolean} [confirmation_required]
 * @property {string} [raw_input]
 */

/**
 * Crée un brouillon structuré conforme au contrat gateway.
 */
export function createAiActionDraft({
  intent = 'unknown',
  confidence = 0.5,
  source = AI_DRAFT_SOURCES.MANUAL,
  draft = {},
  target_workflow = TARGET_WORKFLOWS.INSIGHT_ONLY,
  required_validation = true,
  warnings = [],
  missing_fields = [],
  status = 'draft',
  raw_input = '',
  confirmation_required = false,
  user_validated = false,
  meta = {},
} = {}) {
  const conf = clampConfidence(confidence);
  const missing = arr(missing_fields);
  const needsConfirm = confirmation_required || missing.length > 0 || conf < 0.65;

  return {
    version: AI_DRAFT_VERSION,
    id: meta.id || `ai-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    intent: String(intent || 'unknown'),
    confidence: conf,
    source: String(source || AI_DRAFT_SOURCES.MANUAL),
    draft: draft && typeof draft === 'object' ? { ...draft } : {},
    target_workflow: String(target_workflow || TARGET_WORKFLOWS.INSIGHT_ONLY),
    required_validation: required_validation !== false,
    warnings: arr(warnings).map((w) => String(w)),
    missing_fields: missing.map((f) => String(f)),
    status: String(status || 'draft'),
    raw_input: String(raw_input || ''),
    confirmation_required: needsConfirm,
    user_validated: Boolean(user_validated),
    created_at: new Date().toISOString(),
    ...meta,
  };
}

/** Map intent Hey Horizon / formulaire → workflow cible. */
export const INTENT_TO_WORKFLOW = {
  purchase_stock: TARGET_WORKFLOWS.PURCHASE,
  stock_purchase: TARGET_WORKFLOWS.PURCHASE,
  sale_record: TARGET_WORKFLOWS.SALE,
  health_action: TARGET_WORKFLOWS.HEALTH,
  culture_harvest: TARGET_WORKFLOWS.HARVEST,
  supplier_invoice: TARGET_WORKFLOWS.DOCUMENT_LINK,
  finance_entry: TARGET_WORKFLOWS.OPEN_FORM,
  task_creation: TARGET_WORKFLOWS.OPEN_FORM,
  egg_production: TARGET_WORKFLOWS.OPEN_FORM,
  feeding_distribution: TARGET_WORKFLOWS.FEEDING,
  mortality_event: TARGET_WORKFLOWS.HEALTH,
  equipment_action: TARGET_WORKFLOWS.EQUIPMENT,
  financing_file: TARGET_WORKFLOWS.OPEN_FORM,
};

export function resolveTargetWorkflow(intent = '', formType = '') {
  const key = String(intent || formType || '').trim();
  return INTENT_TO_WORKFLOW[key] || TARGET_WORKFLOWS.OPEN_FORM;
}

/**
 * Normalise un brouillon legacy (Hey Horizon / aiIntentEngine) vers le contrat gateway.
 */
export function normalizeLegacyDraft(legacy = {}, options = {}) {
  const intent = legacy.intent || legacy.form_type || 'unknown';
  const fields = legacy.draft_fields || legacy.fields || legacy.draft || {};
  const missing = arr(legacy.missing_fields);
  const target = options.target_workflow || resolveTargetWorkflow(intent, legacy.form_type);

  return createAiActionDraft({
    intent,
    confidence: legacy.confidence ?? (missing.length ? 0.55 : 0.86),
    source: options.source || AI_DRAFT_SOURCES.HEY_HORIZON,
    draft: {
      primary_module: legacy.primary_module,
      form_type: legacy.form_type,
      fields,
      preview: legacy.preview,
      impacted_modules: legacy.impacted_modules,
    },
    target_workflow: target,
    required_validation: legacy.requires_validation !== false,
    warnings: legacy.warnings,
    missing_fields: missing,
    status: legacy.status || (missing.length ? 'draft_incomplete' : 'awaiting_validation'),
    raw_input: legacy.raw_input || '',
    confirmation_required: missing.length > 0 || legacy.status === 'draft_incomplete',
    meta: { legacy: true },
  });
}

export function isExecutableWorkflow(targetWorkflow = '') {
  const w = String(targetWorkflow || '');
  return w && w !== TARGET_WORKFLOWS.INSIGHT_ONLY && w !== TARGET_WORKFLOWS.OPEN_FORM;
}

export function markDraftValidated(draft = {}, { userId = '' } = {}) {
  return {
    ...draft,
    user_validated: true,
    validated_at: new Date().toISOString(),
    validated_by: userId || 'user',
    status: 'validated',
    required_validation: false,
  };
}
