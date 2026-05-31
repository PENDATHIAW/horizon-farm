import ChartsGrid from '../../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../../components/charts/SmartPieChart.jsx';
import { buildCommercialChartDataset } from './commercialChartMetrics.js';

function ChartSection({ title, question, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-black text-[#2f2415]">{title}</h2>
        {question ? <p className="mt-1 text-sm font-semibold text-[#9a6b12]">{question}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AttainmentKpi({ label, hint, actual, target, attainment }) {
  const tone = attainment >= 100
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : attainment >= 75
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      {hint ? <p className="mt-0.5 text-[10px] font-medium normal-case opacity-75">{hint}</p> : null}
      <p className="mt-1 text-2xl font-black">{attainment}%</p>
      <p className="mt-1 text-xs">{actual.toLocaleString('fr-FR')} / {target.toLocaleString('fr-FR')} FCFA</p>
    </div>
  );
}

export default function CommercialEvolution(props) {
  const data = buildCommercialChartDataset(props);
  const monthlyLabels = data.monthly.map((row) => row.mois);
  const activityLabels = data.volumeVsTarget.map((row) => row.label);

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-2 text-sm text-[#5f4b2f]">
        <span className="font-bold text-[#2f2415]">Année 1 d&apos;activité</span>
        {' — '}
        démarrage {new Date(data.activityYear.startDate).toLocaleDateString('fr-FR')}
        {' · '}
        {data.activityYear.year1Label}
        {' · '}
        objectifs calés sur 12 mois après le démarrage (BP Investissements à terme).
      </p>
      {data.undatedOrders > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {data.undatedOrders} vente(s) sans date — exclue(s) des graphiques mensuels.
        </p>
      ) : null}

      <ChartSection title="1 · Performance & marge" question="Est-ce que je gagne de l'argent, et où ?">
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

      <ChartSection title="3 · Atteinte CA" question="Suis-je dans le plan ?">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AttainmentKpi label="Mois en cours" {...data.kpis.month} />
          <AttainmentKpi label="Période ERP" {...data.kpis.period} />
          <AttainmentKpi label="Année 1" hint={data.activityYear.year1Label.replace(/^Année 1\s*/, '')} {...data.kpis.annual} />
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
              { name: 'Taux d\'atteinte', type: 'line', unit: '%', axis: 'right', color: '#c53030', showLabels: true, data: data.targetAttainment.map((row) => row.attainment) },
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
              { name: 'Taux atteinte CA', type: 'line', unit: '%', color: '#2b6cb0', data: data.volumeVsTarget.map((row) => row.attainmentCa) },
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
