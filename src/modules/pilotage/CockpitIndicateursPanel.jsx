import { useMemo, useState } from 'react';
import { Gauge, ChevronDown, ChevronRight } from 'lucide-react';
import { buildCockpitCatalog } from '../../services/kpiEngine/cockpitCatalog.js';
import { TONE_DOT, TONE_TEXT, TONE_CHIP } from './pilotageTone.js';

/**
 * Cockpit d'indicateurs par activité : pour chaque activité (chair, pondeuses,
 * bovins, stock, commercial, finance...), les KPI clés avec repère métier, statut
 * couleur et décision. Contrat 20 secondes : les points d'attention en tête.
 */
export default function CockpitIndicateursPanel({ data = {} }) {
  const catalog = useMemo(() => {
    try { return buildCockpitCatalog(data); } catch { return { sections: [], summary: { indicators: 0, good: 0, warn: 0, bad: 0, attention: [] } }; }
  }, [data]);
  const [open, setOpen] = useState(() => new Set(catalog.sections.map((s) => s.activity)));

  if (!catalog.sections.length) return null;
  const { summary } = catalog;

  const toggle = (activity) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(activity)) next.delete(activity); else next.add(activity);
    return next;
  });

  return (
    <section className="hf-card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-label font-semibold uppercase text-earth">
            <Gauge size={15} aria-hidden="true" /> Cockpit indicateurs
          </p>
          <h2 className="mt-1 text-lg font-semibold text-earth">Où ça va bien, où ça coince, quoi faire</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-meta font-semibold">
          <span className="rounded-full bg-positive-bg px-2.5 py-1 text-positive">{summary.good} bon</span>
          <span className="rounded-full bg-vigilance-bg px-2.5 py-1 text-horizon-dark">{summary.warn} vigilance</span>
          <span className="rounded-full bg-urgent-bg px-2.5 py-1 text-urgent">{summary.bad} critique</span>
        </div>
      </div>

      {summary.attention.length ? (
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="text-meta font-semibold uppercase text-slate">Points d'attention</p>
          <ul className="mt-2 space-y-1">
            {summary.attention.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[a.tone] || TONE_DOT.warn}`} />
                <span className="text-earth"><b>{a.label}</b> ({a.valueLabel}) — {a.decision}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        {catalog.sections.map((section) => {
          const isOpen = open.has(section.activity);
          const alerts = section.indicators.filter((i) => i.tone === 'bad' || i.tone === 'warn').length;
          return (
            <div key={section.activity} className="rounded-2xl border border-line bg-card">
              <button type="button" onClick={() => toggle(section.activity)} className="flex w-full items-center justify-between gap-2 p-3 text-left">
                <span className="flex items-center gap-2 font-semibold text-earth">
                  {isOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                  {section.label}
                </span>
                {alerts ? <span className="rounded-full bg-vigilance-bg px-2 py-0.5 text-meta font-semibold text-horizon-dark">{alerts} à surveiller</span> : <span className="text-meta text-positive">OK</span>}
              </button>
              {isOpen ? (
                <div className="grid grid-cols-1 gap-2 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.indicators.map((ind) => (
                    <div key={ind.key} className="rounded-xl border border-line bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-meta font-semibold uppercase text-slate">{ind.label}</span>
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[ind.tone] || TONE_DOT.neutral}`} />
                      </div>
                      <p className={`mt-1 text-lg font-semibold tabular-nums ${TONE_TEXT[ind.tone] || 'text-earth'}`}>{ind.valueLabel}</p>
                      {ind.targetLabel ? <p className="text-meta text-slate">Cible : {ind.targetLabel}</p> : null}
                      {ind.decision ? <p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-meta ${TONE_CHIP[ind.tone] || TONE_CHIP.neutral}`}>{ind.decision}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-meta text-slate">Repères indicatifs (contexte Sénégal). « À compléter » signale une donnée manquante.</p>
    </section>
  );
}
