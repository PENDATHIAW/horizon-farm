import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { exportModuleReportPdf } from '../../utils/moduleReportExports';

const defaultPalette = ['#b7791f', '#2f855a', '#2b6cb0', '#c53030', '#805ad5', '#dd6b20', '#319795', '#4a5568'];

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
  const slices = useMemo(
    () => (items || []).filter((item) => Number(item.value || 0) > 0).slice(0, 8),
    [items],
  );
  const hasData = slices.length > 0;
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
      textStyle: { color: '#2f2415', fontSize: 15, fontWeight: 800 },
      subtextStyle: { color: '#8a7456', fontSize: 11, lineHeight: 16 },
    },
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) => `${name}<br/>${formatCompact(value, unit)} (${percent}%)`,
      backgroundColor: 'rgba(255,253,248,0.96)',
      borderColor: '#d6c3a0',
      textStyle: { color: '#2f2415' },
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      width: '94%',
      textStyle: { color: '#5f4b2f', fontSize: 10 },
      itemGap: 10,
    },
    series: [{
      type: 'pie',
      radius: showSliceLabels ? ['38%', '62%'] : ['42%', '66%'],
      center: ['50%', showSliceLabels ? '46%' : '48%'],
      avoidLabelOverlap: true,
      minShowLabelAngle: 8,
      itemStyle: { borderRadius: 8, borderColor: '#fffdf8', borderWidth: 2 },
      label: {
        show: showSliceLabels,
        formatter: '{b}\n{d}%',
        fontSize: 10,
        color: '#2f2415',
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
      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="font-black text-[#2f2415]">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-[#8a7456]">{subtitle}</p> : null}
        <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-[#eadcc2] bg-[#fffdf8] text-sm text-[#8a7456]">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={exportPdf} className="rounded-xl bg-[#2f2415] px-3 py-1.5 text-[11px] font-bold text-white">Exporter PDF</button>
      </div>
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      {!compact && !showSliceLabels ? <p className="mt-2 text-[11px] text-[#8a7456]">Survolez une part ou consultez la légende pour le détail.</p> : null}
    </div>
  );
}
