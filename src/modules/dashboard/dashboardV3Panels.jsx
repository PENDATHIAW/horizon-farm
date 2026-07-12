import { useState } from 'react';
import { ArrowRight, LineChart, MicOff, Presentation, TrendingDown, TrendingUp, Volume2, X } from 'lucide-react';
import { launchHeyHorizonAssistant } from '../../utils/dashboardHeyHorizon.js';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { buildDashboardVoiceBriefText } from './dashboardV3.js';

function trendClass(trend = 'stable') {
  if (trend === 'up') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (trend === 'down') return 'text-red-700 bg-red-50 border-red-200';
  if (trend === 'unavailable') return 'text-[#8a7456] bg-[#fffdf8] border-[#eadcc2]';
  return 'text-[#2f2415] bg-[#fffdf8] border-[#eadcc2]';
}

function TrendIcon({ trend }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-emerald-700" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-600" />;
  return null;
}

export function DashboardPremiumBriefPanel({
  brief = null,
  onSpeak,
  speaking = false,
  speechSupported = false,
  speechError = '',
  onOpenPresentation,
}) {
  if (!brief?.paragraphs?.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-gradient-to-br from-[#fffdf8] to-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Brief dirigeant</p>
          <h2 className="mt-1 text-lg font-black text-[#2f2415]">{brief.title || 'Situation du jour'}</h2>
          {brief.demoMode ? (
            <p className="mt-1 text-xs font-bold text-violet-700">Mode démonstration</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSpeak?.(buildDashboardVoiceBriefText(brief))}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white"
          >
            {speaking ? <MicOff size={16} /> : <Volume2 size={16} />}
            Lire le brief
          </button>
          {onOpenPresentation ? (
            <button
              type="button"
              onClick={onOpenPresentation}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-sm font-black text-[#2f2415]"
            >
              <Presentation size={16} />
              Mode présentation
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#2f2415]">
        {brief.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {!speechSupported ? (
        <p className="mt-3 text-xs text-[#8a7456]">Synthèse vocale non disponible sur ce navigateur — le texte reste affiché.</p>
      ) : null}
      {speechError ? <p className="mt-2 text-xs text-amber-700">{speechError}</p> : null}
    </section>
  );
}

export function DashboardTemporalComparisonPanel({ comparisons = [] }) {
  if (!comparisons.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <LineChart size={18} className="text-[#9a6b12]" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Évolution</p>
          <h2 className="text-lg font-black text-[#2f2415]">Comparaisons temporelles</h2>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {comparisons.map((period) => (
          <div key={period.key} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <h3 className="text-sm font-black text-[#2f2415]">{period.label}</h3>
            {!period.ready ? (
              <p className="mt-2 text-sm text-[#8a7456]">{period.message}</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {period.metrics.map((metric) => (
                  <div key={metric.id} className={`rounded-xl border px-3 py-2 text-sm ${trendClass(metric.trend)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide">{metric.label}</span>
                      <TrendIcon trend={metric.trend} />
                    </div>
                    <p className="mt-1 font-black">{metric.currentLabel}</p>
                    <p className="text-[10px] opacity-80">
                      {metric.snapshot ? 'Instantané' : `Préc. ${metric.previousLabel}`}
                      {' · '}
                      {metric.trend === 'unavailable' ? 'Donnée indisponible' : metric.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardDynamicsScorePanel({ dynamics = null }) {
  if (!dynamics) return null;
  const tone = dynamics.status === 'up'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : dynamics.status === 'down'
      ? 'border-red-200 bg-red-50 text-red-800'
      : dynamics.status === 'watch'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]';

  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${tone}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.2em]">Dynamique de l&apos;exploitation</p>
      <h2 className="mt-1 text-xl font-black">{dynamics.label || '—'}</h2>
      {!dynamics.ready ? (
        <p className="mt-2 text-sm">{dynamics.reasons?.[0]}</p>
      ) : (
        <>
          {dynamics.periodLabel ? <p className="mt-1 text-xs opacity-80">Basé sur {dynamics.periodLabel.toLowerCase()}</p> : null}
          <ul className="mt-3 space-y-1 text-sm">
            {(dynamics.reasons || []).map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function DashboardHeyHorizonQuickAskStrip({
  questions = [],
  onOpenAssistant,
  onNavigate,
  maxVisible = 3,
  compact = false,
}) {
  const [expanded, setExpanded] = useState(false);
  if (!questions.length) return null;
  const visible = expanded ? questions : questions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, questions.length - maxVisible);

  return (
    <section className={`rounded-2xl border border-[#d6c3a0] bg-white shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Hey Horizon</p>
        <button
          type="button"
          onClick={() => launchHeyHorizonAssistant({
            query: 'Que dois-je faire en priorité aujourd\'hui ?',
            sourceLabel: 'Dashboard',
            onOpenAssistant,
            onNavigate,
          })}
          className="min-h-[40px] rounded-xl bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white"
        >
          Demander à Hey Horizon
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => launchHeyHorizonAssistant({
              query: item.question,
              sourceLabel: 'Dashboard',
              onOpenAssistant,
              onNavigate,
            })}
            className="min-h-[40px] rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-left text-xs font-black text-[#2f2415] hover:border-[#22c55e]"
          >
            {item.question}
          </button>
        ))}
      </div>
      {hiddenCount > 0 && !expanded ? (
        <button type="button" onClick={() => setExpanded(true)} className="mt-2 text-xs font-black text-[#9a6b12]">
          + {hiddenCount} question{hiddenCount > 1 ? 's' : ''} supplémentaire{hiddenCount > 1 ? 's' : ''}
        </button>
      ) : null}
    </section>
  );
}

export function DashboardPresentationOverlay({
  open = false,
  data = null,
  onClose,
  onNavigate,
}) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#0f172a]/95 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Mode présentation</p>
            <h1 className="mt-1 text-3xl font-black">{data.farmLabel}</h1>
            <p className="mt-1 text-sm text-slate-300">{data.activities}</p>
            {data.demoMode ? <p className="mt-2 text-sm font-bold text-violet-300">Mode démonstration — données démo visibles</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/20 p-2 text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.keyFigures.map((row) => (
            <div key={row.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{row.label}</p>
              <p className="mt-1 text-xl font-black">{row.value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="text-[10px] uppercase tracking-wide text-emerald-200">Score exploitation</p>
            <p className="mt-1 text-xl font-black">{data.exploitationScore ?? '—'}/100</p>
          </div>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-[10px] uppercase tracking-wide text-amber-200">Score investisseur</p>
            <p className="mt-1 text-xl font-black">{data.investorScore ?? '—'}/100</p>
          </div>
        </div>

        {data.brief?.paragraphs?.length ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-black">Résumé dirigeant</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {data.brief.paragraphs.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        ) : null}

        {data.dynamics?.ready ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-black">Dynamique — {data.dynamics.label}</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {(data.dynamics.reasons || []).map((r) => <li key={r}>• {r}</li>)}
            </ul>
          </section>
        ) : null}

        {data.priorities?.length ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-black">Priorités</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.priorities.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <b>{item.title}</b>
                  {item.detail ? <span className="block text-slate-400">{item.detail}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.allFarmsContext ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-black">Multi-fermes</h2>
            <p className="mt-2 text-sm text-slate-300">
              {data.allFarmsContext.activeFarmCount} ferme(s) · CA consolidé {fmtCurrency(data.allFarmsContext.totals?.ca)}
            </p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3 pb-8">
          <button
            type="button"
            onClick={() => onNavigate?.(data.investorModule, { tab: data.investorTab })}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-[#052e16]"
          >
            Investisseurs &amp; Forums
            <ArrowRight size={16} />
          </button>
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-white/20 px-4 py-2 text-sm font-black">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardFarmLocationPremiumCard({ card = null }) {
  if (!card) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Localisation</p>
      <h2 className="mt-1 text-lg font-black text-[#2f2415]">{card.name}</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm">
          <p className="text-[#8a7456]">Région · Commune</p>
          <p className="mt-1 font-bold text-[#2f2415]">{card.region} · {card.commune}</p>
          <p className="mt-2 text-xs text-[#8a7456]">{card.activities}</p>
          <p className="mt-2 text-xs text-[#8a7456]">Statut : {card.status}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm">
          <p className="text-[#8a7456]">Coordonnées</p>
          <p className="mt-1 font-bold text-[#2f2415]">
            {card.latitude != null && card.longitude != null
              ? `${card.latitude}, ${card.longitude}`
              : 'Localisation textuelle — GPS à renseigner'}
          </p>
          <p className="mt-2 text-xs text-[#8a7456]">Score {card.score ?? '—'}/100 · {fmtNumber(card.alerts)} alerte(s)</p>
        </div>
      </div>
      {card.mainAlerts?.length ? (
        <ul className="mt-3 space-y-1 text-xs text-amber-800">
          {card.mainAlerts.map((entry) => <li key={entry}>• {entry}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

