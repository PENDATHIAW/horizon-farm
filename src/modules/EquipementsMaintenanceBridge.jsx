import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const clean = (value) => String(value || '').trim();
const equipmentName = (row = {}) => row.name || row.nom || row.id || 'Équipement';
const isMaintenanceNeeded = (row = {}) => {
  const status = clean(row.status || row.statut).toLowerCase();
  if (['panne', 'maintenance', 'hors_service', 'a_reparer', 'à_réparer'].includes(status)) return true;
  if (row.maintenance_due && new Date(row.maintenance_due) <= new Date()) return true;
  return false;
};
const taskKey = (row = {}) => `equipment_maintenance:${clean(row.id)}`;
const breakdownKey = (row = {}) => `equipment:panne:${clean(row.id)}`;
const isDone = (task = {}) => ['termine', 'terminé', 'annule', 'annulé', 'done', 'closed'].includes(clean(task.status || task.statut).toLowerCase());
function existingTaskFor(row, tasks = []) {
  const key = taskKey(row);
  const id = clean(row.id);
  return arr(tasks).find((task) => !isDone(task) && (clean(task.task_dedupe_key || task.action_key) === key || (clean(task.source_module) === 'equipements' && clean(task.related_id || task.source_record_id) === id)));
}
function linkedAlertFor(row, alertes = []) {
  const keys = [taskKey(row), breakdownKey(row)];
  const id = clean(row.id);
  return arr(alertes).find((alert) => !isDone(alert) && (keys.includes(clean(alert.alert_dedupe_key || alert.action_key)) || (clean(alert.module_source || alert.source_module) === 'equipements' && clean(alert.entity_id || alert.related_id) === id)));
}

export default function EquipementsMaintenanceBridge({ rows = [], tasks = [], alertes = [], onUpdate, onRefresh, onCreateTask, onUpdateTask, onRefreshTasks, onCreateAlert, onUpdateAlert, onRefreshAlertes, onCreateFinanceTransaction, onRefreshFinances, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingId, setSavingId] = useState('');
  const candidates = useMemo(() => arr(rows).filter(isMaintenanceNeeded).map((row) => ({ row, task: existingTaskFor(row, tasks) })).slice(0, 8), [rows, tasks]);

  const createMaintenance = async (row) => {
    if (!row?.id) return toast.error('Équipement invalide');
    const existing = existingTaskFor(row, tasks);
    if (existing) return toast.success('Maintenance déjà en suivi');
    try {
      setSavingId(row.id);
      const cost = toNumber(row.maintenance_cost || row.cout_maintenance || row.repair_cost);
      const taskId = makeId('TSK');
      const trxId = cost > 0 ? makeId('TRX') : '';
      const docId = row.preuve_url || row.invoice_url ? makeId('DOC') : '';
      const key = taskKey(row);
      await onCreateTask?.({ id: taskId, title: `Maintenance ${equipmentName(row)}`, module_lie: 'equipements', source_module: 'equipements', source_record_id: row.id, related_id: row.id, task_dedupe_key: key, action_key: key, due_date: row.maintenance_due || today(), priority: clean(row.status).toLowerCase() === 'panne' ? 'critique' : 'haute', status: 'a_faire', checklist: 'Diagnostiquer; Valider coût; Réparer; Joindre preuve; Remettre en service', notes: row.notes || '' });
      if (cost > 0) await onCreateFinanceTransaction?.({ id: trxId, type: 'sortie', libelle: `Maintenance ${equipmentName(row)}`, montant: cost, date: today(), categorie: 'Maintenance équipements', module_lie: 'equipements', related_id: row.id, source_module: 'equipements', source_record_id: row.id, statut: 'a_payer' });
      if (docId) await onCreateDocument?.({ id: docId, title: `Preuve maintenance ${equipmentName(row)}`, document_category: 'maintenance', module_source: 'equipements', entity_type: 'equipement', entity_id: row.id, related_id: row.id, url: row.preuve_url || row.invoice_url || '', transaction_id: trxId });
      await onCreateAlert?.({ id: makeId('ALT'), title: `Maintenance équipement: ${equipmentName(row)}`, message: `${equipmentName(row)} nécessite une intervention.`, module_source: 'equipements', entity_type: 'equipement', entity_id: row.id, severity: clean(row.status).toLowerCase() === 'panne' ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: 'Planifier et clôturer la maintenance.', alert_dedupe_key: key, linked_task_id: taskId });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'maintenance_equipement_preparee', module_source: 'equipements', entity_type: 'equipement', entity_id: row.id, title: `Maintenance ${equipmentName(row)}`, description: cost > 0 ? fmtCurrency(cost) : 'Coût non renseigné', event_date: today(), severity: clean(row.status).toLowerCase() === 'panne' ? 'critique' : 'warning', linked_task_id: taskId, linked_transaction_id: trxId, linked_document_id: docId, saisies_evitees: 3 });
      await onUpdate?.(row.id, { maintenance_task_id: taskId, maintenance_status: 'a_faire', last_maintenance_alert_at: now() });
      await Promise.allSettled([onRefresh?.(), onRefreshTasks?.(), onRefreshAlertes?.(), onRefreshFinances?.(), onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success('Maintenance préparée');
    } catch {
      toast.error('Préparation maintenance impossible');
    } finally {
      setSavingId('');
    }
  };

  const closeMaintenance = async (row, task) => {
    if (!task?.id) return;
    try {
      setSavingId(row.id);
      await onUpdateTask?.(task.id, { status: 'termine', completed_at: now() });
      const alert = linkedAlertFor(row, alertes);
      if (alert?.id) await onUpdateAlert?.(alert.id, { status: 'resolue', statut: 'resolue', resolved_at: now(), linked_resolution_task_id: task.id });
      await onUpdate?.(row.id, { status: 'operationnel', statut: 'operationnel', maintenance_status: 'termine', last_maintenance_done_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'maintenance_equipement_cloturee', module_source: 'equipements', entity_type: 'equipement', entity_id: row.id, title: `Maintenance clôturée ${equipmentName(row)}`, description: task.title || '', event_date: today(), severity: 'info', linked_task_id: task.id });
      await Promise.allSettled([onRefresh?.(), onRefreshTasks?.(), onRefreshAlertes?.(), onRefreshBusinessEvents?.()]);
      toast.success('Maintenance clôturée');
    } catch {
      toast.error('Clôture maintenance impossible');
    } finally {
      setSavingId('');
    }
  };

  if (!candidates.length) return null;
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Maintenance</p>
          <h3 className="font-black text-[#2f2415]">Équipements à traiter</h3>
          <p className="text-sm text-[#8a7456] mt-1">Prépare tâche, alerte, coût et trace sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><AlertTriangle size={14} className="inline" /> {candidates.length} intervention(s)</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {candidates.map(({ row, task }) => (
          <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="font-bold text-[#2f2415]"><Wrench size={14} className="inline" /> {equipmentName(row)}</p>
            <p className="text-xs text-[#8a7456] mt-1">Statut: {row.status || row.statut || '—'}</p>
            <p className="text-xs text-[#8a7456] mt-1">Coût prévu: {fmtCurrency(toNumber(row.maintenance_cost || row.cout_maintenance || row.repair_cost))}</p>
            {task ? <div className="mt-3 flex gap-3"><span className="text-xs font-bold text-emerald-700"><CheckCircle2 size={13} className="inline" /> En suivi</span><button type="button" disabled={savingId === row.id} className="text-xs font-bold text-amber-700" onClick={() => closeMaintenance(row, task)}>Clôturer</button></div> : <button type="button" disabled={savingId === row.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => createMaintenance(row)}><CheckCircle2 size={14} className="inline" /> {savingId === row.id ? 'Préparation...' : 'Préparer'}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
