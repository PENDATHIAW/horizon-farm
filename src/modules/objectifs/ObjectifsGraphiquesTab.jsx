import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import SmartEvolutionChart from '../../components/charts/SmartEvolutionChart.jsx';
import { theoreticalStandardAtAge } from '../../services/objectifsDecision/breedStockReferential.js';
import { fmtCurrency, fmtNumber } from '../../utils/format';

function ChartCard({ title, subtitle, children, tall = false }) {
  return (
    <section className={`rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm ${tall ? 'min-h-[320px]' : ''}`}>
      <p className="text-sm font-black text-[#2f2415]">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-[#8a7456]">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ObjectifsGraphiquesTab({ plan = {} }) {
  const chart = plan.chartData || {};
  const zootechnical = plan.zootechnical || [];

  const g1 = useMemo(() => {
    const ages = Array.from({ length: 25 }, (_, i) => i * 20);
    const theoretical = ages.map((age) => theoreticalStandardAtAge('PONDEUSE_RHODE', age));
    const pondeuse = zootechnical.find((z) => z.workshop === 'pondeuses');
    const realSeries = ages.map((age) => (pondeuse && Math.abs(age - pondeuse.ageDays) < 15 ? pondeuse.realValue : null));
    return { ages, theoretical, realSeries };
  }, [zootechnical]);

  const g2Data = chart.g2 || [];
  const g3 = chart.g3 || { months: [], caReal: [], breakEvenLine: [], caTarget: [] };
  const g5 = chart.g5 || [];
  const g6 = chart.g6 || {};
  const g7 = chart.g7 || [];

  const g4Option = useMemo(() => {
    const lots = chart.g4 || [];
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 80, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'value', name: 'Jours', min: 0, max: 120 },
      yAxis: { type: 'category', data: lots.map((l) => l.lot) },
      series: [{
        type: 'bar',
        data: lots.map((l) => l.ageDays),
        itemStyle: { color: '#2f855a' },
        label: { show: true, position: 'right', formatter: ({ value }) => `J+${value}` },
      }],
    };
  }, [chart.g4]);

  const g6Option = useMemo(() => ({
    series: [{
      type: 'gauge',
      min: 0,
      max: 100,
      progress: { show: true, width: 14 },
      axisLine: { lineStyle: { width: 14 } },
      detail: { formatter: '{value}%', fontSize: 22, fontWeight: 'bold' },
      data: [{ value: g6.attainment || 0, name: 'CA annuel' }],
    }],
  }), [g6.attainment]);

  const g7Option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Coût revient', 'Marché local', 'Prix pratiqué'] },
    xAxis: { type: 'category', data: g7.map((r) => r.activity) },
    yAxis: { type: 'value', name: 'FCFA' },
    series: [
      { name: 'Coût revient', type: 'line', data: g7.map((r) => r.cost), itemStyle: { color: '#c53030' }, lineStyle: { width: 3 } },
      { name: 'Marché local', type: 'line', data: g7.map((r) => r.market), itemStyle: { color: '#2b6cb0' }, lineStyle: { width: 3 } },
      { name: 'Prix pratiqué', type: 'line', data: g7.map((r) => r.practiced), itemStyle: { color: '#2f2415' }, lineStyle: { width: 3 } },
    ],
  }), [g7]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#8a7456] rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-2">
        Tableau de bord décisionnel — 7 graphiques G1 à G7 alimentés par lots, ventes, BP et prix marché.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="G1 — Taux de ponte théorique vs réel" subtitle="Courbes superposées par âge (souche Rhode)">
          <SmartEvolutionChart
            compact
            title=""
            months={g1.ages.map((a) => `J${a}`)}
            leftUnit="%"
            series={[
              { name: 'Théorique souche', type: 'line', unit: '%', data: g1.theoretical, color: '#2b6cb0' },
              { name: 'Réel lot', type: 'line', unit: '%', data: g1.realSeries, color: '#2f855a' },
            ]}
          />
        </ChartCard>

        <ChartCard title="G2 — Écarts de poids chair" subtitle="Vert = conforme, Rouge = retard vs souche">
          <SmartEvolutionChart
            compact
            title=""
            months={g2Data.map((r) => r.lot)}
            leftUnit="g"
            series={[
              { name: 'Réel', type: 'bar', unit: 'g', data: g2Data.map((r) => r.real), color: '#2f855a' },
              { name: 'Objectif', type: 'bar', unit: 'g', data: g2Data.map((r) => r.theoretical), color: '#b7791f' },
            ]}
          />
        </ChartCard>

        <ChartCard title="G3 — CA réel vs seuil de rentabilité (12 mois)" subtitle="Ligne droite = seuil mensuel">
          <SmartEvolutionChart
            compact
            title=""
            months={g3.months}
            leftUnit="FCFA"
            series={[
              { name: 'CA réel', type: 'bar', unit: 'FCFA', data: g3.caReal },
              { name: 'Seuil rentabilité', type: 'line', unit: 'FCFA', data: g3.breakEvenLine, color: '#c53030' },
              { name: 'Objectif BP', type: 'line', unit: 'FCFA', data: g3.caTarget, color: '#805ad5' },
            ]}
          />
        </ChartCard>

        <ChartCard title="G4 — Occupation bâtiments & cycles" subtitle="Durée des lots (proxy Gantt)">
          <ReactECharts option={g4Option} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
        </ChartCard>

        <ChartCard title="G5 — Marges par atelier" subtitle="Objectif vs réalisé">
          <SmartEvolutionChart
            compact
            title=""
            months={g5.map((r) => r.workshop)}
            leftUnit="FCFA"
            series={[
              { name: 'Marge objectif', type: 'bar', unit: 'FCFA', data: g5.map((r) => r.marginTarget) },
              { name: 'Marge réelle', type: 'bar', unit: 'FCFA', data: g5.map((r) => r.marginReal), color: '#2f855a' },
            ]}
          />
        </ChartCard>

        <ChartCard title="G6 — Progression CA annuel" subtitle={`Objectif ${fmtCurrency(g6.annualTarget)}`}>
          <ReactECharts option={g6Option} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
          <p className="text-center text-xs text-[#8a7456] mt-2">Réalisé : {fmtCurrency(g6.annualReal)}</p>
        </ChartCard>
      </div>

      <ChartCard title="G7 — Coût / Marché / Prix pratiqué (année)" subtitle="Triple courbe par activité" tall>
        <ReactECharts option={g7Option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
      </ChartCard>
    </div>
  );
}
