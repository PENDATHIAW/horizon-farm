import { useMemo } from 'react';
import { Leaf, Sparkles } from 'lucide-react';
import { computeGreenpreneursMetrics } from '../../services/greenpreneurs/greenpreneursMetrics.js';
import { fmtNumber } from '../../utils/format.js';

const STATUS_TONE = {
  pret_dossier: 'border-positive bg-positive-bg text-positive',
  pret_renforcer: 'border-vigilance bg-vigilance-bg text-horizon-dark',
  dossier_incomplet: 'border-urgent bg-urgent-bg text-urgent',
};

function SourceBadge({ label }) {
  const tone = label === 'ERP réel'
    ? 'bg-positive text-white'
    : 'bg-vigilance text-white';
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-meta font-semibold uppercase tracking-normal ${tone}`}>
      Source : {label}
    </span>
  );
}

function CriteriaRow({ id, row }) {
  const pct = row.max ? Math.round((row.value / row.max) * 100) : 0;
  return (
    <div key={id} className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-earth">{row.label || id}</span>
        <span className="text-slate">{row.value}/{row.max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-line/70 overflow-hidden">
        <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GreenpreneursReadinessCard({
  dataMap = {},
  simulatedMode = false,
  compact = false,
  onNavigate,
}) {
  const metrics = useMemo(
    () => computeGreenpreneursMetrics(dataMap, { simulatedMode }),
    [dataMap, simulatedMode],
  );
  const { readiness, profile } = metrics;
  const tone = STATUS_TONE[readiness.status] || STATUS_TONE.dossier_incomplet;

  if (compact) {
    return (
      <div className={`rounded-2xl border p-4 ${tone}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} /> Greenpreneurs DER/FJ
          </p>
          <p className="text-xl font-semibold">{readiness.total}/{readiness.maxTotal}</p>
        </div>
        <p className="mt-1 text-xs">{readiness.statusLabel}</p>
        {onNavigate ? (
          <button type="button" onClick={() => onNavigate('financements', { tab: 'Préparation' })} className="mt-2 text-xs font-semibold underline">
            Voir le détail →
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold">{profile.program}</p>
          <h3 className="text-lg font-semibold text-earth flex items-center gap-2 mt-1">
            <Leaf size={18} className="text-positive" />
            Score Greenpreneurs — {readiness.profile.projectName}
          </h3>
          <p className="text-sm text-slate mt-1">
            {readiness.profile.ownerName} · {readiness.profile.location}
          </p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-center ${tone}`}>
          <p className="text-3xl font-semibold">{readiness.total}<span className="text-lg">/{readiness.maxTotal}</span></p>
          <p className="text-xs font-semibold mt-1">{readiness.statusLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(readiness.criteria || []).map((c) => (
          <CriteriaRow key={c.id} id={c.id} row={{ ...c, ...readiness.score[c.id], label: c.label }} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-positive bg-positive-bg p-3">
          <p className="text-xs font-semibold uppercase text-positive mb-2">Points forts</p>
          {readiness.strengths.length ? readiness.strengths.map((s) => (
            <p key={s} className="text-positive text-xs">✓ {s}</p>
          )) : <p className="text-xs text-slate">À construire avec les données ERP.</p>}
        </div>
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3">
          <p className="text-xs font-semibold uppercase text-horizon-dark mb-2">À compléter</p>
          {readiness.gaps.map((g) => (
            <p key={g} className="text-horizon-dark text-xs">○ {g}</p>
          ))}
        </div>
      </div>

      {readiness.recommendedActions.length ? (
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="text-xs font-semibold uppercase text-slate mb-2">Actions recommandées</p>
          <ul className="space-y-1">
            {readiness.recommendedActions.map((action) => (
              <li key={action} className="text-xs text-earth">→ {action}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SourceBadge label={metrics.circular?.sourceLabel || 'Simulation / hypothèse'} />
        <span className="text-meta text-slate self-center">
          {fmtNumber(metrics.circular?.fluxCount || 0)} flux circulaires · score circularité {metrics.circular?.circularityScore || 0}/100
        </span>
      </div>
    </section>
  );
}
