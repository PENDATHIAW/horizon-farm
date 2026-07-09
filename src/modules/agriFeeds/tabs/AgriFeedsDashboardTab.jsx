import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Compass, Layers3 } from 'lucide-react';
import { computeAgriFeedsReadiness, normalizeAgriFeedsDataMap } from '../../../services/agriFeeds/agriFeedsReadinessEngine.js';
import { buildPhase1FeedBenchmark } from '../../../services/agriFeeds/phase1FeedBenchmarkEngine.js';
import { facilityZonesSummary } from '../../../services/agriFeeds/facilityZonesService.js';
import { fmtCurrency, fmtNumber } from '../../../utils/format.js';

function Card({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">{title}</p>
      <p className="mt-1 text-xl font-black text-[#2f2415]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8a7456] leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export default function AgriFeedsDashboardTab({ dataMap = {}, onNavigateTab }) {
  const normalized = useMemo(() => normalizeAgriFeedsDataMap(dataMap), [dataMap]);
  const readiness = useMemo(() => computeAgriFeedsReadiness(normalized), [normalized]);
  const benchmark = useMemo(() => buildPhase1FeedBenchmark(normalized), [normalized]);
  const zones = useMemo(() => facilityZonesSummary(normalized), [normalized]);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
              <Compass size={20} /> Mode actuel — {readiness.modeShortLabel}
            </p>
            <p className="text-sm text-[#8a7456] mt-1 max-w-2xl leading-relaxed">
              {readiness.modeLabel}. Score de préparation : <b>{readiness.readiness_score}/100</b>.
              {' '}{readiness.note}
            </p>
          </div>
          <div className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">
            Phase 1 {readiness.scores.phase1_reference}/100 · Pilote {readiness.scores.pilot_internal}/100 · Vente {readiness.scores.progressive_sales}/100
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-1">
              <CheckCircle2 size={12} /> Conditions remplies
            </p>
            {readiness.conditions_met.length
              ? readiness.conditions_met.map((item) => <p key={item} className="text-xs mt-1 text-emerald-950">✓ {item}</p>)
              : <p className="text-xs mt-1 text-emerald-900/80">Aucune condition encore consolidée.</p>}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
            <p className="text-[10px] font-black uppercase text-amber-900">À vérifier</p>
            {readiness.conditions_missing.length
              ? readiness.conditions_missing.map((item) => <p key={item} className="text-xs mt-1 text-amber-950">○ {item}</p>)
              : <p className="text-xs mt-1">Rien de bloquant sur ce mode.</p>}
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3">
            <p className="text-[10px] font-black uppercase text-rose-900 flex items-center gap-1">
              <AlertTriangle size={12} /> Points d’attention
            </p>
            {readiness.blockers.length
              ? readiness.blockers.map((item) => <p key={item} className="text-xs mt-1 text-rose-950">! {item}</p>)
              : <p className="text-xs mt-1 text-rose-900/80">Aucun bloqueur critique.</p>}
          </div>
        </div>
        {readiness.next_actions.length ? (
          <div className="mt-4 rounded-2xl border border-[#eadcc2] bg-white p-3">
            <p className="text-[10px] font-black uppercase text-[#8a7456]">Action proposée</p>
            {readiness.next_actions.map((item) => (
              <p key={item} className="text-sm mt-1 text-[#2f2415]">→ {item}</p>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          title="Distributions Phase 1"
          value={fmtNumber(benchmark.totals.distributions)}
          hint="Aliments du marché suivis"
        />
        <Card
          title="Coût alimentaire suivi"
          value={fmtCurrency(benchmark.totals.feed_cost_total)}
          hint={`${fmtNumber(benchmark.totals.rows)} lot(s) / cible(s)`}
        />
        <Card
          title="Prix moyen / kg"
          value={benchmark.totals.avg_price_per_kg > 0 ? fmtCurrency(benchmark.totals.avg_price_per_kg) : '—'}
          hint="Référence marché"
        />
        <Card
          title="Zones site prévues"
          value={`${zones.planned + zones.available + zones.in_use}`}
          hint={`${zones.planned} prévu(s) · ${zones.in_use} en service`}
        />
      </div>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5">
        <p className="font-black text-[#2f2415] flex items-center gap-2">
          <Layers3 size={18} /> Décision AGRI FEEDS
        </p>
        <p className="text-sm text-[#8a7456] mt-1 leading-relaxed">
          En Mode Référence, la priorité est de consolider les données d’alimentation du marché.
          La production et la vente AGRI FEEDS restent fermées tant que les conditions ne sont pas réunies.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab?.('Référence Phase 1')}
            className="rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16]"
          >
            Voir la référence Phase 1
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.('Qualité & reporting')}
            className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-2 text-sm font-black text-[#2f2415]"
          >
            Zones site prévues
          </button>
        </div>
      </section>
    </div>
  );
}
