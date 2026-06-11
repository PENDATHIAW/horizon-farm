import { heyHorizonModuleLabel } from '../services/heyHorizonAssistantService.js';
import { HORIZON } from '../modules/assistant/horizonDesignTokens.js';

const STOCK_MODULES = new Set(['stock', 'achats_stock', 'cultures', 'avicole', 'elevage']);
const COMMERCIAL_MODULES = new Set(['commercial', 'ventes', 'clients', 'sales_orders']);
const FINANCE_MODULES = new Set(['finances', 'finance_pilotage', 'payments', 'comptabilite', 'fournisseurs']);
const TRACE_MODULES = new Set(['tracabilite', 'documents', 'centre_ia', 'business_events']);

function buildImpactFlags(modules = []) {
  const keys = new Set(modules);
  return [
    { label: 'Stock', active: [...keys].some((m) => STOCK_MODULES.has(m)) },
    { label: 'Commercial', active: [...keys].some((m) => COMMERCIAL_MODULES.has(m)) },
    { label: 'Finance', active: [...keys].some((m) => FINANCE_MODULES.has(m)) },
    { label: 'Traçabilité', active: [...keys].some((m) => TRACE_MODULES.has(m)) || modules.length > 0 },
  ];
}

export default function HeyHorizonDraftSummary({ draft, variant = 'inline' }) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  const fields = draft.draft_fields || {};
  const missing = draft.missing_fields || [];
  const action = draft.intent_label || draft.ui?.title || draft.intent || 'Action détectée';
  const impacts = buildImpactFlags(draft.impacted_modules || []);
  const details = [
    fields.product_name || fields.culture_name,
    fields.quantity ? `${fields.quantity} ${fields.unit || ''}`.trim() : null,
    fields.client_name || fields.supplier_name,
    fields.payment_amount ? `${fields.payment_amount} FCFA` : null,
    fields.date || fields.event_date,
  ].filter(Boolean).join(' · ');

  const isInline = variant === 'inline';

  return (
    <div
      className={isInline ? 'text-sm' : 'rounded-2xl border p-4 text-sm'}
      style={isInline ? { color: HORIZON.text } : { borderColor: HORIZON.border, background: HORIZON.surface, color: HORIZON.text }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: HORIZON.secondary }}>
        Résumé détecté
      </p>
      <p className="mt-2 font-medium leading-relaxed">{action}</p>
      {details ? <p className="mt-1 text-xs leading-relaxed" style={{ color: HORIZON.textMuted }}>{details}</p> : null}
      <p className="mt-1 text-xs" style={{ color: HORIZON.textMuted }}>
        {heyHorizonModuleLabel(draft.primary_module)}
      </p>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: HORIZON.secondary }}>
          Impacts
        </p>
        <ul className="mt-2 space-y-1">
          {impacts.map((item) => (
            <li key={item.label} className="text-sm" style={{ color: item.active ? HORIZON.text : HORIZON.textMuted }}>
              {item.active ? '✓' : '○'} {item.label}
            </li>
          ))}
        </ul>
      </div>

      {missing.length ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: HORIZON.textMuted }}>
          À compléter : {missing.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
