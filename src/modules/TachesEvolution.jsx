import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtNumber } from '../utils/format';

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

export default function TachesEvolution({ rows = [], onNavigate }) {
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
  const ouvertes = data.reduce((sum, row) => sum + row.ouvertes, 0);
  const retard = data.reduce((sum, row) => sum + row.retard, 0);
  return <div className="space-y-3"><SmartEvolutionChart moduleName="Tâches" title="Évolution tâches & priorités" subtitle="Tâches ouvertes, terminées, en retard et sensibles" months={data.map((row) => row.month)} leftUnit="tâches" rightUnit="tâches" series={[{ name: 'Ouvertes', type: 'bar', unit: 'tâches', data: data.map((row) => row.ouvertes) }, { name: 'Terminées', type: 'bar', unit: 'tâches', data: data.map((row) => row.terminees) }, { name: 'Retard', type: 'line', axis: 'right', unit: 'tâches', data: data.map((row) => row.retard) }, { name: 'Sensibles', type: 'line', axis: 'right', unit: 'tâches', data: data.map((row) => row.critiques) }]} reportPayload={{ taches_ouvertes: fmtNumber(ouvertes), taches_en_retard: fmtNumber(retard), total_taches: fmtNumber(rows.length) }} /><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><p><b>Interprétation :</b> {retard > 0 ? `${retard} tâche(s) en retard à traiter.` : 'Pas de retard majeur visible sur la période.'}</p><button type="button" onClick={() => onNavigate?.('taches')} className="mt-2 font-bold text-emerald-700">Action recommandée : traiter les tâches sensibles</button></div></div>;
}
