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
        <div key={insight.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-xs text-[#2f2415]">
          <p className="font-black text-[11px] uppercase tracking-wide text-[#9a6b12]">{insight.chart}</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-[#8a7456] leading-relaxed">
            {formatChartInsightForDirector(insight)}
          </pre>
        </div>
      ))}
    </div>
  );
}
