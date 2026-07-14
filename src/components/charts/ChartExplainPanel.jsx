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
    ? 'text-positive bg-positive-bg border-positive'
    : (insight?.confidence ?? 0) >= 0.62
      ? 'text-horizon-dark bg-vigilance-bg border-vigilance'
      : 'text-slate bg-card border-line';

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-xl border border-horizon-dark/40 bg-card px-3 py-2 text-xs font-semibold text-horizon-dark hover:bg-vigilance-bg transition-colors"
      >
        <Lightbulb size={14} />
        {open ? 'Masquer l\'explication' : 'Expliquer cette courbe'}
      </button>
      <p className="mt-1 text-meta text-slate">Aide à l'interprétation - aucune modification des données.</p>

      {open ? (
        <div className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm text-earth space-y-3">
          {loading ? (
            <p className="text-xs text-slate">Analyse en cours…</p>
          ) : insight ? (
            <>
              <p className="font-semibold leading-relaxed">{insight.summary}</p>

              {insight.priority_action?.action ? (
                <div className="rounded-xl border border-earth/20 bg-earth p-3 text-white">
                  <p className="text-meta font-semibold uppercase tracking-normal text-horizon">Action prioritaire terrain</p>
                  <p className="mt-1 text-sm font-semibold">{insight.priority_action.action}</p>
                  {insight.priority_action.moduleId ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (insight.priority_action.tab) ctx.onNavigate?.(insight.priority_action.moduleId, { tab: insight.priority_action.tab });
                        else ctx.onNavigate?.(insight.priority_action.moduleId);
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-meta font-semibold text-earth"
                    >
                      <ExternalLink size={12} />
                      {insight.priority_action.linkLabel || 'Ouvrir le module'}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {insight.operational_signals?.length ? (
                <div>
                  <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">Signaux opérationnels</p>
                  <div className="mt-2 space-y-2">
                    {insight.operational_signals.map((signal) => (
                      <div key={`${signal.label}-${signal.value}`} className={`rounded-xl border p-3 text-xs ${signal.severity === 'critique' ? 'border-urgent bg-urgent-bg text-urgent' : signal.severity === 'warn' ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-line bg-white text-earth'}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{signal.label}</p>
                            <p className="mt-1">{signal.value}</p>
                            {signal.action ? <p className="mt-1 text-meta opacity-90">{signal.action}</p> : null}
                          </div>
                          {signal.moduleId ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (signal.tab) ctx.onNavigate?.(signal.moduleId, { tab: signal.tab });
                                else ctx.onNavigate?.(signal.moduleId);
                              }}
                              className="shrink-0 rounded-lg border border-current/20 bg-white/80 px-2 py-1 text-meta font-semibold"
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
                  <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">Causes probables</p>
                  <ul className="mt-1 list-disc pl-6 text-xs text-slate space-y-1">
                    {insight.probable_causes.map((cause) => (
                      <li key={cause}>{cause}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className={`inline-flex rounded-lg border px-2 py-1 text-meta font-semibold ${confidenceTone}`}>
                Confiance : {insight.confidence_label} ({Math.round((insight.confidence || 0) * 100)} %)
              </p>

              {insight.recommended_actions?.length ? (
                <div>
                  <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">Actions recommandées</p>
                  <ul className="mt-1 list-disc pl-6 text-xs text-slate space-y-1">
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
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-meta font-semibold text-earth hover:bg-vigilance-bg"
                    >
                      <ExternalLink size={12} />
                      {link.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {insight.warnings?.length ? (
                <p className="text-meta text-slate">{insight.warnings.join(' ')}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
