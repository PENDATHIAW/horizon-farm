import { AlertTriangle, Bell, CheckCircle2, ClipboardList, GitBranch, History, WifiOff } from 'lucide-react';
import Btn from '../components/Btn';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').toLowerCase();
const MODULE_LABELS = { animaux: 'Animaux', avicole: 'Avicole', cultures: 'Cultures', stock: 'Stock', finances: 'Finances', clients: 'Clients', fournisseurs: 'Fournisseurs', smartfarm: 'Smart Farm', equipements: 'Équipements', sante: 'Santé', ventes: 'Ventes', documents: 'Documents', taches: 'Tâches', business_events: 'Historique métier', audit_logs: 'Journal activité', alertes_center: 'Alertes', alertes: 'Alertes', autre: 'Autre' };
const isTaskClosed = (row = {}) => ['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(clean(row.status || row.statut));
const isAlertClosed = (row = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed'].includes(clean(row.status || row.statut));
const isCritical = (row = {}) => ['critique', 'critical', 'urgence', 'haute'].includes(clean(row.severity || row.gravite || row.priority || row.priorite));
const moduleKeyOf = (row = {}) => clean(row.module_source || row.source_module || row.module_lie || row.module || 'autre');
const moduleOf = (row = {}) => MODULE_LABELS[moduleKeyOf(row)] || moduleKeyOf(row).replace(/_/g, ' ') || 'Autre';
const rowTitle = (row = {}) => row.title || row.titre || row.message || row.event_type || row.id || 'Action';
const rowDate = (row = {}) => row.due_date || row.date || row.event_date || row.created_at || row.updated_at || '';

function buildModuleStats({ tasks = [], alerts = [], events = [] }) {
  const map = new Map();
  const ensure = (module) => {
    const key = module || 'autre';
    const current = map.get(key) || { module: key, tasks: 0, alerts: 0, events: 0, critical: 0 };
    map.set(key, current);
    return current;
  };
  arr(tasks).forEach((task) => { const item = ensure(moduleOf(task)); item.tasks += 1; if (isCritical(task)) item.critical += 1; });
  arr(alerts).forEach((alert) => { const item = ensure(moduleOf(alert)); item.alerts += 1; if (isCritical(alert)) item.critical += 1; });
  arr(events).forEach((event) => { const item = ensure(moduleOf(event)); item.events += 1; if (isCritical(event)) item.critical += 1; });
  return Array.from(map.values()).sort((a, b) => b.critical - a.critical || (b.tasks + b.alerts) - (a.tasks + a.alerts));
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={14} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><b className="block text-earth break-words">{value}</b><span className="text-xs text-slate">{label}</span></div>;
}

export default function ActionTraceHealth({ tasks = [], alertes = [], alerts = [], events = [], auditLogs = [], online = true, onNavigate }) {
  const alertRows = arr(alertes).length ? alertes : alerts;
  const openTasks = arr(tasks).filter((row) => !isTaskClosed(row));
  const openAlerts = arr(alertRows).filter((row) => !isAlertClosed(row));
  const criticalEvents = arr(events).filter(isCritical);
  const lateTasks = openTasks.filter((task) => rowDate(task) && String(rowDate(task)).slice(0, 10) < new Date().toISOString().slice(0, 10));
  const stats = buildModuleStats({ tasks: openTasks, alerts: openAlerts, events: criticalEvents }).slice(0, 6);
  const priorities = [...openTasks.map((row) => ({ ...row, kind: 'Tâche' })), ...openAlerts.map((row) => ({ ...row, kind: 'Alerte' })), ...criticalEvents.map((row) => ({ ...row, kind: 'Fait' }))]
    .sort((a, b) => Number(isCritical(b)) - Number(isCritical(a)) || String(rowDate(b)).localeCompare(String(rowDate(a))))
    .slice(0, 6);

  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><GitBranch size={15} /> Actions & traçabilité</p>
        <h3 className="text-xl font-semibold text-earth mt-1">Ce qui reste à traiter</h3>
        <p className="text-sm text-slate mt-1">Vue commune des tâches, alertes, faits critiques et synchronisation.</p>
      </div>
      {!online ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><WifiOff size={15} className="inline" /> Hors ligne : vérifier la synchronisation.</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Connexion active</div>}
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-sm">
      <Mini icon={ClipboardList} label="Tâches ouvertes" value={openTasks.length} danger={openTasks.length > 0} />
      <Mini icon={Bell} label="Alertes ouvertes" value={openAlerts.length} danger={openAlerts.length > 0} />
      <Mini icon={AlertTriangle} label="Faits critiques" value={criticalEvents.length} danger={criticalEvents.length > 0} />
      <Mini icon={History} label="Logs activité" value={arr(auditLogs).length} />
      <Mini icon={AlertTriangle} label="Tâches en retard" value={lateTasks.length} danger={lateTasks.length > 0} />
      <Mini icon={GitBranch} label="Modules concernés" value={stats.length} danger={stats.some((row) => row.critical > 0)} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth">Priorités</p>
        <div className="mt-3 space-y-2 text-sm">
          {priorities.length ? priorities.map((row) => <div key={`${row.kind}-${row.id || rowTitle(row)}`} className="rounded-xl border border-line bg-white px-3 py-2"><div className="flex items-start justify-between gap-2"><b className="text-earth">{row.kind} · {rowTitle(row)}</b>{isCritical(row) ? <span className="rounded-full bg-vigilance-bg px-2 py-1 text-xs font-semibold text-horizon-dark">prioritaire</span> : null}</div><p className="text-xs text-slate">{moduleOf(row)} · {rowDate(row) || 'date non renseignée'}</p></div>) : <div className="rounded-xl border border-positive bg-positive-bg px-3 py-2 text-positive">Aucune action urgente ouverte.</div>}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth">Modules à surveiller</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {stats.length ? stats.map((row) => <div key={row.module} className={`rounded-xl border px-3 py-2 ${row.critical ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><b className="text-earth">{row.module}</b><p className="text-xs text-slate">{row.tasks} tâche(s) · {row.alerts} alerte(s) · {row.events} fait(s)</p></div>) : <div className="rounded-xl border border-positive bg-positive-bg px-3 py-2 text-positive">Aucun module sous pression.</div>}
        </div>
      </div>
    </div>

    <div className="flex flex-wrap justify-end gap-2"><Btn small variant="outline" onClick={() => onNavigate?.('taches')}>Ouvrir tâches</Btn><Btn small variant="outline" onClick={() => onNavigate?.('alertes')}>Ouvrir alertes</Btn><Btn small variant="outline" onClick={() => onNavigate?.('tracabilite')}>Ouvrir traçabilité</Btn><Btn small variant="outline" onClick={() => onNavigate?.('sync_activity')}>Ouvrir sync</Btn></div>
  </section>;
}
