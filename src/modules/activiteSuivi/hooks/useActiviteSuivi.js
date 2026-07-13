import { useMemo } from 'react';
import useCrudModule from '../../../hooks/useCrudModule';
import { allRows, rowsOf } from '../../../utils/moduleRows';
import { filterRealOpenTasks } from '../../../utils/healthFindingLabels.js';
import {
  aggregatePriorityQueue,
  buildActiviteCoherenceRows,
  buildActiviteHealthSnapshot,
  countOpenByModule,
} from '../activiteSuiviVisionHelpers.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(low(r.status || r.statut || r.state));
const isLate = (r = {}) => ['retard', 'en_retard', 'overdue'].includes(low(r.status || r.statut || r.state));
const isCriticalAlert = (r = {}) => ['urgence', 'critique', 'critical'].includes(low(r.severity || r.gravite));

export function useActiviteSuivi(props = {}) {
  const alertsCrud = useCrudModule('alertes_center');
  const tasksCrud = useCrudModule('taches');
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
  const auditLogsAll = allRows(props.auditLogsAll, auditCrud).length
    ? allRows(props.auditLogsAll, auditCrud)
    : rowsOf(props.auditLogs, auditCrud, periodFiltered);

  const data = useMemo(() => {
    const openAlerts = alertes.filter(isOpen);
    const criticalAlerts = openAlerts.filter(isCriticalAlert);
    const openTasks = filterRealOpenTasks(tasks);
    const lateTasks = openTasks.filter(isLate);
    const events = eventsAll.length ? eventsAll : eventsPeriod;
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
      auditLogs: auditLogsAll,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      priorityQueue,
      moduleBreakdown,
      counts: {
        alertes: openAlerts.length,
        taches: openTasks.length,
        openTotal: openAlerts.length + openTasks.length,
      },
    };
  }, [alertes, tasks, eventsAll, eventsPeriod, auditLogsAll]);

  const actionHandlers = useMemo(() => ({
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  }), [props, tasksCrud, alertsCrud, eventsCrud]);

  const bridgeProps = useMemo(() => ({
    alertes,
    tasks,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onNavigate: props.onNavigate,
  }), [alertes, tasks, props, tasksCrud, alertsCrud, eventsCrud]);

  const shared = useMemo(() => ({
    ...props,
    alertes,
    tasks,
    rows: tasks,
    businessEvents: data.events,
    events: data.events,
    auditLogs: data.auditLogs,
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
  }), [props, alertes, tasks, data.events, data.auditLogs, animalsCrud, lotsCrud, santeCrud, stockCrud, culturesCrud, sensorsCrud, whatsappTemplatesCrud, whatsappLogsCrud, tasksCrud, alertsCrud, eventsCrud]);

  const workflowBridgeProps = useMemo(() => ({
    props,
    alertes,
    tasks,
    recommendations: arr(props.recommendations),
    businessEvents: data.events,
    documents: arr(props.documents),
    transactions: arr(props.transactions || props.finances),
  }), [props, alertes, tasks, data.events]);

  const refresh = async () => {
    await Promise.allSettled([
      alertsCrud.refresh?.(),
      tasksCrud.refresh?.(),
      eventsCrud.refresh?.(),
      auditCrud.refresh?.(),
      props.onRefreshTasks?.(),
      props.onRefreshAlertes?.(),
      props.onRefreshBusinessEvents?.(),
    ]);
  };

  return {
    data,
    alertes,
    tasks,
    periodFiltered,
    actionHandlers,
    bridgeProps,
    shared,
    workflowBridgeProps,
    refresh,
    crud: { alertsCrud, tasksCrud, eventsCrud, auditCrud },
  };
}
