import { translateCommercialChartInsights, formatChartInsightForDirector } from '../../utils/commercialChartTranslator.js';

export default function CommercialChartInsightBar({ chartDataset = {}, filterIds = [] }) {
  let insights = translateCommercialChartInsights(chartDataset);
  if (filterIds.length) {
    insights = insights.filter((row) => filterIds.includes(row.id));
  }
  insights = insights.slice(0, 3);
  if (!insights.length) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <div key={insight.id} className="rounded-xl border border-line bg-card px-3 py-2 text-xs text-earth">
          <p className="font-semibold text-meta uppercase tracking-normal text-horizon-dark">{insight.chart}</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-slate leading-relaxed">
            {formatChartInsightForDirector(insight)}
          </pre>
        </div>
      ))}
    </div>
  );
}
