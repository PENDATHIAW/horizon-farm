import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import SanteV7 from './SanteV7.jsx';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(norm(row.statut || row.status || row.etat));
const isDone = (row = {}) => ['fait', 'termine', 'terminé', 'realise', 'réalisé', 'administre', 'administré', 'ok'].includes(norm(row.statut || row.status || row.etat));
const healthKey = (row = {}) => `health-action:${row.id || row.source_record_id || row.animal_id || row.lot_id || row.target_id || row.nom || row.name}`;
const titleOf = (row = {}) => row.nom || row.name || row.title || row.type_soin || row.type || row.vaccin || row.id || 'Soin santé';
const targetOf = (row = {}) => row.animal_id || row.lot_id || row.target_id || row.related_id || row.entity_id || row.sujet || 'cible non renseignée';

export default function SanteV8(props) {
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const tasks = props.tasks || tasksCrud.rows || [];
  const alertes = props.alertes || alertsCrud.rows || [];

  const createOrReactivateFollowUp = async (row = {}, source = 'santé') => {
    if (!row?.id || !isOverdue(row)) return;
    const key = healthKey(row);
    const taskExisting = tasks.find((task) => String(task.task_dedupe_key || task.action_key || task.source_record_id || '') === key);
    const alertExisting = alertes.find((alert) => String(alert.alert_dedupe_key || alert.dedupe_key || alert.source_record_id || '') === key);
    const title = `Soin en retard · ${titleOf(row)}`;
    const description = `Cible: ${targetOf(row)} · Source: ${source}`;

    const taskPayload = {
      task_dedupe_key: key,
      action_key: key,
      title,
      module_lie: 'sante',
      source_module: 'sante',
      source_record_id: key,
      related_id: row.id,
      due_date: row.date_prevue || row.date_rappel || row.date || today(),
      priority: 'haute',
      status: 'a_faire',
      checklist: 'Vérifier la cible;Préparer le produit;Réaliser le soin;Mettre à jour la fiche santé',
      notes: description,
    };
    if (taskExisting?.id) await (props.onUpdateTask || tasksCrud.update)?.(taskExisting.id, { ...taskPayload, status: 'a_faire' });
    else await (props.onCreateTask || tasksCrud.create)?.({ id: makeId('TSK'), ...taskPayload });

    const alertPayload = {
      alert_dedupe_key: key,
      dedupe_key: key,
      title,
      message: description,
      module_source: 'sante',
      entity_type: 'health_action',
      entity_id: row.id,
      severity: 'haute',
      status: 'nouvelle',
      action_recommandee: 'Planifier et réaliser le soin, puis marquer la fiche comme faite.',
      source_record_id: key,
    };
    if (alertExisting?.id) await (props.onUpdateAlert || alertsCrud.update)?.(alertExisting.id, { ...alertPayload, status: 'nouvelle' });
    else await (props.onCreateAlert || alertsCrud.create)?.({ id: makeId('ALT'), ...alertPayload });

    await (props.onCreateBusinessEvent || eventsCrud.create)?.({
      id: makeId('EVT'),
      event_type: 'sante_retard_detecte',
      module_source: 'sante',
      entity_type: 'health_action',
      entity_id: row.id,
      title,
      description,
      event_date: today(),
      severity: 'warning',
      linked_task_key: key,
      linked_alert_key: key,
      saisies_evitees: 2,
    });
    await Promise.allSettled([props.onRefreshTasks?.(), tasksCrud.refresh?.(), props.onRefreshAlertes?.(), alertsCrud.refresh?.(), props.onRefreshBusinessEvents?.(), eventsCrud.refresh?.()]);
  };

  const closeFollowUp = async (row = {}) => {
    if (!row?.id || !isDone(row)) return;
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
        title: `Soin réalisé · ${titleOf(row)}`,
        description: `Tâches/alertes santé clôturées pour ${targetOf(row)}.`,
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
