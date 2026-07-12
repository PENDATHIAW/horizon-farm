import { useMemo } from 'react';
import { Route } from 'lucide-react';
import { computeValorisationReadiness } from '../../services/greenpreneurs/valorisationReadinessEngine.js';
import { normalizeGreenpreneursDataMap } from '../../services/greenpreneurs/greenpreneursMetrics.js';

const STATUS_TONE = {
  non_pret: 'text-rose-800 bg-rose-50 border-rose-200',
  a_preparer: 'text-amber-900 bg-amber-50 border-amber-200',
  pilote_possible: 'text-sky-900 bg-sky-50 border-sky-200',
  lancement_recommande: 'text-emerald-900 bg-emerald-50 border-emerald-200',
};

function PhaseBlock({ title, phase }) {
  const tone = STATUS_TONE[phase.status] || STATUS_TONE.non_pret;
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-sm">{title}</p>
        <p className="text-lg font-black">{phase.score}/100 — {phase.statusLabel}</p>
      </div>
      {phase.readyItems?.length ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase opacity-80">Ce qui est prêt</p>
          {phase.readyItems.map((item) => <p key={item} className="text-xs mt-1">✓ {item}</p>)}
        </div>
      ) : null}
      {phase.blockers?.length ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase opacity-80">Ce qui bloque</p>
          {phase.blockers.slice(0, 4).map((item) => <p key={item} className="text-xs mt-1">○ {item}</p>)}
        </div>
      ) : null}
      {phase.nextActions?.length ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase opacity-80">Actions recommandées</p>
          {phase.nextActions.slice(0, 4).map((item) => <p key={item} className="text-xs mt-1">→ {item}</p>)}
        </div>
      ) : null}
      <p className="text-xs mt-3 leading-relaxed opacity-90">{phase.bestMoment}</p>
    </div>
  );
}

export default function ValorisationPhaseAdvisor({
  dataMap = {},
  compact = false,
}) {
  const readiness = useMemo(() => {
    const normalized = normalizeGreenpreneursDataMap(dataMap);
    return computeValorisationReadiness(normalized);
  }, [dataMap]);

  if (compact) {
    return (
      <div className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 space-y-2 text-sm">
        <p className="font-black">Phases 2 & 3 — décision data-driven</p>
        <p>Phase 2 future : <b>{readiness.phase2_tallow_go.score}/100</b> — {readiness.phase2_tallow_go.statusLabel}</p>
        <p>Phase 3 future : <b>{readiness.phase3_bovinia.score}/100</b> — {readiness.phase3_bovinia.statusLabel}</p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
          <Route size={20} /> Phases 2 & 3 — Décision data-driven
        </p>
        <p className="text-sm text-[#8a7456] mt-1">
          Les extensions futures ne démarrent pas à une date fixe — l&apos;ERP évalue les conditions.
        </p>
      </div>

      <PhaseBlock title="Phase 2 future — valorisation du suif" phase={readiness.phase2_tallow_go} />
      <PhaseBlock title="Phase 3 future — valorisation des os" phase={readiness.phase3_bovinia} />

      <p className="text-xs text-[#8a7456] rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 leading-relaxed">
        {readiness.roadmapNote}
      </p>
    </section>
  );
}
