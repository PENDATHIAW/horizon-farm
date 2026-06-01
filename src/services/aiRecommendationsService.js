import { computeErpAuditFindings } from './erpRules/index.js';
import { runErpHealthEngine } from './erpHealthEngine.js';
import { supabase } from '../lib/supabase.js';
import { buildIssueKey } from './issueLinkingService.js';

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

const ASSISTANT_EVENT_PREFIXES = ['assistant_', 'hey_horizon'];

/** Fusionne journal local + événements métier assistant_erp. */
export function buildAssistantJournal({ localEntries = [], businessEvents = [] } = {}) {
  const fromEvents = (Array.isArray(businessEvents) ? businessEvents : [])
    .filter((evt) => {
      const module = String(evt.module_source || evt.source_module || '');
      const type = String(evt.event_type || '');
      return module === 'assistant_erp' || ASSISTANT_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix));
    })
    .map((evt) => ({
      type: 'event',
      action: evt.title || evt.event_type,
      text: evt.description || evt.title,
      module: evt.module_source || evt.entity_type,
      confidence_score: null,
      saved_at: evt.created_at || evt.event_date,
      source: 'erp',
    }));
  const local = (Array.isArray(localEntries) ? localEntries : []).map((entry) => ({ ...entry, source: 'local' }));
  return [...local, ...fromEvents]
    .sort((a, b) => new Date(b.saved_at || 0).getTime() - new Date(a.saved_at || 0).getTime())
    .slice(0, 24);
}

/** Génère des recommandations depuis le Health Engine (cohérence, risques, prédictions, UX). */
export function buildRecommendationsFromData(data = {}) {
  const health = runErpHealthEngine(data);
  return health.findings.slice(0, 50).map((finding) => ({
    issue_key: finding.issue_key || buildIssueKey({
      domain: finding.category || finding.module || 'ia_reco',
      sourceModule: finding.module || finding.source_records?.[0]?.type || 'assistant_erp',
      sourceRecordId: finding.source_records?.[0]?.id || finding.id || 'unknown',
      kind: finding.recommended_action || finding.title || 'recommendation',
    }),
    id: finding.id,
    title: finding.title,
    summary: finding.description || '',
    recommendation_type: finding.category || finding.module,
    module_target: finding.module,
    priority: finding.severity,
    status: 'nouvelle',
    reasoning: finding.description || '',
    action_recommandee: finding.recommended_action,
    confidence_score: Math.round((finding.confidence_score || 0.8) * 100),
    source_data: { source_records: finding.source_records || [] },
    source_module: finding.module || finding.source_records?.[0]?.type || 'assistant_erp',
    source_record_id: finding.source_records?.[0]?.id || finding.id || '',
    related_module: finding.module || 'assistant_erp',
    related_record_id: finding.source_records?.[0]?.id || finding.id || '',
    origin_type: 'ia_suggestion',
    created_by_ai: true,
    auto_action: finding.auto_action,
  }));
}

/** Mappe un brouillon Hey Horizon vers openFormModal. */
export function draftToFormRequest(draft = {}) {
  const typeMap = {
    vente: { module: 'commercial', form_type: 'sale_record' },
    achat_stock: { module: 'achats_stock', form_type: 'stock_movement' },
    elevage: { module: 'elevage', form_type: 'animal_action' },
    maintenance: { module: 'rh', form_type: 'maintenance' },
    finance: { module: 'finance_pilotage', form_type: 'finance_transaction' },
    suivi: { module: 'activite_suivi', form_type: 'task' },
    document: { module: 'documents_rapports', form_type: 'document' },
    decision: { module: 'objectifs_croissance', form_type: 'decision' },
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

/** Charge les recommandations persistées depuis Supabase (Phase 1). */
export async function loadSupabaseRecommendations(limit = 50) {
  const { data, error } = await supabase
    .from('ai_recommendations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, rows: [], error: error.message };
  return { ok: true, rows: data || [] };
}

/** Upsert des recommandations IA générées depuis les règles métier. */
export async function syncRecommendationsToSupabase(data = {}) {
  const recommendations = buildRecommendationsFromData(data);
  if (!recommendations.length) return { ok: true, synced: 0 };
  const { error } = await supabase.from('ai_recommendations').upsert(
    recommendations.map((row) => ({
      ...row,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' },
  );
  if (error) return { ok: false, synced: 0, error: error.message };
  recommendations.forEach((row) => saveLocalRecommendation(row));
  return { ok: true, synced: recommendations.length };
}

/** Met à jour le statut d'une recommandation IA. */
export async function updateRecommendationStatus(id, status, extra = {}) {
  const { error } = await supabase
    .from('ai_recommendations')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
