/**
 * Pont brouillon AI Gateway ↔ Hey Horizon (openForm / draftToFormRequest).
 */

import { draftToFormRequest } from '../aiRecommendationsService.js';


export function gatewayDraftToLegacyHeyDraft(gatewayDraft = {}) {
  if (gatewayDraft.draft?.legacy_hey) return gatewayDraft.draft.legacy_hey;
  const inner = gatewayDraft.draft || {};
  return {
    status: gatewayDraft.status || 'awaiting_validation',
    intent: gatewayDraft.intent,
    confidence: gatewayDraft.confidence,
    raw_input: gatewayDraft.raw_input || '',
    primary_module: inner.primary_module || inner.module || null,
    form_type: inner.form_type || gatewayDraft.intent,
    requires_validation: gatewayDraft.required_validation !== false,
    missing_fields: gatewayDraft.missing_fields || [],
    warnings: gatewayDraft.warnings || [],
    draft_fields: inner.fields || inner.draft_fields || inner.payload || {},
    impacted_modules: inner.impacted_modules || [],
    proposed_actions: inner.proposed_actions || [],
    ui: inner.ui || {
      title: inner.title || gatewayDraft.intent,
      subtitle: inner.subtitle || 'À valider avant enregistrement',
    },
  };
}

const INTENT_FORM_MAP = {
  sale_record: { type: 'vente', route: 'commercial' },
  egg_production: { type: 'elevage', route: 'elevage' },
  health_action: { type: 'elevage', route: 'elevage' },
  feeding_distribution: { type: 'elevage', route: 'elevage' },
  purchase_stock: { type: 'achat_stock', route: 'achats_stock' },
  task_creation: { type: 'suivi', route: 'activite_suivi' },
};

/**
 * Équivalent enrichi de draftToFormRequest pour brouillons gateway / Hey Horizon.
 */
export function gatewayDraftToFormRequest(gatewayDraft = {}) {
  const legacy = gatewayDraftToLegacyHeyDraft(gatewayDraft);
  const mapped = INTENT_FORM_MAP[legacy.intent] || { type: 'decision', route: legacy.primary_module || 'assistant_erp' };
  const recoShape = {
    type: mapped.type,
    route: legacy.primary_module || mapped.route,
    action: legacy.ui?.title || legacy.intent,
    text: legacy.raw_input,
    confidence_score: Math.round((gatewayDraft.confidence || legacy.confidence || 0.8) * 100),
    estimation: {
      qte: legacy.draft_fields?.quantity ?? legacy.draft_fields?.quantite ?? legacy.draft_fields?.eggs_count,
      montant: legacy.draft_fields?.amount ?? legacy.draft_fields?.payment_amount ?? legacy.draft_fields?.montant,
    },
  };
  const formRequest = draftToFormRequest(recoShape);
  return {
    module: legacy.primary_module || formRequest.module,
    draft: legacy,
    formRequest,
    openForm: {
      module: legacy.primary_module || formRequest.module,
      form_type: legacy.form_type,
      title: legacy.ui?.title,
      fields: legacy.draft_fields,
    },
  };
}
