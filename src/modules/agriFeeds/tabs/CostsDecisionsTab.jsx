import { useMemo } from 'react';
import { buildPhase1FeedBenchmark } from '../../../services/agriFeeds/phase1FeedBenchmarkEngine.js';
import { computeAgriFeedsReadiness, normalizeAgriFeedsDataMap } from '../../../services/agriFeeds/agriFeedsReadinessEngine.js';
import { fmtCurrency, fmtNumber } from '../../../utils/format.js';

function Stat({ label, value }) {
  return <div className="border-l-4 border-leaf bg-card p-4"><p className="text-xs font-semibold text-slate">{label}</p><p className="mt-1 text-xl font-semibold text-earth">{value}</p></div>;
}

export default function CostsDecisionsTab({ dataMap = {} }) {
  const normalized = useMemo(() => normalizeAgriFeedsDataMap(dataMap), [dataMap]);
  const benchmark = useMemo(() => buildPhase1FeedBenchmark(normalized), [normalized]);
  const readiness = useMemo(() => computeAgriFeedsReadiness(normalized), [normalized]);
  return <div className="space-y-6"><section className="rounded-2xl border border-line bg-white p-6 shadow-card"><h2 className="font-semibold text-earth">Coûts & décisions</h2><p className="mt-1 text-sm text-slate">Indicateurs calculés depuis les distributions, matières, formules, essais et contrôles qualité.</p><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Coût alimentaire suivi" value={fmtCurrency(benchmark.totals.feed_cost_total)} /><Stat label="Prix moyen / kg" value={benchmark.totals.avg_price_per_kg > 0 ? fmtCurrency(benchmark.totals.avg_price_per_kg) : '—'} /><Stat label="Distributions" value={fmtNumber(benchmark.totals.distributions)} /><Stat label="Préparation" value={`${readiness.readiness_score}/100`} /></div></section><section className="rounded-2xl border border-line bg-white p-6 shadow-card"><h2 className="font-semibold text-earth">Décisions proposées</h2><div className="mt-3 space-y-2">{readiness.priority_actions?.length ? readiness.priority_actions.map((action) => <p key={action} className="border-l-4 border-horizon bg-card p-3 text-sm font-semibold text-earth">{action}</p>) : <p className="text-sm text-slate">Aucune décision prioritaire proposée.</p>}</div><p className="mt-4 text-xs font-semibold text-slate">Les propositions doivent être validées par un responsable avant toute mise en œuvre.</p></section></div>;
}
