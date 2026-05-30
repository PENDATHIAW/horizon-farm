import { Bell, BrainCircuit, ClipboardList, GitBranch, ListTodo, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createAlertResolutionTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import { aggregatePriorityQueue, buildActiviteCoherenceRows, buildActiviteHealthSnapshot, countOpenByModule } from './activiteSuivi/activiteSuiviVisionHelpers.js';
import AlertesCenterV2 from './AlertesCenterV2.jsx';
import TachesV3 from './TachesV3.jsx';
import TracabiliteV2 from './TracabiliteV2.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(low(r.status || r.statut || r.state));
const isLate = (r = {}) => ['retard', 'en_retard', 'overdue'].includes(low(r.status || r.statut || r.state));
const isCriticalAlert = (r = {}) => ['urgence', 'critique', 'critical'].includes(low(r.severity || r.gravite));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{children}</section>;
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="activite_suivi" active={active} onChange={onChange} />;
}

function ActiviteIaPanel({ findings = [], predictions = [], onApply, busyId, setTab }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA activité">
      <p className="mb-3 text-sm text-[#8a7456]">Alertes, tâches critiques, retards et traçabilité croisés avec tous les modules ERP.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTab(f.source_records?.[0]?.type === 'alert' ? 'Alertes' : 'Tâches')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Voir</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : 'Créer tâche'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><b>{p.title}</b><p className="text-xs text-[#8a7456]">{p.description}</p></div>
        ))}
      </div>
    </Section>
  );
}

function CoherencePanel({ rows = [], onApply, busyId, setTab }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab(row.type === 'alerte' ? 'Alertes' : 'Tâches')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}

function PriorityQueuePanel({ queue = [], onResolveAlert, busyId, setTab }) {
  if (!queue.length) return null;
  return (
    <Section icon={Bell} title="File prioritaire">
      {queue.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab(item.kind === 'alerte' ? 'Alertes' : 'Tâches')} className="text-left"><b className="text-[#2f2415]">{item.title}</b><p className="text-xs text-[#8a7456]">{item.detail} · {item.severity}</p></button>
          {item.kind === 'alerte' ? (
            <button type="button" disabled={busyId === item.id} onClick={() => onResolveAlert?.(item)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === item.id ? '…' : 'Créer tâche'}</button>
          ) : (
            <button type="button" onClick={() => setTab('Tâches')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Traiter</button>
          )}
        </div>
      ))}
    </Section>
  );
}

function Summary({ data, setTab, onApply, onResolveAlert, busyId }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé suivi" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Alertes ouvertes" value={fmtNumber(data.openAlerts.length)} tone={data.openAlerts.length ? 'warn' : 'good'} />
        <Stat label="Critiques" value={fmtNumber(data.criticalAlerts.length)} tone={data.criticalAlerts.length ? 'bad' : 'good'} />
        <Stat label="Tâches ouvertes" value={fmtNumber(data.openTasks.length)} tone={data.openTasks.length ? 'warn' : 'good'} />
        <Stat label="En retard" value={fmtNumber(data.lateTasks.length)} tone={data.lateTasks.length ? 'bad' : 'good'} />
        <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
        <Stat label="Sans tâche liée" value={fmtNumber(data.coherenceRows.filter((r) => r.type === 'alerte').length)} tone={data.coherenceRows.length ? 'warn' : 'good'} />
        <Stat label="Événements" value={fmtNumber(data.events.length)} />
      </div>
      <ActiviteIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} setTab={setTab} />
      <PriorityQueuePanel queue={data.priorityQueue} onResolveAlert={onResolveAlert} busyId={busyId} setTab={setTab} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} setTab={setTab} />
      {data.moduleBreakdown.length ? (
        <Section icon={ClipboardList} title="Charge par module source">
          {data.moduleBreakdown.map(([mod, count]) => (
            <div key={mod} className="flex items-center justify-between border-b border-[#eadcc2]/70 py-3 last:border-b-0">
              <span className="font-black text-[#2f2415]">{mod}</span>
              <span className="text-sm font-black text-amber-700">{count} ouvert(s)</span>
            </div>
          ))}
        </Section>
      ) : null}
      <Section icon={ListTodo} title="Workflows de suivi récupérés">
        <p className="text-sm text-[#8a7456]">Alertes préventives, tâches Hey Horizon, routines ferme, résolution croisée alerte/tâche et traçabilité métier.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <button type="button" onClick={() => { emitHorizonForm('taches', 'task_creation', 'Nouvelle tâche', { due_date: new Date().toISOString().slice(0, 10) }); setTab('Tâches'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Tâche</b><p className="mt-1 text-sm text-[#8a7456]">Routine ou action terrain.</p></button>
          <button type="button" onClick={() => setTab('Alertes')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Alertes</b><p className="mt-1 text-sm text-[#8a7456]">Critiques et préventives.</p></button>
          <button type="button" onClick={() => setTab('Tâches')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Tâches</b><p className="mt-1 text-sm text-[#8a7456]">Retards et priorités.</p></button>
          <button type="button" onClick={() => setTab('Traçabilité')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Traçabilité</b><p className="mt-1 text-sm text-[#8a7456]">Historique métier.</p></button>
        </div>
      </Section>
    </div>
  );
}

export default function ActiviteSuiviRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const [busyId, setBusyId] = useState(null);
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
  const data = useMemo(() => {
    const openAlerts = alertes.filter(isOpen);
    const criticalAlerts = openAlerts.filter(isCriticalAlert);
    const openTasks = tasks.filter(isOpen);
    const lateTasks = tasks.filter(isLate);
    const healthSnap = buildActiviteHealthSnapshot({ tasks, alertes, businessEvents: events });
    const coherenceRows = buildActiviteCoherenceRows(tasks, alertes);
    const priorityQueue = aggregatePriorityQueue(tasks, alertes);
    const moduleBreakdown = countOpenByModule(alertes, tasks);
    return {
      openAlerts,
      criticalAlerts,
      openTasks,
      lateTasks,
      events,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      priorityQueue,
      moduleBreakdown,
    };
  }, [alertes, tasks, events]);
  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  };
  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Tâche IA créée');
      else { toast.success('Onglet ouvert'); setTab('Tâches'); }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const resolveAlert = async (item) => {
    setBusyId(item.id);
    try {
      await createAlertResolutionTask({
        alertTitle: item.title,
        alertId: item.sourceId,
        actionLabel: item.detail,
        handlers: actionHandlers,
      });
      toast.success(`Tâche créée pour : ${item.title}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const shared = { ...props, alertes, tasks, rows: tasks, businessEvents: events, events, auditLogs: rowsOf(props.auditLogs, auditCrud), animaux: rowsOf(props.animaux, animalsCrud), lots: rowsOf(props.lots, lotsCrud), avicole: rowsOf(props.lots, lotsCrud), sante: rowsOf(props.sante || props.vaccins, santeCrud), stocks: rowsOf(props.stocks, stockCrud), cultures: rowsOf(props.cultures, culturesCrud), sensorDevices: rowsOf(props.sensorDevices, sensorsCrud), whatsappTemplates: rowsOf(props.whatsappTemplates, whatsappTemplatesCrud), whatsappLogs: rowsOf(props.whatsappLogs, whatsappLogsCrud), onCreate: props.onCreateTask || tasksCrud.create, onUpdate: props.onUpdateTask || tasksCrud.update, onDelete: props.onDeleteTask || tasksCrud.remove, onRefresh: props.onRefreshTasks || tasksCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Suivi</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Suivi</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Alertes, tâches, traçabilité — cohérence IA priorités et retards.</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} onResolveAlert={resolveAlert} busyId={busyId} /> : tab === 'Alertes' ? <AlertesCenterV2 {...shared} onUpdate={shared.onUpdateAlert} onRefresh={shared.onRefreshAlertes} /> : tab === 'Tâches' ? <TachesV3 {...shared} /> : tab === 'Traçabilité' ? <TracabiliteV2 {...shared} rows={rowsOf(props.tracabilite, traceCrud)} onCreate={props.onCreateTrace || traceCrud.create} onUpdate={props.onUpdateTrace || traceCrud.update} onDelete={props.onDeleteTrace || traceCrud.remove} onRefresh={props.onRefreshTrace || traceCrud.refresh} /> : <ModuleGraphiquesTab moduleId="activite_suivi" taches={tasks} alertes={alertes} onNavigate={props.onNavigate} />}
    </div>
  );
}
