import { computeErpAuditFindings } from './erpRules/index.js';

const STORAGE_KEY = 'horizon-ai-recommendations-journal';

export function loadLocalRecommendations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalRecommendation(entry) {
  const journal = loadLocalRecommendations();
  journal.unshift({ ...entry, saved_at: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(journal.slice(0, 200)));
  return journal;
}

/** Génère des recommandations depuis les règles métier (Phase 1). */
export function buildRecommendationsFromData(data = {}) {
  return computeErpAuditFindings(data).map((finding) => ({
    id: finding.id,
    title: finding.title,
    summary: finding.description || '',
    recommendation_type: finding.module,
    module_target: finding.module,
    priority: finding.severity,
    status: 'nouvelle',
    reasoning: finding.description || '',
    action_recommandee: finding.recommended_action,
    confidence_score: Math.round((finding.confidence_score || 0.8) * 100),
    source_data: { source_records: finding.source_records || [] },
    created_by_ai: true,
  }));
}

/** Mappe un brouillon Hey Horizon vers openFormModal. */
export function draftToFormRequest(draft = {}) {
  const typeMap = {
    vente: { module: 'ventes', form_type: 'sale_record' },
    achat_stock: { module: 'stock', form_type: 'stock_movement' },
    elevage: { module: 'animaux', form_type: 'animal_action' },
    maintenance: { module: 'equipements', form_type: 'maintenance' },
    finance: { module: 'finances', form_type: 'finance_transaction' },
    suivi: { module: 'taches', form_type: 'task' },
    document: { module: 'documents', form_type: 'document' },
    decision: { module: 'centre_ia', form_type: 'decision' },
  };
  const mapped = typeMap[draft.type] || typeMap.decision;
  return {
    module: draft.route || mapped.module,
    draft: {
      ...mapped,
      intent_label: draft.action,
      status: 'draft_ready',
      draft_fields: {
        qte: draft.estimation?.qte,
        montant: draft.estimation?.montant,
        text: draft.text,
      },
      confidence_score: draft.confidence_score,
    },
  };
}
