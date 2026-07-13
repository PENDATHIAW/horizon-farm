import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const monthKey = (value) => String(value || new Date().toISOString()).slice(0, 7);
const lastMonths = (count = 6) => {
  const base = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1);
    return date.toISOString().slice(0, 7);
  });
};
const status = (row = {}) => String(row.status || row.statut || '').toLowerCase();
const priority = (row = {}) => String(row.priority || row.priorite || '').toLowerCase();

export default function TachesEvolution({ rows = [] }) {
  const data = lastMonths(6).map((month) => {
    const tasks = arr(rows).filter((row) => monthKey(row.due_date || row.date || row.created_at) === month);
    return {
      month,
      ouvertes: tasks.filter((row) => !['termine', 'terminé', 'done', 'annule', 'annulé'].includes(status(row))).length,
      terminees: tasks.filter((row) => ['termine', 'terminé', 'done'].includes(status(row))).length,
      retard: tasks.filter((row) => status(row) === 'retard').length,
      critiques: tasks.filter((row) => priority(row) === 'critique' || priority(row) === 'haute').length,
    };
  });
  const totalOuvertes = data.reduce((sum, row) => sum + row.ouvertes, 0);
  const totalTerminees = data.reduce((sum, row) => sum + row.terminees, 0);
  const totalRetard = data.reduce((sum, row) => sum + row.retard, 0);

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Tâches" compact title="Ouvertes vs terminées" subtitle="Histogramme - charge de travail" months={data.map((row) => row.month)} leftUnit="tâches" rightUnit="" series={[
        { name: 'Ouvertes', type: 'bar', unit: 'tâches', data: data.map((row) => row.ouvertes) },
        { name: 'Terminées', type: 'bar', unit: 'tâches', data: data.map((row) => row.terminees) },
      ]} />
      <SmartEvolutionChart moduleName="Tâches" compact title="Retard vs sensibles" subtitle="Courbes - vigilance opérationnelle" months={data.map((row) => row.month)} leftUnit="tâches" rightUnit="" series={[
        { name: 'En retard', type: 'line', unit: 'tâches', data: data.map((row) => row.retard) },
        { name: 'Sensibles', type: 'line', unit: 'tâches', data: data.map((row) => row.critiques) },
      ]} />
      <SmartPieChart moduleName="Tâches" compact title="Répartition statuts" subtitle="Camembert - ouvertes / terminées / retard" unit="tâches" items={[
        { name: 'Ouvertes', value: totalOuvertes },
        { name: 'Terminées', value: totalTerminees },
        { name: 'En retard', value: totalRetard },
      ]} />
    </ChartsGrid>
  );
}
