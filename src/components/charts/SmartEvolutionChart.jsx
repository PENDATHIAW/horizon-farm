import { useMemo, useState } from 'react';
import { ChartPeriodContext, useChartPeriodContext } from './chartPeriodContext';
import ReactECharts from 'echarts-for-react';
import { exportModuleReportPdf } from '../../utils/moduleReportExports';

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

function buildSeries(series = [], showValueLabels = false) {
  return series.map((item, index) => ({
    name: item.name,
    type: item.type || 'bar',
    yAxisIndex: item.axis === 'right' ? 1 : 0,
    data: item.data || [],
    smooth: item.type === 'line' ? 0.25 : false,
    symbol: item.type === 'line' ? 'circle' : undefined,
    symbolSize: item.type === 'line' ? 7 : undefined,
    barMaxWidth: item.type === 'bar' ? 28 : undefined,
    barGap: item.type === 'bar' ? '20%' : undefined,
    emphasis: { focus: 'series' },
    itemStyle: { borderRadius: item.type === 'bar' ? [6, 6, 0, 0] : 0 },
    lineStyle: item.type === 'line' ? { width: 3.5 } : undefined,
    z: item.type === 'line' ? 3 : 1,
    label: {
      show: showValueLabels && item.showLabels !== false,
      position: item.type === 'line' ? 'top' : 'top',
      distance: item.type === 'line' ? 10 : 4,
      formatter: ({ value }) => {
        if (!value && value !== 0) return '';
        if (value === 0 && item.hideZeroLabel !== false) return '';
        return formatCompact(value, item.unit);
      },
      fontSize: 10,
      fontWeight: item.type === 'line' ? 700 : 500,
      color: item.type === 'line' ? (item.color || defaultPalette[index % defaultPalette.length]) : '#2f2415',
      overflow: 'truncate',
    },
    labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
    tooltip: { valueFormatter: (value) => formatCompact(value, item.unit) },
    color: item.color || defaultPalette[index % defaultPalette.length],
  }));
}

function parsePeriod(label) {
  const text = String(label || '').trim();
  if (!text || text === 'Sans date') return null;
  const frMonth = text.match(/^(\d{2})\/(\d{2})$/);
  if (frMonth) return { year: Number(`20${frMonth[2]}`), month: Number(frMonth[1]), day: null, raw: `${Number(`20${frMonth[2]}`)}-${frMonth[1]}` };
  const isoMonth = text.match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) return { year: Number(isoMonth[1]), month: Number(isoMonth[2]), day: null, raw: text };
  const isoDay = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) return { year: Number(isoDay[1]), month: Number(isoDay[2]), day: Number(isoDay[3]), raw: text };
  return { year: null, month: null, day: null, raw: text };
}

function periodMatches(label, filter) {
  if (!filter || filter.mode === 'all') return true;
  const parsed = parsePeriod(label);
  if (!parsed) return true;
  if (filter.mode === 'year') return parsed.year === Number(filter.year);
  if (filter.mode === 'month') return parsed.year === Number(filter.year) && parsed.month === Number(filter.month);
  if (filter.mode === 'day') return parsed.raw === filter.day;
  if (filter.mode === 'range') {
    if (filter.start && parsed.raw < filter.start) return false;
    if (filter.end && parsed.raw > filter.end) return false;
    return true;
  }
  return true;
}

function uniqueYears(months = []) {
  const years = months.map(parsePeriod).map((item) => item?.year).filter(Boolean);
  return [...new Set(years)].sort((a, b) => b - a);
}

function filterSeries(series = [], indexes = []) {
  return series.map((item) => ({ ...item, data: indexes.map((index) => item.data?.[index] ?? 0) }));
}

export default function SmartEvolutionChart({
  title,
  subtitle,
  months = [],
  series = [],
  leftUnit = 'FCFA',
  rightUnit = '%',
  height = 400,
  emptyText = 'Aucune donnée exploitable pour le moment.',
  moduleName = 'Module',
  reportPayload = {},
  compact = true,
  categoryAxis = false,
  showValueLabels = false,
  xLabelRotate = null,
  legendBottom = false,
}) {
  const { lockControls } = useChartPeriodContext();
  const years = useMemo(() => uniqueYears(months), [months]);
  const [filter, setFilter] = useState({ mode: 'all', year: years[0] || new Date().getFullYear(), month: 1, day: '', start: '', end: '' });

  const filtered = useMemo(() => {
    const indexes = months.map((label, index) => (periodMatches(label, filter) ? index : -1)).filter((index) => index >= 0);
    return { months: indexes.map((index) => months[index]), series: filterSeries(series, indexes) };
  }, [months, series, filter]);

  const hasData = Array.isArray(filtered.months) && filtered.months.length > 0 && filtered.series.some((serie) => Array.isArray(serie.data) && serie.data.some((value) => Number(value || 0) !== 0));
  const periodLabel = filter.mode === 'all' ? 'Toutes les périodes' : filter.mode === 'year' ? `Année ${filter.year}` : filter.mode === 'month' ? `${filter.year}-${String(filter.month).padStart(2, '0')}` : filter.mode === 'day' ? filter.day : `${filter.start || 'début'} → ${filter.end || 'fin'}`;

  const rotate = xLabelRotate ?? (categoryAxis ? 28 : filtered.months.length > 8 ? 24 : 0);
  const chartHeight = height || (categoryAxis ? 430 : rotate ? 420 : 400);
  const bottomPad = rotate ? 98 : 72;

  const exportPdf = () => {
    exportModuleReportPdf({
      module: moduleName,
      title,
      subtitle,
      period: periodLabel,
      labels: filtered.months,
      series: filtered.series.map((item) => ({
        name: item.name,
        unit: item.unit || '',
        type: item.type || 'bar',
        axis: item.axis || 'left',
        values: item.data || [],
      })),
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
    grid: {
      left: 58,
      right: series.some((item) => item.axis === 'right') ? 62 : 24,
      top: legendBottom ? 84 : 96,
      bottom: bottomPad,
      containLabel: true,
    },
    legend: {
      type: 'scroll',
      ...(legendBottom ? { bottom: 6, left: 'center', width: '96%' } : { top: 52, left: 0, right: 0 }),
      textStyle: { color: '#5f4b2f', fontSize: 11 },
      itemGap: 16,
      itemWidth: 14,
      itemHeight: 8,
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
    toolbox: { show: false },
    dataZoom: filtered.months.length > 6
      ? [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100, height: 20, bottom: rotate ? 34 : 28, borderColor: '#eadcc2', fillerColor: 'rgba(201,169,106,.18)' }]
      : [],
    xAxis: {
      type: 'category',
      data: filtered.months,
      axisLabel: {
        color: '#5f4b2f',
        fontSize: 10,
        rotate,
        interval: 0,
        hideOverlap: true,
        margin: rotate ? 14 : 8,
        overflow: 'truncate',
        width: categoryAxis ? 72 : 56,
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#d6c3a0' } },
    },
    yAxis: [
      {
        type: 'value',
        name: leftUnit,
        nameGap: 12,
        nameTextStyle: { color: '#8a7456', fontSize: 11 },
        axisLabel: { color: '#5f4b2f', formatter: (value) => formatCompact(value, leftUnit) },
        splitLine: { lineStyle: { color: '#eadcc2', type: 'dashed' } },
      },
      {
        type: 'value',
        name: rightUnit,
        nameGap: 12,
        nameTextStyle: { color: '#8a7456', fontSize: 11 },
        axisLabel: { color: '#5f4b2f', formatter: (value) => formatCompact(value, rightUnit) },
        splitLine: { show: false },
      },
    ],
    series: buildSeries(filtered.series, showValueLabels),
  };

  const Controls = lockControls ? null : <div className="mb-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs"><select value={filter.mode} onChange={(e) => setFilter((prev) => ({ ...prev, mode: e.target.value }))} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 text-[#2f2415]"><option value="all">Toutes périodes</option><option value="year">Année</option><option value="month">Mois</option><option value="day">Jour</option><option value="range">Période</option></select>{(filter.mode === 'year' || filter.mode === 'month') ? <select value={filter.year} onChange={(e) => setFilter((prev) => ({ ...prev, year: e.target.value }))} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 text-[#2f2415]">{(years.length ? years : [new Date().getFullYear()]).map((year) => <option key={year} value={year}>{year}</option>)}</select> : null}{filter.mode === 'month' ? <input type="number" min="1" max="12" value={filter.month} onChange={(e) => setFilter((prev) => ({ ...prev, month: e.target.value }))} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 text-[#2f2415]" /> : null}{filter.mode === 'day' ? <input type="date" value={filter.day} onChange={(e) => setFilter((prev) => ({ ...prev, day: e.target.value }))} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 text-[#2f2415]" /> : null}{filter.mode === 'range' ? <input type="date" value={filter.start} onChange={(e) => setFilter((prev) => ({ ...prev, start: e.target.value }))} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 text-[#2f2415]" /> : null}{filter.mode === 'range' ? <input type="date" value={filter.end} onChange={(e) => setFilter((prev) => ({ ...prev, end: e.target.value }))} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 text-[#2f2415]" /> : null}<button type="button" onClick={() => setFilter({ mode: 'all', year: years[0] || new Date().getFullYear(), month: 1, day: '', start: '', end: '' })} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-2 font-bold text-[#2f2415]">Réinitialiser</button><button type="button" onClick={exportPdf} className="rounded-xl bg-[#2f2415] px-2 py-2 font-bold text-white">Exporter PDF</button></div><p className="mt-2 text-[11px] text-[#8a7456]">Période active : {periodLabel}</p></div>;

  if (!hasData) return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">{Controls}<p className="font-black text-[#2f2415]">{title}</p>{subtitle ? <p className="text-xs text-[#8a7456] mt-1">{subtitle}</p> : null}<div className="h-64 mt-4 rounded-xl bg-[#fffdf8] border border-[#eadcc2] flex items-center justify-center text-sm text-[#8a7456]">{emptyText}</div></div>;

  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 shadow-sm">{Controls}<ReactECharts option={option} style={{ height: chartHeight, width: '100%' }} notMerge lazyUpdate />{!compact ? <p className="mt-2 text-[11px] text-[#8a7456]">Astuce : clique sur la légende pour masquer/afficher une série, puis utilise le zoom en bas pour affiner l’affichage.</p> : null}</div>;
}
