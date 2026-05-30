import { AlertTriangle, BellRing, CheckCircle2, ClipboardList, Link2, Timer } from 'lucide-react';
import { analyzeTaskAlertIntegrity } from '../services/taskAlertIntegrityService';

const MODULE_LABELS = { animaux: 'Animaux', avicole: 'Avicole', cultures: 'Cultures', stock: 'Stock', finances: 'Finances', clients: 'Clients', fournisseurs: 'Fournisseurs', smartfarm: 'Smart Farm', equipements: 'Équipements', sante: 'Santé', ventes: 'Ventes', documents: 'Documents', taches: 'Tâches', alertes: 'Alertes', alertes_center: 'Alertes', business_events: 'Historique métier', audit_logs: 'Journal activité', autre: 'Autre' };
const ISSUE_LABELS = { critical_alert_without_task: 'Alerte urgente sans tâche', duplicate_task: 'Tâche possiblement en double', late_task: 'Tâche en retard', orphan_task: 'Tâche sans lien clair' };
const label = (row = {}) => row.title || row.titre || row.message || row.description || row.id || 'Élément';
const source = (row = {}) => {
  const key = String(row.module_lie || row.source_module || row.module_source || row.module || '').toLowerCase();
  return MODULE_LABELS[key] || key.replace(/_/g, ' ') || 'À préciser';
};
const issueLabel = (type) => ISSUE_LABELS[type] || String(type || '').replace(/_/g, ' ') || 'À vérifier';

function Card({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
  </div>;
}

export default function TaskAlertQualityControl({ tasks = [], alerts = [] }) {
  const audit = analyzeTaskAlertIntegrity({ tasks, alerts });
  const risky = audit.issues.slice(0, 12);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><ClipboardList size={20} /> Contrôle tâches & alertes</p>
        <p className="mt-1 text-sm text-[#8a7456]">Vérifie les alertes sans tâche, les doublons, les retards et les actions à préciser.</p>
      </div>
      <div className={`${audit.issueCount ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} rounded-2xl border px-4 py-3 text-sm font-bold`}>
        {audit.issueCount ? `${audit.issueCount} point(s) à regarder` : 'Tâches & alertes cohérentes'}
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={BellRing} label="Alertes sans tâche" value={audit.criticalWithoutTask} danger={audit.criticalWithoutTask > 0} />
      <Card icon={ClipboardList} label="Tâches en double" value={audit.duplicateTasks} danger={audit.duplicateTasks > 0} />
      <Card icon={Timer} label="Tâches en retard" value={audit.lateTasks} danger={audit.lateTasks > 0} />
      <Card icon={Link2} label="À préciser" value={audit.orphanTasks} danger={audit.orphanTasks > 0} />
    </div>

    {risky.length ? <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Élément</th><th className="py-2 px-3">Espace</th><th className="py-2 px-3">À regarder</th><th className="py-2 px-3">Niveau</th></tr></thead>
        <tbody>{risky.map((issue, i) => {
          const item = issue.task || issue.alert || issue;
          return <tr key={`${issue.id}-${i}`} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{label(item)}<p className="text-xs text-[#8a7456]">{item.id || issue.id}</p></td><td className="py-3 px-3">{source(item)}</td><td className="py-3 px-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{issueLabel(issue.type)}</span></td><td className={`py-3 px-3 font-bold ${issue.severity === 'danger' ? 'text-red-600' : 'text-amber-700'}`}>{issue.severity === 'danger' ? 'Urgent' : 'À vérifier'}</td></tr>;
        })}</tbody>
      </table>
    </div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Les tâches et alertes semblent bien suivies.</div>}
  </section>;
}
