import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { toNumber } from '../utils/format';

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

export default function EquipementsEvolution({ rows = [], tasks = [] }) {
  const data = lastMonths(6).map((month) => {
    const created = arr(rows).filter((row) => monthKey(row.purchase_date || row.date || row.created_at) === month);
    const taskRows = arr(tasks).filter((row) => monthKey(row.due_date || row.date || row.created_at) === month && String(row.module_lie || row.source_module || '').includes('equip'));
    const activeRows = arr(rows);
    return {
      month,
      valeur: created.reduce((sum, row) => sum + toNumber(row.purchase_cost), 0),
      carburant: activeRows.reduce((sum, row) => sum + toNumber(row.fuel_cost), 0),
      maintenance: taskRows.length + activeRows.filter((row) => status(row) === 'maintenance').length,
      pannes: activeRows.filter((row) => status(row) === 'panne').length,
    };
  });

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Équipements" compact title="Achats vs carburant" subtitle="Histogramme — coûts matériel" months={data.map((row) => row.month)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Valeur achats', type: 'bar', unit: 'FCFA', data: data.map((row) => row.valeur) },
        { name: 'Carburant', type: 'bar', unit: 'FCFA', data: data.map((row) => row.carburant) },
      ]} />
      <SmartEvolutionChart moduleName="Équipements" compact title="Maintenances vs pannes" subtitle="Courbes — suivi maintenance" months={data.map((row) => row.month)} leftUnit="nb" rightUnit="" series={[
        { name: 'Maintenances', type: 'line', unit: 'nb', data: data.map((row) => row.maintenance) },
        { name: 'Pannes', type: 'line', unit: 'nb', data: data.map((row) => row.pannes) },
      ]} />
    </ChartsGrid>
  );
}
