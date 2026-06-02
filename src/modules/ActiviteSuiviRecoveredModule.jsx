import { Bell, GitBranch, ListTodo, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createAlertResolutionTask } from '../services/heyHorizonRecommendationActions.js';
import { resolveActiviteSuiviTab } from '../utils/commercialNavigation';
import { fmtNumber } from '../utils/format';
import { filterRealOpenTasks } from '../utils/healthFindingLabels.js';
import { allRows, rowsOf } from '../utils/moduleRows';
import ActiviteSuiviInsightPanel from './activiteSuivi/ActiviteSuiviInsightPanel.jsx';
import ActiviteSuiviModuleBreakdownPanel from './activiteSuivi/ActiviteSuiviModuleBreakdownPanel.jsx';
import ActiviteSuiviPriorityPanel from './activiteSuivi/ActiviteSuiviPriorityPanel.jsx';
import { buildActiviteSummaryTodos, uniqueTodoCount } from './activiteSuivi/activiteSuiviMetrics.js';
import {
  ACTIVITE_ACTION_GRID,
  ACTIVITE_STAT_GRID,
  ActiviteActionCard,
  ActiviteKpi,
  ActiviteSection,
  ActiviteTodoRow,
} from './activiteSuivi/activiteSuiviUi.jsx';
import { aggregatePriorityQueue, buildActiviteCoherenceRows, buildActiviteHealthSnapshot, countOpenByModule } from './activiteSuivi/activiteSuiviVisionHelpers.js';
import AlertesCenterV2 from './AlertesCenterV2.jsx';
import TachesV3 from './TachesV3.jsx';
import TracabiliteV2 from './TracabiliteV2.jsx';

const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(low(r.status || r.statut || r.state));
const isLate = (r = {}) => ['retard', 'en_retard', 'overdue'].includes(low(r.status || r.statut || r.state));
const isCriticalAlert = (r = {}) => ['urgence', 'critique', 'critical'].includes(low(r.severity || r.gravite));

function Summary({ data, setTab, onApply, onResolveAlert, busyId, onNavigate }) {
  const todos = buildActiviteSummaryTodos(data).slice(0, 6);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <ActiviteSection
        title="Parcours activité & suivi"
        subtitle="Alertes sur Alertes · tâches terrain sur Tâches · historique métier sur Traçabilité · analyses IA sur Centre décisionnel."
      >
        <div className={ACTIVITE_ACTION_GRID}>
          <ActiviteActionCard
            icon={Plus}
            title="+ Tâche"
            text="Routine ou action terrain."
            onClick={() => {
              emitHorizonForm('taches', 'task_creation', 'Nouvelle tâche', { due_date: today });
              setTab('Tâches');
            }}
          />
          <ActiviteActionCard
            icon={Bell}
            title="Alertes"
            text={`${data.openAlerts.length} ouverte(s) · ${data.criticalAlerts.length} critique(s).`}
            onClick={() => setTab('Alertes')}
          />
          <ActiviteActionCard
            icon={ListTodo}
            title="Tâches"
            text={`${data.lateTasks.length} en retard.`}
            onClick={() => setTab('Tâches')}
          />
          <ActiviteActionCard
            icon={GitBranch}
            title="Traçabilité"
            text={`${data.events.length} événement(s) métier.`}
            onClick={() => setTab('Traçabilité')}
          />
        </div>
      </ActiviteSection>

      <div className={ACTIVITE_STAT_GRID}>
        <ActiviteKpi label="Santé suivi" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <ActiviteKpi label="Alertes ouvertes" value={fmtNumber(data.openAlerts.length)} tone={data.openAlerts.length ? 'warn' : 'good'} onClick={() => setTab('Alertes')} />
        <ActiviteKpi label="Tâches ouvertes" value={fmtNumber(data.openTasks.length)} tone={data.openTasks.length ? 'warn' : 'good'} onClick={() => setTab('Tâches')} />
        <ActiviteKpi label="En retard" value={fmtNumber(data.lateTasks.length)} tone={data.lateTasks.length ? 'bad' : 'good'} onClick={() => setTab('Tâches')} />
      </div>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-[#2f2415]">À traiter aujourd&apos;hui</h2>
            <p className="text-[11px] text-[#8a7456]">Alertes critiques, retards, résolutions sans tâche liée.</p>
          </div>
          {data.todoCount > 0 ? (
            <button type="button" onClick={() => setTab(todos[0]?.tab || 'Tâches')} className="text-xs font-black text-[#9a6b12]">
              Voir →
            </button>
          ) : null}
        </div>
        {todos.length ? (
          <div className="divide-y divide-[#eadcc2]/60">
            {todos.map((row) => (
              <ActiviteTodoRow
                key={row.id}
                title={row.title}
                detail={row.detail}
                actionLabel={row.kind === 'alerte' ? 'Créer tâche' : 'Ouvrir'}
                busy={row.kind === 'alerte' && busyId === row.id}
                onOpen={() => setTab(row.tab)}
                onAction={() => {
                  if (row.kind === 'alerte') onResolveAlert?.({ id: row.id, title: row.title, detail: row.detail, sourceId: row.sourceId });
                  else setTab(row.tab);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
            Alertes et tâches sont à jour.
          </div>
        )}
      </section>

      <ActiviteSuiviInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApply}
        onNavigate={onNavigate}
        setTab={setTab}
        busyId={busyId}
      />
    </div>
  );
}

function AlertesTab({ shared, priorityQueue, onResolveAlert, busyId, setTab }) {
  return (
    <div className="space-y-4">
      <ActiviteSuiviPriorityPanel items={priorityQueue} kind="alerte" onResolveAlert={onResolveAlert} busyId={busyId} setTab={setTab} />
      <AlertesCenterV2 {...shared} onUpdate={shared.onUpdateAlert} onRefresh={shared.onRefreshAlertes} />
    </div>
  );
}

function TachesTab({ shared, priorityQueue, setTab }) {
  return (
    <div className="space-y-4">
      <ActiviteSuiviPriorityPanel items={priorityQueue} kind="tache" setTab={setTab} />
      <TachesV3 {...shared} />
    </div>
  );
}

function TraceTab({ shared, breakdown, eventCount, onNavigate, traceProps }) {
  return (
    <div className="space-y-4">
      <ActiviteSection title="Historique métier" subtitle={`${eventCount} événement(s) croisés avec alertes, tâches et modules ERP.`}>
        <p className="text-sm text-[#8a7456]">
          La traçabilité consolide les mouvements terrain — les actions opérationnelles restent sur Alertes et Tâches.
        </p>
      </ActiviteSection>
      <ActiviteSuiviModuleBreakdownPanel breakdown={breakdown} onNavigate={onNavigate} />
      <TracabiliteV2 {...shared} {...traceProps} />
    </div>
  );
}

export default function ActiviteSuiviRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveActiviteSuiviTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (props.initialTab) setTab(resolveActiviteSuiviTab(props.initialTab));
  }, [props.initialTab]);

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
  const periodFiltered = Boolean(props.periodFiltered);
  const alertes = rowsOf(props.alertes, alertsCrud, false);
  const tasks = rowsOf(props.taches || props.tasks, tasksCrud, false);
  const eventsAll = allRows(props.businessEventsAll, eventsCrud);
  const eventsPeriod = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const traceRows = allRows(props.tracabiliteAll, traceCrud).length
    ? allRows(props.tracabiliteAll, traceCrud)
    : rowsOf(props.tracabilite, traceCrud, periodFiltered);
  const auditLogsAll = allRows(props.auditLogsAll, auditCrud).length
    ? allRows(props.auditLogsAll, auditCrud)
    : rowsOf(props.auditLogs, auditCrud, periodFiltered);

  const data = useMemo(() => {
    const openAlerts = alertes.filter(isOpen);
    const criticalAlerts = openAlerts.filter(isCriticalAlert);
    const openTasks = filterRealOpenTasks(tasks);
    const lateTasks = openTasks.filter(isLate);
    const healthSnap = buildActiviteHealthSnapshot({ tasks, alertes, businessEvents: eventsAll.length ? eventsAll : eventsPeriod });
    const coherenceRows = buildActiviteCoherenceRows(tasks, alertes);
    const priorityQueue = aggregatePriorityQueue(tasks, alertes);
    const moduleBreakdown = countOpenByModule(alertes, tasks);
    const summaryTodos = buildActiviteSummaryTodos({ priorityQueue, coherenceRows });

    return {
      openAlerts,
      criticalAlerts,
      openTasks,
      lateTasks,
      events: eventsAll.length ? eventsAll : eventsPeriod,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      priorityQueue,
      moduleBreakdown,
      todoCount: uniqueTodoCount(summaryTodos),
    };
  }, [alertes, tasks, eventsAll, eventsPeriod]);

  const tabBadges = useMemo(
    () => ({
      Alertes: data.openAlerts.length || undefined,
      Tâches: data.openTasks.length || undefined,
    }),
    [data.openAlerts.length, data.openTasks.length],
  );

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
      else {
        toast.success('Onglet ouvert');
        setTab(finding.source_records?.[0]?.type === 'alert' ? 'Alertes' : 'Tâches');
      }
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

  const shared = {
    ...props,
    alertes,
    tasks,
    rows: tasks,
    businessEvents: eventsAll.length ? eventsAll : eventsPeriod,
    events: eventsAll.length ? eventsAll : eventsPeriod,
    auditLogs: auditLogsAll,
    animaux: rowsOf(props.animaux, animalsCrud, false),
    lots: rowsOf(props.lots, lotsCrud, false),
    avicole: rowsOf(props.lots, lotsCrud, false),
    sante: rowsOf(props.sante || props.vaccins, santeCrud, false),
    stocks: rowsOf(props.stocks, stockCrud, false),
    cultures: rowsOf(props.cultures, culturesCrud, false),
    sensorDevices: rowsOf(props.sensorDevices, sensorsCrud, false),
    whatsappTemplates: rowsOf(props.whatsappTemplates, whatsappTemplatesCrud, false),
    whatsappLogs: rowsOf(props.whatsappLogs, whatsappLogsCrud, false),
    onCreate: props.onCreateTask || tasksCrud.create,
    onUpdate: props.onUpdateTask || tasksCrud.update,
    onDelete: props.onDeleteTask || tasksCrud.remove,
    onRefresh: props.onRefreshTasks || tasksCrud.refresh,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  };

  const traceProps = {
    rows: traceRows,
    onCreate: props.onCreateTrace || traceCrud.create,
    onUpdate: props.onUpdateTrace || traceCrud.update,
    onDelete: props.onDeleteTrace || traceCrud.remove,
    onRefresh: props.onRefreshTrace || traceCrud.refresh,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Suivi</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Suivi</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Alertes, tâches, traçabilité — signaux IA légers, détail sur chaque onglet.</p>
            {props.periodLabel ? (
              <div className="mt-2">
                <PeriodScopeBadge label={props.periodLabel} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${data.healthScore >= 75 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              Santé {data.healthScore}/100
            </span>
            {data.criticalAlerts.length > 0 ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-800">
                {data.criticalAlerts.length} critique(s)
              </span>
            ) : null}
            {data.lateTasks.length > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                {data.lateTasks.length} en retard
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="activite_suivi" active={tab} onChange={setTab} tabBadges={tabBadges} wrap />

      {tab === 'Résumé' ? (
        <Summary data={data} setTab={setTab} onApply={applyFinding} onResolveAlert={resolveAlert} busyId={busyId} onNavigate={props.onNavigate} />
      ) : tab === 'Alertes' ? (
        <AlertesTab shared={shared} priorityQueue={data.priorityQueue} onResolveAlert={resolveAlert} busyId={busyId} setTab={setTab} />
      ) : tab === 'Tâches' ? (
        <TachesTab shared={shared} priorityQueue={data.priorityQueue} setTab={setTab} />
      ) : tab === 'Traçabilité' ? (
        <TraceTab shared={shared} breakdown={data.moduleBreakdown} eventCount={data.events.length} onNavigate={props.onNavigate} traceProps={traceProps} />
      ) : tab === 'Annexe' ? (
        <ModuleAnnexeTab
          moduleId="activite_suivi"
          dataMap={{ alertes_center: alertes, taches: tasks, business_events: rowsOf(props.businessEvents, eventsCrud, periodFiltered) }}
          onNavigate={props.onNavigate}
        />
      ) : (
        <ModuleGraphiquesTab moduleId="activite_suivi" taches={tasks} alertes={alertes} onNavigate={props.onNavigate} />
      )}
    </div>
  );
}
