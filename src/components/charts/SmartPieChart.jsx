import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { exportModuleReportPdf } from '../../utils/moduleReportExports';
import ChartExplainPanel from './ChartExplainPanel.jsx';
import { useChartExplainContext } from './chartExplainContext.jsx';
import { buildChartExplainPayload } from '../../services/aiGateway/chartExplainService.js';

const defaultPalette = ['var(--hf-horizon-dark)', 'var(--hf-positive)', 'var(--hf-neutral)', 'var(--hf-urgent)', 'var(--hf-leaf)', 'var(--hf-horizon)', 'var(--hf-leaf)', 'var(--hf-slate)'];

const formatCompact = (value, unit = '') => {
  const number = Number(value || 0);
  if (unit === 'FCFA') {
    if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M FCFA`;
    if (Math.abs(number) >= 1000) return `${Math.round(number / 1000)}k FCFA`;
    return `${number.toLocaleString('fr-FR')} FCFA`;
  }
  return `${number.toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`;
};

/** Camembert — idéal pour répartitions et structures (max ~8 parts lisibles). */
export default function SmartPieChart({
  title,
  subtitle,
  items = [],
  unit = 'FCFA',
  height = 360,
  emptyText = 'Aucune donnée pour ce camembert.',
  moduleName = 'Module',
  reportPayload = {},
  compact = true,
}) {
  const explainCtx = useChartExplainContext();
  const slices = useMemo(
    () => (items || []).filter((item) => Number(item.value || 0) > 0).slice(0, 8),
    [items],
  );
  const hasData = slices.length > 0;

  const explainPayload = useMemo(() => {
    if (!explainCtx.enabled || !hasData) return null;
    return buildChartExplainPayload({
      title,
      subtitle,
      items: slices,
      unit,
      moduleName,
      periodLabel: 'Répartition affichée',
      chartKind: 'pie',
    });
  }, [explainCtx.enabled, hasData, title, subtitle, slices, unit, moduleName]);
  const showSliceLabels = slices.length <= 4;

  const exportPdf = () => {
    exportModuleReportPdf({
      module: moduleName,
      title,
      subtitle,
      period: 'Répartition',
      labels: slices.map((item) => item.name),
      series: [{ name: title, unit, type: 'pie', axis: 'left', values: slices.map((item) => item.value) }],
      extra: reportPayload,
    });
  };

  const option = {
    color: defaultPalette,
    backgroundColor: 'transparent',
    title: {
      text: title,
      subtext: subtitle,
      left: 0,
      top: 0,
      textStyle: { color: 'var(--hf-ink)', fontSize: 15, fontWeight: 800 },
      subtextStyle: { color: 'var(--hf-slate)', fontSize: 11, lineHeight: 16 },
    },
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) => `${name}<br/>${formatCompact(value, unit)} (${percent}%)`,
      backgroundColor: 'var(--hf-card)',
      borderColor: 'var(--hf-line)',
      textStyle: { color: 'var(--hf-ink)' },
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      width: '94%',
      textStyle: { color: 'var(--hf-slate)', fontSize: 10 },
      itemGap: 10,
    },
    series: [{
      type: 'pie',
      radius: showSliceLabels ? ['38%', '62%'] : ['42%', '66%'],
      center: ['50%', showSliceLabels ? '46%' : '48%'],
      avoidLabelOverlap: true,
      minShowLabelAngle: 8,
      itemStyle: { borderRadius: 8, borderColor: 'var(--hf-card)', borderWidth: 2 },
      label: {
        show: showSliceLabels,
        formatter: '{b}\n{d}%',
        fontSize: 10,
        color: 'var(--hf-ink)',
        overflow: 'truncate',
        width: 88,
      },
      labelLine: {
        show: showSliceLabels,
        length: 12,
        length2: 10,
        smooth: 0.2,
      },
      labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
      emphasis: {
        label: { show: true, fontSize: 11, fontWeight: 700 },
      },
      data: slices.map((item) => ({ name: item.name, value: item.value })),
    }],
  };

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="font-semibold text-earth">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate">{subtitle}</p> : null}
        <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-line bg-card text-sm text-slate">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={exportPdf} className="rounded-xl bg-earth px-3 py-2 text-meta font-semibold text-white">Exporter PDF</button>
      </div>
      <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} notMerge lazyUpdate />
      {!compact && !showSliceLabels ? <p className="mt-2 text-meta text-slate">Survolez une part ou consultez la légende pour le détail.</p> : null}
      {explainPayload ? <ChartExplainPanel payload={explainPayload} /> : null}
    </div>
  );
}
