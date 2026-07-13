import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import SmartEvolutionChart from '../../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { buildDecisionCenterData, BROILER_IC_TARGET, STOCK_CRITICAL_DAYS } from './decisionCenterMetrics.js';
import { Empty, Section, TabIntro, VisionKpi } from './visionUtils';

function GaugeBar({ label, pct, daysLeft, tone }) {
  const color = tone === 'bad' ? 'bg-urgent' : tone === 'warn' ? 'bg-vigilance' : 'bg-positive';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-earth">{label}</span>
        <span className={tone === 'bad' ? 'text-urgent font-semibold' : 'text-slate'}>{daysLeft.toFixed(1)} j · {fmtNumber(Math.round(pct))}%</span>
      </div>
      <div className="h-3 rounded-full bg-line overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function VisionDecisionGraphiquesTab(props) {
  const data = useMemo(() => buildDecisionCenterData(props), [props]);
  const { graphiques, maraichage } = data;

  return (
    <div className="space-y-6">
      <TabIntro
        title="Graphiques décisionnels"
        detail="Avicole, embouche, logistique aliments et simulateur maraîcher - repérer anomalies et opportunités en un coup d'œil."
      />

      <Section icon={BarChart3} title="Élevage avicole - ponte vs consommation aliment">
        <p className="mb-3 text-xs text-slate">Courbe : taux de ponte réel (%). Histogramme : aliment consommé (kg/j). Anomalie si ponte baisse et consommation reste haute.</p>
        {graphiques.avicoleDaily.length ? (
          <SmartEvolutionChart
            title="Ponte & alimentation quotidiennes"
            labels={graphiques.avicoleDaily.map((d) => d.date.slice(5))}
            series={[
              { name: 'Taux ponte (%)', type: 'line', data: graphiques.avicoleDaily.map((d) => Number(d.layingRate.toFixed(1))), unit: '%', axis: 'left' },
              { name: 'Aliment (kg)', type: 'bar', data: graphiques.avicoleDaily.map((d) => Number(d.feedKg.toFixed(1))), unit: 'kg', axis: 'right' },
            ]}
            leftUnit="%"
            rightUnit="kg"
          />
        ) : (
          <Empty>Ajoutez journaux de ponte et consommations aliment pour alimenter le graphique combiné.</Empty>
        )}
      </Section>

      <Section icon={BarChart3} title="Poulets de chair - Indice de consommation (IC) par lot">
        <p className="mb-3 text-xs text-slate">IC = Aliment total (kg) ÷ Poids vif total (kg). Cible {BROILER_IC_TARGET.min}–{BROILER_IC_TARGET.max}.</p>
        {graphiques.broilerIC.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-meta uppercase tracking-normal text-slate">
                  <th className="py-2 pr-4">Lot</th>
                  <th className="py-2 pr-4">Aliment (kg)</th>
                  <th className="py-2 pr-4">Poids vif (kg)</th>
                  <th className="py-2">IC</th>
                </tr>
              </thead>
              <tbody>
                {graphiques.broilerIC.map((row) => (
                  <tr key={row.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 font-semibold text-earth">{row.label}</td>
                    <td className="py-2 pr-4">{fmtNumber(Math.round(row.feedKg))}</td>
                    <td className="py-2 pr-4">{fmtNumber(Math.round(row.liveWeightKg))}</td>
                    <td className={`py-2 font-semibold ${row.tone === 'bad' ? 'text-urgent' : 'text-positive'}`}>{row.ic.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Aucun lot chair en fin de bande avec données aliment et poids.</Empty>
        )}
      </Section>

      <Section icon={BarChart3} title="Embouche bovine - GMQ & MCA flash">
        {graphiques.cattleGMQ.length ? (
          <>
            <SmartEvolutionChart
              title="GMQ par semaine d'engraissement"
              labels={graphiques.cattleGMQ.map((d) => d.label.slice(0, 12))}
              series={[{ name: 'GMQ (g/j)', type: 'line', data: graphiques.cattleGMQ.map((d) => d.gmq), unit: 'g' }]}
              leftUnit="g/j"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {graphiques.cattleGMQ.slice(0, 6).map((row) => (
                <VisionKpi
                  key={row.id}
                  label={`MCA ${row.label}`}
                  value={fmtCurrency(row.mcaFlash)}
                  tone={row.mcaFlash < 0 ? 'bad' : 'good'}
                  detail={`GMQ ${fmtNumber(row.gmq)} g · S${row.weeks}`}
                />
              ))}
            </div>
          </>
        ) : (
          <Empty>Ajoutez pesées et coûts d'achat/ration pour tracer la courbe GMQ et la MCA par tête.</Empty>
        )}
      </Section>

      <Section icon={BarChart3} title="Logistique & aliments - jauges silos">
        <p className="mb-3 text-xs text-slate">Jours restants = Stock (kg) ÷ Consommation quotidienne. Alerte rouge si &lt; {STOCK_CRITICAL_DAYS} jours.</p>
        {graphiques.siloLevels.length ? (
          <div className="space-y-4">
            {graphiques.siloLevels.map((row) => (
              <GaugeBar key={row.id} label={row.label} pct={row.pct} daysLeft={row.daysLeft} tone={row.tone} />
            ))}
          </div>
        ) : (
          <Empty>Créez des stocks aliment et des journaux de consommation pour les jauges d'autonomie.</Empty>
        )}
      </Section>

      <Section icon={BarChart3} title="Futur maraîchage - matrice d'assolement">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-meta uppercase tracking-normal text-slate">
                <th className="py-2 pr-3">Culture</th>
                <th className="py-2 pr-3">Rendement kg/m²</th>
                <th className="py-2 pr-3">Prix/kg</th>
                <th className="py-2 pr-3">Intrants/m²</th>
                <th className="py-2">Marge/ha</th>
              </tr>
            </thead>
            <tbody>
              {maraichage.cropSimulation.map((row) => (
                <tr key={row.key} className="border-b border-line/60">
                  <td className="py-2 pr-3 font-semibold">{row.label}</td>
                  <td className="py-2 pr-3">{row.yieldKgM2}</td>
                  <td className="py-2 pr-3">{fmtCurrency(row.priceKg)}</td>
                  <td className="py-2 pr-3">{fmtCurrency(row.seedCostM2)}</td>
                  <td className={`py-2 font-semibold ${row.tone === 'good' ? 'text-positive' : 'text-horizon-dark'}`}>{fmtCurrency(row.marginHa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {maraichage.effluent.active ? (
          <p className="mt-3 text-xs text-positive">
            Bonus effluents : {fmtNumber(maraichage.effluent.bagsSaved)} sacs d'engrais chimiques économisés → {fmtCurrency(maraichage.effluent.fertilizerSavings)} sur le coût maraîcher.
          </p>
        ) : null}
      </Section>
    </div>
  );
}
