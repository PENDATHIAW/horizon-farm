import { AchatsStockSection } from './achatsStockUi.jsx';

const tone = (severity = '') => {
  if (severity === 'haute') return 'border-red-200 bg-red-50 text-red-800';
  if (severity === 'moyenne') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
};

export default function AchatsStockDataQualityPanel({ snapshot = {}, compact = false }) {
  const issues = snapshot.issues || [];
  if (!issues.length) {
    return (
      <AchatsStockSection title="Qualité des données stock" subtitle="Aucun écart détecté sur les critères suivis.">
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Données stock cohérentes pour CMUP, alertes, consommations et scope multi-fermes.
        </p>
      </AchatsStockSection>
    );
  }

  const visible = compact ? issues.slice(0, 4) : issues;

  return (
    <AchatsStockSection
      title="Qualité des données stock"
      subtitle={`${snapshot.totalIssues || issues.length} écart(s) — certains calculs peuvent être incomplets.`}
    >
      <div className="space-y-2">
        {visible.map((issue) => (
          <div key={issue.id} className={`rounded-2xl border px-4 py-3 text-sm ${tone(issue.severity)}`}>
            <p className="font-black">{issue.title}</p>
            <p className="mt-1 opacity-90">{issue.detail}</p>
          </div>
        ))}
        {compact && issues.length > visible.length ? (
          <p className="text-xs text-[#8a7456]">+ {issues.length - visible.length} autre(s) écart(s) dans l’analyse avancée.</p>
        ) : null}
      </div>
    </AchatsStockSection>
  );
}
