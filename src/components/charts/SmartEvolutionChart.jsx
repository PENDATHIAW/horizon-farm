import ReactECharts from 'echarts-for-react';

const formatCompact = (value, unit = '') => {
  const number = Number(value || 0);
  if (unit === 'FCFA') {
    if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (Math.abs(number) >= 1000) return `${Math.round(number / 1000)}k`;
  }
  if (unit === '%') return `${number.toFixed(number % 1 ? 1 : 0)}%`;
  if (unit === 'kg') return `${number.toFixed(2)} kg`;
  return `${number.toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`;
};

const defaultPalette = ['#b7791f', '#2f855a', '#2b6cb0', '#c53030', '#805ad5', '#dd6b20', '#319795', '#4a5568'];

function buildSeries(series = []) {
  return series.map((item, index) => ({
    name: item.name,
    type: item.type || 'bar',
    yAxisIndex: item.axis === 'right' ? 1 : 0,
    data: item.data || [],
    smooth: item.type === 'line',
    symbolSize: item.type === 'line' ? 8 : undefined,
    barMaxWidth: item.type === 'bar' ? 34 : undefined,
    emphasis: { focus: 'series' },
    itemStyle: { borderRadius: item.type === 'bar' ? [8, 8, 0, 0] : 0 },
    lineStyle: item.type === 'line' ? { width: 3 } : undefined,
    label: {
      show: item.showLabels !== false,
      position: item.type === 'line' ? 'top' : 'top',
      distance: item.type === 'line' ? 8 : 5,
      formatter: ({ value }) => {
        if (!value && value !== 0) return '';
        if (value === 0 && item.hideZeroLabel !== false) return '';
        return formatCompact(value, item.unit);
      },
      fontSize: 10,
      color: '#2f2415',
      overflow: 'truncate',
    },
    labelLayout: {
      hideOverlap: true,
      moveOverlap: 'shiftY',
    },
    tooltip: {
      valueFormatter: (value) => formatCompact(value, item.unit),
    },
    color: item.color || defaultPalette[index % defaultPalette.length],
  }));
}

export default function SmartEvolutionChart({
  title,
  subtitle,
  months = [],
  series = [],
  leftUnit = 'FCFA',
  rightUnit = '%',
  height = 380,
  emptyText = 'Aucune donnée exploitable pour le moment.',
}) {
  const hasData = Array.isArray(months) && months.length > 0 && series.some((serie) => Array.isArray(serie.data) && serie.data.some((value) => Number(value || 0) !== 0));

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
    grid: { left: 54, right: 54, top: 96, bottom: 72, containLabel: true },
    legend: {
      type: 'scroll',
      top: 50,
      left: 0,
      right: 0,
      textStyle: { color: '#5f4b2f', fontSize: 11 },
      itemGap: 14,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#2f2415' } },
      backgroundColor: 'rgba(255,253,248,0.96)',
      borderColor: '#d6c3a0',
      borderWidth: 1,
      textStyle: { color: '#2f2415', fontSize: 12 },
      extraCssText: 'box-shadow: 0 12px 30px rgba(47,36,21,.14); border-radius: 12px;',
    },
    toolbox: {
      right: 4,
      top: 6,
      feature: {
        dataZoom: { yAxisIndex: false, title: { zoom: 'Zoomer', back: 'Réinitialiser' } },
        restore: { title: 'Réinitialiser' },
        saveAsImage: { title: 'Exporter image', name: title || 'evolution' },
      },
      iconStyle: { borderColor: '#8a7456' },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 22, bottom: 28, borderColor: '#eadcc2', fillerColor: 'rgba(201,169,106,.18)' },
    ],
    xAxis: {
      type: 'category',
      data: months,
      axisLabel: { color: '#5f4b2f', fontSize: 11 },
      axisLine: { lineStyle: { color: '#d6c3a0' } },
    },
    yAxis: [
      {
        type: 'value',
        name: leftUnit,
        nameTextStyle: { color: '#8a7456', fontSize: 11 },
        axisLabel: { color: '#5f4b2f', formatter: (value) => formatCompact(value, leftUnit) },
        splitLine: { lineStyle: { color: '#eadcc2', type: 'dashed' } },
      },
      {
        type: 'value',
        name: rightUnit,
        nameTextStyle: { color: '#8a7456', fontSize: 11 },
        axisLabel: { color: '#5f4b2f', formatter: (value) => formatCompact(value, rightUnit) },
        splitLine: { show: false },
      },
    ],
    series: buildSeries(series),
  };

  if (!hasData) {
    return (
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <p className="font-black text-[#2f2415]">{title}</p>
        {subtitle ? <p className="text-xs text-[#8a7456] mt-1">{subtitle}</p> : null}
        <div className="h-64 mt-4 rounded-xl bg-[#fffdf8] border border-[#eadcc2] flex items-center justify-center text-sm text-[#8a7456]">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 shadow-sm">
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      <p className="mt-2 text-[11px] text-[#8a7456]">
        Astuce : clique sur la légende pour masquer/afficher une série, utilise le zoom en bas pour cibler une période.
      </p>
    </div>
  );
}
