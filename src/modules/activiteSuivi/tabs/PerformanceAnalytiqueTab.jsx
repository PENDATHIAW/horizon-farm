import ChartsGrid from '../../../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../../../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../../../components/charts/SmartPieChart.jsx';
import { fmtNumber } from '../../../utils/format';
import TachesEvolution from '../../TachesEvolution.jsx';
import { ActiviteKpi, ActiviteSection } from '../activiteSuiviUi.jsx';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(low(r.status || r.statut || r.state));
const severityOf = (r = {}) => low(r.severity || r.gravite || 'moyenne');

function AlertesVolumePanel({ alertes = [] }) {
  const open = arr(alertes).filter(isOpen);
  const buckets = {
    critique: open.filter((r) => severityOf(r).includes('crit') || severityOf(r).includes('urg')).length,
    moyenne: open.filter((r) => severityOf(r).includes('moy')).length,
    faible: open.filter((r) => !severityOf(r).includes('crit') && !severityOf(r).includes('urg') && !severityOf(r).includes('moy')).length,
  };
  const total = open.length || 1;

  return (
    <ActiviteSection title="Volume alertes ouvertes" subtitle="Répartition par gravité — complète la vue tâches ci-dessous.">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <ActiviteKpi label="Critiques" value={fmtNumber(buckets.critique)} tone={buckets.critique ? 'bad' : 'good'} />
        <ActiviteKpi label="Moyennes" value={fmtNumber(buckets.moyenne)} tone={buckets.moyenne ? 'warn' : 'good'} />
        <ActiviteKpi label="Faibles" value={fmtNumber(buckets.faible)} tone="neutral" />
      </div>
      <ChartsGrid>
        <SmartPieChart
          moduleName="Alertes"
          compact
          title="Mix gravité"
          subtitle="Alertes ouvertes"
          data={[
            { name: 'Critiques', value: buckets.critique },
            { name: 'Moyennes', value: buckets.moyenne },
            { name: 'Faibles', value: buckets.faible },
          ].filter((row) => row.value > 0)}
        />
        <SmartEvolutionChart
          moduleName="Alertes"
          compact
          title="Ouvertes vs résolues (stock)"
          subtitle="Vue instantanée"
          months={['Ouvertes', 'Résolues']}
          leftUnit="alertes"
          rightUnit=""
          series={[
            { name: 'Volume', type: 'bar', unit: 'alertes', data: [open.length, arr(alertes).length - open.length] },
          ]}
        />
      </ChartsGrid>
    </ActiviteSection>
  );
}

export default function PerformanceAnalytiqueTab({ data, tasks, alertes, onNavigate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ActiviteKpi label="Tâches ouvertes" value={fmtNumber(data.openTasks.length)} tone={data.openTasks.length ? 'warn' : 'good'} />
        <ActiviteKpi label="En retard" value={fmtNumber(data.lateTasks.length)} tone={data.lateTasks.length ? 'bad' : 'good'} />
        <ActiviteKpi label="Alertes ouvertes" value={fmtNumber(data.openAlerts.length)} tone={data.openAlerts.length ? 'warn' : 'good'} />
        <ActiviteKpi label="Événements tracés" value={fmtNumber(data.events.length)} />
      </div>
      <AlertesVolumePanel alertes={alertes} />
      <ActiviteSection title="Évolution des tâches" subtitle="Histogrammes ouvertes / terminées / retards sur 6 mois.">
        <TachesEvolution rows={tasks} onNavigate={onNavigate} />
      </ActiviteSection>
    </div>
  );
}
