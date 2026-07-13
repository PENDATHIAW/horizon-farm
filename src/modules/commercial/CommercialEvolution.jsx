import { useMemo, useState } from 'react';
import ChartsGrid from '../../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../../components/charts/SmartPieChart.jsx';
import { buildCommercialChartDataset } from './commercialChartMetrics.js';
import { applyCommercialChartFilters, buildCommercialFilterOptions } from './commercialChartFilters.js';
import CommercialChartFiltersBar from './CommercialChartFiltersBar.jsx';
import CommercialChartInsightBar from './CommercialChartInsightBar.jsx';
import { activityStartSourceLabel } from '../../utils/activityYear.js';

const arr = (v) => (Array.isArray(v) ? v : []);

function ChartSection({ title, question, chartDataset, insightIds = [], children }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-6 shadow-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-earth">{title}</h2>
        {question ? <p className="mt-1 text-sm font-semibold text-horizon-dark">{question}</p> : null}
      </div>
      {children}
      {chartDataset ? (
        <CommercialChartInsightBar
          chartDataset={chartDataset}
          filterIds={insightIds}
        />
      ) : null}
    </section>
  );
}

function AttainmentKpi({ label, hint, actual, target, attainment }) {
  const tone = attainment >= 100
    ? 'border-positive bg-positive-bg text-positive'
    : attainment >= 75
      ? 'border-vigilance bg-vigilance-bg text-horizon-dark'
      : 'border-urgent bg-urgent-bg text-urgent';
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-meta font-semibold uppercase tracking-normal opacity-80">{label}</p>
      {hint ? <p className="mt-1 text-meta font-medium normal-case opacity-75">{hint}</p> : null}
      <p className="mt-1 text-2xl font-semibold">{attainment}%</p>
      <p className="mt-1 text-xs">{actual.toLocaleString('fr-FR')} / {target.toLocaleString('fr-FR')} FCFA</p>
    </div>
  );
}

export default function CommercialEvolution(props) {
  const [filters, setFilters] = useState({ clientId: '', activityKey: '', productName: '' });
  const baseRows = arr(props.rows || props.salesOrders);
  const filterOptions = useMemo(
    () => buildCommercialFilterOptions({ salesOrders: baseRows, clients: props.clients }),
    [baseRows, props.clients],
  );
  const filteredProps = useMemo(
    () => applyCommercialChartFilters(props, filters),
    [props, filters],
  );
  const data = useMemo(() => buildCommercialChartDataset(filteredProps), [filteredProps]);
  const monthlyLabels = data.monthly.map((row) => row.mois);
  const activityLabels = data.volumeVsTarget.map((row) => row.label);

  return (
    <div className="space-y-6">
      <CommercialChartFiltersBar
        options={filterOptions}
        filters={filters}
        onChange={setFilters}
        periodLabel={props.periodLabel || ''}
        filteredCount={arr(filteredProps.rows).length}
        totalCount={baseRows.length}
      />

      <p className="rounded-xl border border-line bg-card px-4 py-2 text-sm text-slate">
        <span className="font-semibold text-earth">Année 1 d&apos;activité</span>
        {' — '}
        démarrage {new Date(data.activityYear.startDate).toLocaleDateString('fr-FR')}
        {' ('}
        {activityStartSourceLabel(data.activityYear.startSource)}
        {')'}
        {' · '}
        {data.activityYear.year1Label}
        {' · '}
        objectifs calés sur 12 mois après le démarrage (BP Investissements à terme).
      </p>
      {data.undatedOrders > 0 ? (
        <p className="rounded-xl border border-vigilance bg-vigilance-bg px-4 py-2 text-sm text-horizon-dark">
          {data.undatedOrders} vente(s) sans date — exclue(s) des graphiques mensuels.
        </p>
      ) : null}

      <ChartSection title="1 · Performance & marge" question="Est-ce que je gagne de l'argent, et où ?" chartDataset={data} insightIds={['ca-up', 'ca-down', 'margin-down', 'activity-margin']}>
        <ChartsGrid>
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="CA vs marge fiable"
            subtitle="Histogramme — CA commandé et marge directe fiable par mois"
            months={monthlyLabels}
            leftUnit="FCFA"
            legendBottom
            height={420}
            series={[
              { name: 'CA commandé', type: 'bar', unit: 'FCFA', data: data.monthly.map((row) => row.ca) },
              { name: 'Marge fiable', type: 'bar', unit: 'FCFA', data: data.monthly.map((row) => row.marge) },
            ]}
          />
          <SmartPieChart
            moduleName="Commercial"
            compact
            title="Marge par activité"
            subtitle="Camembert — répartition de la marge fiable (coûts sources renseignés)"
            unit="FCFA"
            items={data.marginByActivity}
            emptyText="Complétez les coûts sources (lots, animaux, stock) pour alimenter ce camembert."
          />
        </ChartsGrid>
      </ChartSection>

      <ChartSection title="2 · Volumes & objectifs" question="Est-ce que je vends assez (quantités + CA) ?">
        <ChartsGrid>
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            categoryAxis
            legendBottom
            title="Volumes réalisés vs objectifs"
            subtitle="Histogramme — quantités vendues vs plan prévisionnel par activité"
            months={activityLabels}
            leftUnit=""
            height={440}
            series={[
              { name: 'Volume réalisé', type: 'bar', data: data.volumeVsTarget.map((row) => row.actualQty) },
              { name: 'Objectif volume', type: 'bar', data: data.volumeVsTarget.map((row) => row.targetQty) },
            ]}
          />
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            categoryAxis
            legendBottom
            title="CA par activité vs objectif"
            subtitle="Histogramme — CA réalisé vs objectif CA par activité"
            months={activityLabels}
            leftUnit="FCFA"
            height={440}
            series={[
              { name: 'CA réalisé', type: 'bar', unit: 'FCFA', data: data.volumeVsTarget.map((row) => row.actualCa) },
              { name: 'Objectif CA', type: 'bar', unit: 'FCFA', data: data.volumeVsTarget.map((row) => row.targetCa) },
            ]}
          />
        </ChartsGrid>
      </ChartSection>

      <ChartSection title="3 · Atteinte CA" question="Suis-je dans le plan ?" chartDataset={data} insightIds={['target-month']}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AttainmentKpi label="Mois en cours" {...data.kpis.month} />
          <AttainmentKpi label="Période ERP" {...data.kpis.period} />
          <AttainmentKpi label="Année 1" hint={(data.activityYear?.year1Label || '').replace(/^Année 1\s*/, '')} {...data.kpis.annual} />
        </div>
        <ChartsGrid>
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            legendBottom
            title="CA réalisé vs objectif mensuel"
            subtitle="Histogramme CA + courbe taux d'atteinte % (Année 1)"
            months={data.targetAttainment.map((row) => row.mois)}
            leftUnit="FCFA"
            rightUnit="%"
            height={440}
            series={[
              { name: 'CA réalisé', type: 'bar', unit: 'FCFA', data: data.targetAttainment.map((row) => row.realise) },
              { name: 'Objectif CA', type: 'bar', unit: 'FCFA', data: data.targetAttainment.map((row) => row.objectif) },
              { name: 'Taux d\'atteinte', type: 'line', unit: '%', axis: 'right', color: 'var(--hf-urgent)', showLabels: true, data: data.targetAttainment.map((row) => row.attainment) },
            ]}
          />
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            categoryAxis
            legendBottom
            title="Taux d'atteinte par activité"
            subtitle="Courbe — % objectif CA atteint par activité"
            months={activityLabels}
            leftUnit="%"
            height={400}
            showValueLabels
            series={[
              { name: 'Taux atteinte CA', type: 'line', unit: '%', color: 'var(--hf-neutral)', data: data.volumeVsTarget.map((row) => row.attainmentCa) },
            ]}
          />
        </ChartsGrid>
      </ChartSection>

      <ChartSection title="4 · Encaissements" question="Est-ce que le cash suit ?">
        <ChartsGrid>
          <SmartPieChart
            moduleName="Commercial"
            compact
            title="Encaissé vs impayés"
            subtitle="Camembert — part encaissée et créances restantes"
            unit="FCFA"
            items={[
              { name: 'Encaissé', value: data.totalPaid },
              { name: 'Impayés', value: data.totalRemaining },
            ]}
          />
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            legendBottom
            title="CA mensuel"
            subtitle="Histogramme — chiffre d'affaires commandé par mois"
            months={monthlyLabels}
            leftUnit="FCFA"
            height={400}
            series={[
              { name: 'CA mensuel', type: 'bar', unit: 'FCFA', data: data.monthly.map((row) => row.ca) },
            ]}
          />
        </ChartsGrid>
      </ChartSection>
    </div>
  );
}
