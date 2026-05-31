import ChartsGrid from '../../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../../components/charts/SmartPieChart.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { buildCommercialChartDataset } from './commercialChartMetrics.js';

function ChartSection({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-black text-[#2f2415]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#8a7456]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AttainmentKpi({ label, actual, target, attainment }) {
  const tone = attainment >= 100 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : attainment >= 75 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{attainment}%</p>
      <p className="mt-1 text-xs">{fmtCurrency(actual)} / {fmtCurrency(target)}</p>
    </div>
  );
}

export default function CommercialEvolution(props) {
  const data = buildCommercialChartDataset(props);
  const monthlyLabels = data.monthly.map((row) => row.mois);
  const volumeLabels = data.volumeVsTarget.map((row) => row.label);
  const commandedTotal = data.totalPaid + data.totalRemaining;

  return (
    <div className="space-y-8">
      {data.undatedOrders > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {data.undatedOrders} vente(s) sans date — exclue(s) des graphiques mensuels.
        </p>
      ) : null}

      <ChartSection
        title="1 · Performance & marge"
        description="CA commandé et marge fiable par mois, puis répartition de la marge par activité."
      >
        <ChartsGrid>
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="CA vs marge fiable"
            subtitle="Histogramme — ventes et marge directe mensuelles"
            months={monthlyLabels}
            leftUnit="FCFA"
            series={[
              { name: 'CA commandé', type: 'bar', unit: 'FCFA', data: data.monthly.map((row) => row.ca) },
              { name: 'Marge fiable', type: 'bar', unit: 'FCFA', data: data.monthly.map((row) => row.marge) },
            ]}
          />
          <SmartPieChart
            moduleName="Commercial"
            compact
            title="Marge par activité"
            subtitle="Camembert — part de marge fiable (coûts renseignés)"
            unit="FCFA"
            items={data.marginByActivity}
            emptyText="Complétez les coûts sources pour voir la marge par activité."
          />
        </ChartsGrid>
      </ChartSection>

      <ChartSection
        title="2 · Volumes & objectifs"
        description="Volumes vendus comparés aux objectifs du plan prévisionnel, par activité (tablettes, sujets, lots…)."
      >
        <ChartsGrid>
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="Volumes réalisés vs objectifs"
            subtitle="Histogramme — quantités par activité (période affichée)"
            months={volumeLabels}
            leftUnit=""
            series={[
              { name: 'Volume réalisé', type: 'bar', data: data.volumeVsTarget.map((row) => row.actualQty) },
              { name: 'Objectif volume', type: 'bar', data: data.volumeVsTarget.map((row) => row.targetQty) },
            ]}
          />
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="CA par activité vs objectif"
            subtitle="Histogramme — montants FCFA par activité"
            months={volumeLabels}
            leftUnit="FCFA"
            series={[
              { name: 'CA réalisé', type: 'bar', unit: 'FCFA', data: data.volumeVsTarget.map((row) => row.actualCa) },
              { name: 'Objectif CA', type: 'bar', unit: 'FCFA', data: data.volumeVsTarget.map((row) => row.targetCa) },
            ]}
          />
        </ChartsGrid>
      </ChartSection>

      <ChartSection
        title="3 · Atteinte des objectifs CA"
        description="Comparaison mensuelle CA réalisé / objectif, avec courbe de taux d'atteinte. Les jauges résument mois, période et année."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AttainmentKpi label={`Mois — ${data.kpis.month.label}`} {...data.kpis.month} />
          <AttainmentKpi label={`Période — ${data.kpis.period.label}`} {...data.kpis.period} />
          <AttainmentKpi label={`Annuel — ${data.kpis.annual.label}`} {...data.kpis.annual} />
        </div>
        <ChartsGrid>
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="CA réalisé vs objectif mensuel"
            subtitle="Histogramme + courbe — taux d'atteinte %"
            months={data.targetAttainment.map((row) => row.mois)}
            leftUnit="FCFA"
            rightUnit="%"
            series={[
              { name: 'CA réalisé', type: 'bar', unit: 'FCFA', data: data.targetAttainment.map((row) => row.realise) },
              { name: 'Objectif CA', type: 'bar', unit: 'FCFA', data: data.targetAttainment.map((row) => row.objectif) },
              { name: 'Taux atteinte', type: 'line', unit: '%', axis: 'right', data: data.targetAttainment.map((row) => row.attainment) },
            ]}
          />
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="Taux d'atteinte par activité"
            subtitle="Courbe — % objectif volume et CA atteints"
            months={volumeLabels}
            leftUnit="%"
            series={[
              { name: 'Atteinte volume', type: 'line', unit: '%', data: data.volumeVsTarget.map((row) => row.attainmentQty) },
              { name: 'Atteinte CA activité', type: 'line', unit: '%', data: data.volumeVsTarget.map((row) => row.attainmentCa) },
            ]}
          />
        </ChartsGrid>
      </ChartSection>

      <ChartSection
        title="4 · Encaissements & créances"
        description="Suivi du cash réellement encaissé par rapport au CA commandé."
      >
        <ChartsGrid>
          <SmartPieChart
            moduleName="Commercial"
            compact
            title="Répartition encaissements"
            subtitle={`Camembert — ${fmtNumber(commandedTotal)} FCFA commandés au total`}
            unit="FCFA"
            items={[
              { name: 'Encaissé', value: data.totalPaid },
              { name: 'Impayés', value: data.totalRemaining },
            ]}
          />
          <SmartEvolutionChart
            moduleName="Commercial"
            compact
            title="CA commandé vs encaissé"
            subtitle="Histogramme — suivi mensuel du cash"
            months={monthlyLabels}
            leftUnit="FCFA"
            series={[
              { name: 'CA commandé', type: 'bar', unit: 'FCFA', data: data.monthly.map((row) => row.ca) },
            ]}
          />
        </ChartsGrid>
      </ChartSection>
    </div>
  );
}
