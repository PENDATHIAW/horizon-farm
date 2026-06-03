import { useMemo, useState } from 'react';
import { Lightbulb, ExternalLink } from 'lucide-react';
import { useChartExplainContext } from './chartExplainContext.jsx';
import { explainChartCurve } from '../../services/aiGateway/chartExplainService.js';

export default function ChartExplainPanel({ payload, disabled = false }) {
  const ctx = useChartExplainContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const insight = useMemo(() => {
    if (!open || !payload) return null;
    return explainChartCurve({
      ...payload,
      moduleId: ctx.moduleId,
      context: {
        stocks: ctx.stocks,
        salesOrders: ctx.salesOrders,
        payments: ctx.payments,
        transactions: ctx.transactions,
        sante: ctx.sante,
        vaccins: ctx.vaccins,
        businessEvents: ctx.businessEvents,
        taches: ctx.taches,
        alertes: ctx.alertes,
        productionLogs: ctx.productionLogs,
        alimentationLogs: ctx.alimentationLogs,
      },
    });
  }, [open, payload, ctx]);

  if (!ctx.enabled || disabled || !payload) return null;

  const handleClick = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    setLoading(false);
  };

  const confidenceTone = (insight?.confidence ?? 0) >= 0.82
    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
    : (insight?.confidence ?? 0) >= 0.62
      ? 'text-amber-900 bg-amber-50 border-amber-200'
      : 'text-[#5f4b2f] bg-[#fffdf8] border-[#eadcc2]';

  return (
    <div className="mt-3 border-t border-[#eadcc2] pt-3">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-xl border border-[#9a6b12]/40 bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#9a6b12] hover:bg-[#f5ecd8] transition-colors"
      >
        <Lightbulb size={14} />
        {open ? 'Masquer l\'explication' : 'Expliquer cette courbe'}
      </button>
      <p className="mt-1 text-[10px] text-[#8a7456]">Aide à l'interprétation — aucune modification des données.</p>

      {open ? (
        <div className="mt-3 rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 text-sm text-[#2f2415] space-y-3">
          {loading ? (
            <p className="text-xs text-[#8a7456]">Analyse en cours…</p>
          ) : insight ? (
            <>
              <p className="font-semibold leading-relaxed">{insight.summary}</p>

              {insight.priority_action?.action ? (
                <div className="rounded-xl border border-[#2f2415]/20 bg-[#2f2415] p-3 text-white">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#ffd86b]">Action prioritaire terrain</p>
                  <p className="mt-1 text-sm font-bold">{insight.priority_action.action}</p>
                  {insight.priority_action.moduleId ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (insight.priority_action.tab) ctx.onNavigate?.(insight.priority_action.moduleId, { tab: insight.priority_action.tab });
                        else ctx.onNavigate?.(insight.priority_action.moduleId);
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-[#2f2415]"
                    >
                      <ExternalLink size={12} />
                      {insight.priority_action.linkLabel || 'Ouvrir le module'}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {insight.operational_signals?.length ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12]">Signaux opérationnels</p>
                  <div className="mt-2 space-y-2">
                    {insight.operational_signals.map((signal) => (
                      <div key={`${signal.label}-${signal.value}`} className={`rounded-xl border p-3 text-xs ${signal.severity === 'critique' ? 'border-red-200 bg-red-50 text-red-900' : signal.severity === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-[#eadcc2] bg-white text-[#2f2415]'}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-black">{signal.label}</p>
                            <p className="mt-0.5">{signal.value}</p>
                            {signal.action ? <p className="mt-1 text-[11px] opacity-90">{signal.action}</p> : null}
                          </div>
                          {signal.moduleId ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (signal.tab) ctx.onNavigate?.(signal.moduleId, { tab: signal.tab });
                                else ctx.onNavigate?.(signal.moduleId);
                              }}
                              className="shrink-0 rounded-lg border border-current/20 bg-white/80 px-2 py-1 text-[11px] font-bold"
                            >
                              {signal.linkLabel || 'Agir'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {insight.probable_causes?.length ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12]">Causes probables</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-[#5f4b2f] space-y-1">
                    {insight.probable_causes.map((cause) => (
                      <li key={cause}>{cause}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-bold ${confidenceTone}`}>
                Confiance : {insight.confidence_label} ({Math.round((insight.confidence || 0) * 100)} %)
              </p>

              {insight.recommended_actions?.length ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9a6b12]">Actions recommandées</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-[#5f4b2f] space-y-1">
                    {insight.recommended_actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {insight.module_links?.length ? (
                <div className="flex flex-wrap gap-2">
                  {insight.module_links.map((link) => (
                    <button
                      key={`${link.moduleId}-${link.tab}`}
                      type="button"
                      onClick={() => {
                        if (link.tab) ctx.onNavigate?.(link.moduleId, { tab: link.tab });
                        else ctx.onNavigate?.(link.moduleId);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-[11px] font-bold text-[#2f2415] hover:bg-[#f5ecd8]"
                    >
                      <ExternalLink size={12} />
                      {link.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {insight.warnings?.length ? (
                <p className="text-[11px] text-[#8a7456]">{insight.warnings.join(' ')}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
