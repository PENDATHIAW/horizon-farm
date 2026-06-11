import { CheckCircle2 } from 'lucide-react';
import { heyHorizonModuleLabel } from '../services/heyHorizonAssistantService.js';

const STOCK_MODULES = new Set(['stock', 'achats_stock', 'cultures', 'avicole', 'elevage']);
const COMMERCIAL_MODULES = new Set(['commercial', 'ventes', 'clients', 'sales_orders']);
const FINANCE_MODULES = new Set(['finances', 'finance_pilotage', 'payments', 'comptabilite', 'fournisseurs']);
const TRACE_MODULES = new Set(['tracabilite', 'documents', 'centre_ia', 'business_events']);

function buildImpactFlags(modules = []) {
  const keys = new Set(modules);
  return [
    { key: 'stock', label: 'Stock', active: [...keys].some((m) => STOCK_MODULES.has(m)) },
    { key: 'commercial', label: 'Commercial', active: [...keys].some((m) => COMMERCIAL_MODULES.has(m)) },
    { key: 'finance', label: 'Finance', active: [...keys].some((m) => FINANCE_MODULES.has(m)) },
    { key: 'trace', label: 'Traçabilité', active: [...keys].some((m) => TRACE_MODULES.has(m)) || modules.length > 0 },
  ];
}

export default function HeyHorizonDraftSummary({ draft }) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  const fields = draft.draft_fields || {};
  const missing = draft.missing_fields || [];
  const impacted = (draft.impacted_modules || []).map(heyHorizonModuleLabel).filter(Boolean);
  const action = draft.intent_label || draft.ui?.title || draft.intent || 'Action ERP';
  const impacts = buildImpactFlags(draft.impacted_modules || []);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="flex items-center gap-2 font-black"><CheckCircle2 size={15} /> Résumé détecté</p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <span className="sm:col-span-2"><b>Action :</b> {action}</span>
        <span><b>Espace :</b> {heyHorizonModuleLabel(draft.primary_module)}</span>
        {fields.entity_id || fields.target_id || fields.source_id || fields.animal_id ? (
          <span><b>Cible :</b> {fields.entity_id || fields.target_id || fields.source_id || fields.animal_id}</span>
        ) : null}
        {fields.product_name || fields.culture_name ? (
          <span><b>Produit :</b> {fields.product_name || fields.culture_name}</span>
        ) : null}
        {fields.quantity ? (
          <span><b>Quantité :</b> {fields.quantity} {fields.unit || ''}</span>
        ) : null}
        {fields.client_name || fields.supplier_name ? (
          <span><b>Tiers :</b> {fields.client_name || fields.supplier_name}</span>
        ) : null}
        {fields.date || fields.event_date ? (
          <span><b>Date :</b> {fields.date || fields.event_date}</span>
        ) : null}
      </div>
      <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">Impacts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {impacts.map((item) => (
            <span
              key={item.key}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.active ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456] line-through opacity-60'}`}
            >
              {item.active ? '✓' : '○'} {item.label}
            </span>
          ))}
        </div>
        {impacted.length ? (
          <p className="mt-2 text-[11px] text-emerald-800"><b>Modules :</b> {impacted.join(', ')}</p>
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
