import { AlertTriangle, BarChart3, Bell, CheckCircle2, ClipboardList, GitBranch, ListTodo, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtNumber } from '../utils/format';

const arr = (v) => Array.isArray(v) ? v : [];
const low = (v) => String(v || '').toLowerCase();
const dateOf = (r = {}) => r.date || r.event_date || r.due_date || r.created_at || r.updated_at || '—';
const labelOf = (r = {}) => r.title || r.nom || r.name || r.libelle || r.event_type || r.type || r.id || 'Élément';
const detailOf = (r = {}) => r.message || r.description || r.notes || r.module_source || r.module || r.category || r.categorie || 'Suivi';
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu', 'archived'].includes(low(r.status || r.statut || r.state));
const isCritical = (r = {}) => ['critique', 'critical', 'urgent', 'haute', 'high'].includes(low(r.priority || r.priorite || r.severity || r.niveau));
const isLate = (r = {}) => ['retard', 'en_retard', 'overdue'].includes(low(r.status || r.statut || r.state)) || (r.due_date && new Date(r.due_date) < new Date() && isOpen(r));
const toneOf = (r = {}) => isCritical(r) || isLate(r) ? 'warn' : isOpen(r) ? 'neutral' : 'good';
const valueOf = (r = {}) => isLate(r) ? 'Retard' : isCritical(r) ? 'Urgent' : isOpen(r) ? 'Ouvert' : 'OK';

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
function Button({ children, onClick }) { return <button type="button" onClick={onClick} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">{children}</button>; }
function Pill({ children, tone = 'neutral' }) { const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'; return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>; }
function Row({ title, detail, value, tone = 'neutral', onClick }) { return <button type="button" onClick={onClick} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]"><span className="font-black text-[#2f2415]">{title}</span><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></button>; }
function Field({ label, value }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className="mt-1 font-black text-[#2f2415]">{value}</p></div>; }
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }
function Tabs({ active, onChange }) { const tabs = ['Résumé', 'Alertes', 'Tâches', 'Traçabilité', 'Contrôles', 'Historique', 'Graphiques']; return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map((tab) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}>{tab}</button>)}</div></div>; }

function Summary({ data, setTab }) { return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Alertes ouvertes" value={fmtNumber(data.openAlerts.length)} tone={data.openAlerts.length ? 'warn' : 'good'} /><Stat label="Tâches ouvertes" value={fmtNumber(data.openTasks.length)} tone={data.openTasks.length ? 'warn' : 'good'} /><Stat label="En retard" value={fmtNumber(data.lateTasks.length)} tone={data.lateTasks.length ? 'warn' : 'good'} /><Stat label="Événements" value={fmtNumber(data.events.length)} /><Stat label="Contrôles" value={fmtNumber(data.controls.length)} /></div><Section icon={ClipboardList} title="Priorités" action={<Button onClick={() => setTab('Tâches')}>Voir tâches</Button>}>{data.priorities.length ? data.priorities.map((r) => <Row key={r.uid} title={r.title} detail={r.detail} value={r.value} tone={r.tone} onClick={() => setTab(r.tab)} />) : <Empty label="Aucune priorité." />}</Section></div>; }
function ListTab({ icon, title, rows, empty, selected, setSelected }) { const row = selected || rows[0]; const Icon = icon; return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]"><Section icon={Icon} title={title}>{rows.length ? rows.slice(0, 14).map((r) => <Row key={r.id || labelOf(r)} title={labelOf(r)} detail={`${dateOf(r)} · ${detailOf(r)}`} value={valueOf(r)} tone={toneOf(r)} onClick={() => setSelected?.(r)} />) : <Empty label={empty} />}</Section><Section icon={Search} title="Fiche sélectionnée"><div className="space-y-3">{row ? <><Field label="Titre" value={labelOf(row)} /><Field label="Date" value={dateOf(row)} /><Field label="Statut" value={row.status || row.statut || row.state || valueOf(row)} /><Field label="Priorité" value={row.priority || row.priorite || row.severity || '—'} /><Field label="Origine" value={row.module_source || row.module || row.target_type || '—'} /><Field label="Détail" value={detailOf(row)} /></> : <Empty label="Aucun élément sélectionné." />}</div></Section></div>; }
function Controls({ data }) { return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat label="Contrôles" value={fmtNumber(data.controls.length)} /><Stat label="À vérifier" value={fmtNumber(data.controls.filter(isOpen).length)} tone={data.controls.filter(isOpen).length ? 'warn' : 'good'} /><Stat label="Critiques" value={fmtNumber(data.controls.filter(isCritical).length)} tone={data.controls.filter(isCritical).length ? 'warn' : 'good'} /><Stat label="Validés" value={fmtNumber(data.controls.filter((r) => !isOpen(r)).length)} tone="good" /></div><Section icon={ShieldCheck} title="Contrôles à faire">{data.controls.length ? data.controls.slice(0, 14).map((r) => <Row key={r.id || labelOf(r)} title={labelOf(r)} detail={`${dateOf(r)} · ${detailOf(r)}`} value={valueOf(r)} tone={toneOf(r)} />) : <Empty label="Aucun contrôle." />}</Section></div>; }
function Graphs({ data }) { return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat label="Ouvert" value={fmtNumber(data.openAlerts.length + data.openTasks.length)} tone="warn" /><Stat label="Retard" value={fmtNumber(data.lateTasks.length)} tone={data.lateTasks.length ? 'warn' : 'good'} /><Stat label="Historique" value={fmtNumber(data.history.length)} /><Stat label="Traçabilité" value={fmtNumber(data.traceRows.length)} /></div><Section icon={BarChart3} title="Graphiques"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5"><div className="space-y-4"><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>Tâches terminées</span><span>{fmtNumber(data.doneTasks.length)}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-[#22c55e]" style={{ width: `${data.tasks.length ? Math.min(100, (data.doneTasks.length / data.tasks.length) * 100) : 0}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>Alertes ouvertes</span><span>{fmtNumber(data.openAlerts.length)}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-amber-500" style={{ width: `${data.alerts.length ? Math.min(100, (data.openAlerts.length / data.alerts.length) * 100) : 0}%` }} /></div></div></div></div></Section></div>; }

export default function ActiviteSuiviModule({ alertes = [], taches = [], tasks = [], tracabilite = [], businessEvents = [], auditLogs = [] }) {
  const [tab, setTab] = useState('Résumé');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const data = useMemo(() => {
    const alerts = arr(alertes);
    const taskRows = arr(taches).length ? arr(taches) : arr(tasks);
    const traceRows = [...arr(tracabilite), ...arr(businessEvents)].filter(Boolean);
    const logs = arr(auditLogs);
    const openAlerts = alerts.filter(isOpen);
    const openTasks = taskRows.filter(isOpen);
    const lateTasks = taskRows.filter(isLate);
    const doneTasks = taskRows.filter((r) => !isOpen(r));
    const controls = [...openAlerts.filter(isCritical), ...lateTasks, ...logs.filter(isOpen)].slice(0, 40);
    const history = [...traceRows, ...alerts, ...taskRows, ...logs].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))));
    const priorities = [
      ...openAlerts.slice(0, 4).map((r) => ({ uid: `alert-${r.id || labelOf(r)}`, title: labelOf(r), detail: detailOf(r), value: valueOf(r), tone: toneOf(r), tab: 'Alertes' })),
      ...lateTasks.slice(0, 4).map((r) => ({ uid: `task-${r.id || labelOf(r)}`, title: labelOf(r), detail: detailOf(r), value: 'Retard', tone: 'warn', tab: 'Tâches' })),
      ...controls.slice(0, 3).map((r) => ({ uid: `control-${r.id || labelOf(r)}`, title: labelOf(r), detail: detailOf(r), value: valueOf(r), tone: toneOf(r), tab: 'Contrôles' })),
    ].slice(0, 10);
    return { alerts, tasks: taskRows, traceRows, logs, openAlerts, openTasks, lateTasks, doneTasks, controls, history, events: traceRows, priorities };
  }, [alertes, taches, tasks, tracabilite, businessEvents, auditLogs]);
  const content = tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Alertes' ? <ListTab icon={Bell} title="Alertes" rows={data.alerts} empty="Aucune alerte." selected={selectedAlert} setSelected={setSelectedAlert} /> : tab === 'Tâches' ? <ListTab icon={ListTodo} title="Tâches" rows={data.tasks} empty="Aucune tâche." selected={selectedTask} setSelected={setSelectedTask} /> : tab === 'Traçabilité' ? <ListTab icon={GitBranch} title="Traçabilité" rows={data.traceRows} empty="Aucun événement de traçabilité." selected={selectedTrace} setSelected={setSelectedTrace} /> : tab === 'Contrôles' ? <Controls data={data} /> : tab === 'Historique' ? <ListTab icon={ClipboardList} title="Historique" rows={data.history} empty="Aucun historique." /> : <Graphs data={data} />;
  return <div className="space-y-6"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Suivi</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Suivi</h1></div><div className="flex flex-wrap gap-2"><Button onClick={() => setTab('Alertes')}>Alertes</Button><Button onClick={() => setTab('Tâches')}>Tâches</Button><Button onClick={() => setTab('Traçabilité')}>Traçabilité</Button></div></div></div><Tabs active={tab} onChange={setTab} />{content}</div>;
}
