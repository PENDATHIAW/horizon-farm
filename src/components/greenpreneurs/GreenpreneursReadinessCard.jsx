import { useMemo } from 'react';
import { Leaf, Sparkles } from 'lucide-react';
import { computeGreenpreneursMetrics } from '../../services/greenpreneurs/greenpreneursMetrics.js';
import { fmtNumber } from '../../utils/format.js';

const STATUS_TONE = {
  pret_dossier: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  pret_renforcer: 'border-amber-300 bg-amber-50 text-amber-900',
  dossier_incomplet: 'border-rose-200 bg-rose-50 text-rose-900',
};

function SourceBadge({ label }) {
  const tone = label === 'ERP réel'
    ? 'bg-emerald-700 text-white'
    : 'bg-amber-600 text-white';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}>
      Source : {label}
    </span>
  );
}

function CriteriaRow({ id, row }) {
  const pct = row.max ? Math.round((row.value / row.max) * 100) : 0;
  return (
    <div key={id} className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-bold text-[#2f2415]">{row.label || id}</span>
        <span className="text-[#8a7456]">{row.value}/{row.max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#eadcc2]/70 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
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
          <p className="flex items-center gap-2 text-sm font-black">
            <Sparkles size={16} /> Greenpreneurs DER/FJ
          </p>
          <p className="text-xl font-black">{readiness.total}/{readiness.maxTotal}</p>
        </div>
        <p className="mt-1 text-xs">{readiness.statusLabel}</p>
        {onNavigate ? (
          <button type="button" onClick={() => onNavigate('investisseurs_forums', { tab: 'Préparation' })} className="mt-2 text-xs font-black underline">
            Voir le détail →
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">{profile.program}</p>
          <h3 className="text-lg font-black text-[#2f2415] flex items-center gap-2 mt-1">
            <Leaf size={18} className="text-emerald-700" />
            Score Greenpreneurs — {readiness.profile.projectName}
          </h3>
          <p className="text-sm text-[#8a7456] mt-1">
            {readiness.profile.ownerName} · {readiness.profile.location}
          </p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-center ${tone}`}>
          <p className="text-3xl font-black">{readiness.total}<span className="text-lg">/{readiness.maxTotal}</span></p>
          <p className="text-xs font-black mt-1">{readiness.statusLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(readiness.criteria || []).map((c) => (
          <CriteriaRow key={c.id} id={c.id} row={{ ...c, ...readiness.score[c.id], label: c.label }} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
          <p className="text-xs font-black uppercase text-emerald-800 mb-2">Points forts</p>
          {readiness.strengths.length ? readiness.strengths.map((s) => (
            <p key={s} className="text-emerald-900 text-xs">✓ {s}</p>
          )) : <p className="text-xs text-[#8a7456]">À construire avec les données ERP.</p>}
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-black uppercase text-amber-800 mb-2">À compléter</p>
          {readiness.gaps.map((g) => (
            <p key={g} className="text-amber-900 text-xs">○ {g}</p>
          ))}
        </div>
      </div>

      {readiness.recommendedActions.length ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
          <p className="text-xs font-black uppercase text-[#8a7456] mb-2">Actions recommandées</p>
          <ul className="space-y-1">
            {readiness.recommendedActions.map((action) => (
              <li key={action} className="text-xs text-[#2f2415]">→ {action}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SourceBadge label={metrics.circular?.sourceLabel || 'Simulation / hypothèse'} />
        <span className="text-[10px] text-[#8a7456] self-center">
          {fmtNumber(metrics.circular?.fluxCount || 0)} flux circulaires · score circularité {metrics.circular?.circularityScore || 0}/100
        </span>
      </div>
    </section>
  );
}
