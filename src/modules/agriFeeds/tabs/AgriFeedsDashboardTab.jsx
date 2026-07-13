import { useMemo } from 'react';
import { computeAgriFeedsReadiness, normalizeAgriFeedsDataMap } from '../../../services/agriFeeds/agriFeedsReadinessEngine.js';
import { buildPhase1FeedBenchmark } from '../../../services/agriFeeds/phase1FeedBenchmarkEngine.js';
import { facilityZonesSummary } from '../../../services/agriFeeds/facilityZonesService.js';
import { fmtCurrency, fmtNumber } from '../../../utils/format.js';

function Card({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{title}</p>
      <p className="mt-1 text-xl font-semibold text-earth">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate leading-relaxed">{hint}</p> : null}
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
      <section className="rounded-3xl border border-line bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-earth">État actuel — {readiness.modeShortLabel}</p>
            <p className="text-sm text-slate mt-1 max-w-2xl leading-relaxed">
              {readiness.modeLabel}. Score de préparation : <b>{readiness.readiness_score}/100</b>.
              {' '}{readiness.note}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">
            Référence {readiness.scores.phase1_reference}/100 · Pilote {readiness.scores.pilot_internal}/100 · Vente {readiness.scores.progressive_sales}/100
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-positive bg-positive-bg p-3">
            <p className="text-meta font-semibold uppercase text-positive">Conditions remplies</p>
            {readiness.conditions_met.length
              ? readiness.conditions_met.map((item) => <p key={item} className="text-xs mt-1 text-positive">✓ {item}</p>)
              : <p className="text-xs mt-1 text-positive">Aucune condition encore consolidée.</p>}
          </div>
          <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3">
            <p className="text-meta font-semibold uppercase text-horizon-dark">À vérifier</p>
            {readiness.conditions_missing.length
              ? readiness.conditions_missing.map((item) => <p key={item} className="text-xs mt-1 text-horizon-dark">○ {item}</p>)
              : <p className="text-xs mt-1">Rien de bloquant sur ce mode.</p>}
          </div>
          <div className="rounded-2xl border border-urgent bg-urgent-bg p-3">
            <p className="text-meta font-semibold uppercase text-urgent">Points d’attention</p>
            {readiness.blockers.length
              ? readiness.blockers.map((item) => <p key={item} className="text-xs mt-1 text-urgent">! {item}</p>)
              : <p className="text-xs mt-1 text-urgent">Aucun bloqueur critique.</p>}
          </div>
        </div>
        {readiness.priority_actions?.length ? (
          <div className="mt-4 rounded-2xl border border-line bg-white p-3">
            <p className="text-meta font-semibold uppercase text-slate">Actions prioritaires proposées</p>
            {readiness.priority_actions.map((item) => (
              <p key={item} className="text-sm mt-1 text-earth">→ {item}</p>
            ))}
          </div>
        ) : null}

        {readiness.warnings?.length ? (
          <div className="mt-3 rounded-2xl border border-vigilance bg-vigilance-bg p-3">
            <p className="text-meta font-semibold uppercase text-horizon-dark">Points à surveiller</p>
            {readiness.warnings.map((w) => (
              <p key={w} className="text-xs mt-1 text-horizon-dark">! {w}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl border border-line bg-card p-3">
          <p className="text-xs font-semibold text-earth">Confirmation requise</p>
          <p className="text-xs text-slate leading-relaxed">
            {readiness.ai_disclaimer || 'L’IA propose. L’humain valide.'}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['REFERENCE', 'PILOT_INTERNAL', 'PROGRESSIVE_SALES'].map((key) => {
          const info = readiness.per_mode?.[key];
          if (!info) return null;
          const recommended = readiness.recommendedMode === key;
          return (
            <div
              key={key}
              className={`rounded-2xl border p-3 ${recommended ? 'border-positive bg-positive-bg' : 'border-line bg-white'}`}
            >
              <p className="text-meta font-semibold uppercase text-slate">
                {recommended ? 'Mode recommandé' : 'Mode'}
              </p>
              <p className="text-sm font-semibold text-earth">{info.label}</p>
              <p className="text-xs text-slate">Score {info.score}/100</p>
              {info.blockers?.length ? (
                <p className="text-xs mt-1 text-urgent">{info.blockers.length} bloqueur(s)</p>
              ) : null}
              {info.warnings?.length ? (
                <p className="text-xs mt-1 text-horizon-dark">{info.warnings.length} point(s) à surveiller</p>
              ) : null}
            </div>
          );
        })}
      </section>

      {readiness.per_mode?.PROGRESSIVE_SALES?.gates ? (
        <section className="rounded-3xl border border-line bg-white p-6">
          <p className="font-semibold text-earth">Conditions de vente progressive</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(readiness.per_mode.PROGRESSIVE_SALES.gates).map(([key, ok]) => (
              <div
                key={key}
                className={`rounded-xl border px-3 py-2 text-xs ${ok ? 'border-positive bg-positive-bg text-positive' : 'border-urgent bg-urgent-bg text-urgent'}`}
              >
                <span>{ok ? '✓ ' : '! '}{readiness.per_mode.PROGRESSIVE_SALES.gateLabels?.[key] || key}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          title="Distributions de référence"
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

      <section className="rounded-3xl border border-line bg-white p-6">
        <p className="font-semibold text-earth">Décision AGRI FEEDS</p>
        <p className="text-sm text-slate mt-1 leading-relaxed">
          La priorité actuelle est de consolider les données d’alimentation du marché.
          La production et la vente AGRI FEEDS restent fermées tant que les conditions ne sont pas réunies.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab?.('Coûts & décisions')}
            className="rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-earth"
          >
            Voir les coûts & décisions
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.('Qualité')}
            className="rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-earth"
          >
            Zones site prévues
          </button>
        </div>
      </section>

    </div>
  );
}
