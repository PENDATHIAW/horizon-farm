import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import { buildHealthFollowUp, healthKey, healthTarget, healthTitle, isHealthDone, isHealthOverdue } from '../utils/healthWorkflows';
import SanteV7 from './SanteV7.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function SanteV8(props) {
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const tasks = props.tasks || tasksCrud.rows || [];
  const alertes = props.alertes || alertsCrud.rows || [];

  const createOrReactivateFollowUp = async (row = {}, source = 'santé') => {
    if (!row?.id || !isHealthOverdue(row)) return;
    const followUp = buildHealthFollowUp(row, source);
    if (!followUp) return;
    const key = followUp.key;
    const taskExisting = tasks.find((task) => String(task.task_dedupe_key || task.action_key || task.source_record_id || '') === key);
    const alertExisting = alertes.find((alert) => String(alert.alert_dedupe_key || alert.dedupe_key || alert.source_record_id || '') === key);
    const taskPayload = followUp.task;
    if (taskExisting?.id) await (props.onUpdateTask || tasksCrud.update)?.(taskExisting.id, { ...taskPayload, status: 'a_faire' });
    else await (props.onCreateTask || tasksCrud.create)?.(taskPayload);

    const alertPayload = { ...followUp.alert, linked_task_id: taskExisting?.id || followUp.task.id };
    if (alertExisting?.id) await (props.onUpdateAlert || alertsCrud.update)?.(alertExisting.id, { ...alertPayload, status: 'nouvelle' });
    else await (props.onCreateAlert || alertsCrud.create)?.(alertPayload);

    await (props.onCreateBusinessEvent || eventsCrud.create)?.({ ...followUp.event, linked_task_id: taskExisting?.id || followUp.task.id });
    await Promise.allSettled([props.onRefreshTasks?.(), tasksCrud.refresh?.(), props.onRefreshAlertes?.(), alertsCrud.refresh?.(), props.onRefreshBusinessEvents?.(), eventsCrud.refresh?.()]);
  };

  const closeFollowUp = async (row = {}) => {
    if (!row?.id || !isHealthDone(row)) return;
    const key = healthKey(row);
    const linkedTasks = tasks.filter((task) => String(task.task_dedupe_key || task.action_key || task.source_record_id || '') === key);
    const linkedAlerts = alertes.filter((alert) => String(alert.alert_dedupe_key || alert.dedupe_key || alert.source_record_id || '') === key);
    await Promise.allSettled(linkedTasks.map((task) => (props.onUpdateTask || tasksCrud.update)?.(task.id, { status: 'termine', completed_at: new Date().toISOString() })));
    await Promise.allSettled(linkedAlerts.map((alert) => (props.onUpdateAlert || alertsCrud.update)?.(alert.id, { status: 'resolue', resolved_at: new Date().toISOString() })));
    if (linkedTasks.length || linkedAlerts.length) {
      await (props.onCreateBusinessEvent || eventsCrud.create)?.({
        id: makeId('EVT'),
        event_type: 'sante_retard_resolu',
        module_source: 'sante',
        entity_type: 'health_action',
        entity_id: row.id,
        title: `Soin réalisé · ${healthTitle(row)}`,
        description: `Tâches/alertes santé clôturées pour ${healthTarget(row)}.`,
        event_date: today(),
        severity: 'info',
      });
    }
    await Promise.allSettled([props.onRefreshTasks?.(), tasksCrud.refresh?.(), props.onRefreshAlertes?.(), alertsCrud.refresh?.(), props.onRefreshBusinessEvents?.(), eventsCrud.refresh?.()]);
  };

  const onCreate = async (payload = {}) => {
    await props.onCreate?.(payload);
    await createOrReactivateFollowUp(payload, 'création soin');
    await closeFollowUp(payload);
  };

  const onUpdate = async (id, payload = {}) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    await createOrReactivateFollowUp(after, 'modification soin');
    await closeFollowUp(after);
  };

  return <SanteV7 {...props} tasks={tasks} alertes={alertes} onCreate={onCreate} onUpdate={onUpdate} onCreateTask={props.onCreateTask || tasksCrud.create} onUpdateTask={props.onUpdateTask || tasksCrud.update} onRefreshTasks={props.onRefreshTasks || tasksCrud.refresh} onCreateAlert={props.onCreateAlert || alertsCrud.create} onUpdateAlert={props.onUpdateAlert || alertsCrud.update} onRefreshAlertes={props.onRefreshAlertes || alertsCrud.refresh} onCreateBusinessEvent={props.onCreateBusinessEvent || eventsCrud.create} onRefreshBusinessEvents={props.onRefreshBusinessEvents || eventsCrud.refresh} />;
}
