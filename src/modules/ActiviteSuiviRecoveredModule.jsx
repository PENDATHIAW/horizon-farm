import { Bell, ClipboardList, GitBranch, ListTodo } from 'lucide-react';
import { useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import AlertesCenterV2 from './AlertesCenterV2.jsx';
import TachesV3 from './TachesV3.jsx';
import TracabiliteV2 from './TracabiliteV2.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(low(r.status || r.statut || r.state));
const isLate = (r = {}) => ['retard', 'en_retard', 'overdue'].includes(low(r.status || r.statut || r.state));
const isCriticalAlert = (r = {}) => ['urgence', 'critique'].includes(low(r.severity || r.gravite));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="activite_suivi" active={active} onChange={onChange} />;
}
function Summary({ data, setTab }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Alertes ouvertes" value={data.openAlerts.length} tone={data.openAlerts.length ? 'warn' : 'good'} /><Stat label="Critiques" value={data.criticalAlerts.length} tone={data.criticalAlerts.length ? 'warn' : 'good'} /><Stat label="Tâches ouvertes" value={data.openTasks.length} tone={data.openTasks.length ? 'warn' : 'good'} /><Stat label="En retard" value={data.lateTasks.length} tone={data.lateTasks.length ? 'warn' : 'good'} /><Stat label="Événements" value={data.events.length} /></div><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">Workflows de suivi récupérés</h2><p className="mt-2 text-sm text-[#8a7456]">Alertes préventives, tâches Hey Horizon, routines ferme, résolution croisée alerte/tâche et traçabilité métier sont reconnectées.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button type="button" onClick={() => setTab('Alertes')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">Alertes</button><button type="button" onClick={() => setTab('Tâches')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">Tâches</button><button type="button" onClick={() => setTab('Traçabilité')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">Traçabilité</button></div></section></div>;
}

export default function ActiviteSuiviRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const alertsCrud = useCrudModule('alertes_center');
  const tasksCrud = useCrudModule('taches');
  const traceCrud = useCrudModule('tracabilite');
  const eventsCrud = useCrudModule('business_events');
  const auditCrud = useCrudModule('audit_logs');
  const animalsCrud = useCrudModule('animaux');
  const lotsCrud = useCrudModule('avicole');
  const santeCrud = useCrudModule('sante');
  const stockCrud = useCrudModule('stock');
  const culturesCrud = useCrudModule('cultures');
  const sensorsCrud = useCrudModule('sensor_devices');
  const whatsappTemplatesCrud = useCrudModule('whatsapp_templates');
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const alertes = rowsOf(props.alertes, alertsCrud);
  const tasks = rowsOf(props.taches || props.tasks, tasksCrud);
  const events = rowsOf(props.businessEvents, eventsCrud);
  const data = useMemo(() => ({ openAlerts: alertes.filter(isOpen), criticalAlerts: alertes.filter((r) => isOpen(r) && isCriticalAlert(r)), openTasks: tasks.filter(isOpen), lateTasks: tasks.filter(isLate), events }), [alertes, tasks, events]);
  const shared = { ...props, alertes, tasks, rows: tasks, businessEvents: events, events, auditLogs: rowsOf(props.auditLogs, auditCrud), animaux: rowsOf(props.animaux, animalsCrud), lots: rowsOf(props.lots, lotsCrud), avicole: rowsOf(props.lots, lotsCrud), sante: rowsOf(props.sante || props.vaccins, santeCrud), stocks: rowsOf(props.stocks, stockCrud), cultures: rowsOf(props.cultures, culturesCrud), sensorDevices: rowsOf(props.sensorDevices, sensorsCrud), whatsappTemplates: rowsOf(props.whatsappTemplates, whatsappTemplatesCrud), whatsappLogs: rowsOf(props.whatsappLogs, whatsappLogsCrud), onCreate: props.onCreateTask || tasksCrud.create, onUpdate: props.onUpdateTask || tasksCrud.update, onDelete: props.onDeleteTask || tasksCrud.remove, onRefresh: props.onRefreshTasks || tasksCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Suivi</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Suivi</h1><p className="mt-1 text-sm text-[#8a7456]">Alertes, tâches, routines, traçabilité, contrôles et événements métier.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Alertes' ? <AlertesCenterV2 {...shared} onUpdate={shared.onUpdateAlert} onRefresh={shared.onRefreshAlertes} /> : tab === 'Tâches' ? <TachesV3 {...shared} /> : tab === 'Traçabilité' ? <TracabiliteV2 {...shared} rows={rowsOf(props.tracabilite, traceCrud)} onCreate={props.onCreateTrace || traceCrud.create} onUpdate={props.onUpdateTrace || traceCrud.update} onDelete={props.onDeleteTrace || traceCrud.remove} onRefresh={props.onRefreshTrace || traceCrud.refresh} /> : <ModuleGraphiquesTab moduleId="activite_suivi" taches={tasks} onNavigate={props.onNavigate} />}</div>;
}
