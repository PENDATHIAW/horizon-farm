import { CheckCircle2 } from 'lucide-react';
import { heyHorizonModuleLabel } from '../services/heyHorizonAssistantService.js';

export default function HeyHorizonDraftSummary({ draft }) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  const fields = draft.draft_fields || {};
  const missing = draft.missing_fields || [];
  const impacted = (draft.impacted_modules || []).map(heyHorizonModuleLabel).filter(Boolean);
  const action = draft.intent_label || draft.intent || draft.action || 'Action ERP';
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="flex items-center gap-2 font-black"><CheckCircle2 size={15} /> Ce que Horizon a compris</p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <span><b>Action :</b> {action}</span>
        <span><b>Espace :</b> {heyHorizonModuleLabel(draft.primary_module)}</span>
        {fields.entity_id || fields.target_id || fields.source_id || fields.animal_id ? (
          <span><b>Cible :</b> {fields.entity_id || fields.target_id || fields.source_id || fields.animal_id}</span>
        ) : null}
        {fields.date || fields.event_date ? (
          <span><b>Date :</b> {fields.date || fields.event_date}</span>
        ) : null}
        {impacted.length ? (
          <span className="sm:col-span-2"><b>Impacts :</b> {impacted.join(', ')}</span>
        ) : null}
      </div>
      {missing.length ? (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <b>À compléter :</b> {missing.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
