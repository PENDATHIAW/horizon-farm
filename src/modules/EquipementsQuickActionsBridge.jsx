import { AlertTriangle, Fuel, Wrench, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import {
  runEquipmentBreakdownSideEffects,
  runEquipmentMaintenanceSideEffects,
  runEquipmentRepairSideEffects,
} from '../utils/equipmentSideEffects.js';
import { financeIds } from '../utils/sideEffectIds';
import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import useWorkflowSubmit from '../hooks/useWorkflowSubmit';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const equipmentName = (row = {}) => row.name || row.nom || row.id || 'Équipement';
const activeStatuses = new Set(['operationnel', 'disponible', 'maintenance', 'panne', 'hors_service', 'a_reparer']);
const clean = (value) => String(value || '').trim().toLowerCase();

function Modal({ title, action, rows, form, setForm, onClose, onSubmit, saving }) {
  const equipment = rows.find((row) => row.id === form.equipment_id);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Équipements</p><h3 className="text-xl font-black text-[#2f2415]">{title}</h3>{equipment ? <p className="text-sm text-[#8a7456] mt-1">{equipmentName(equipment)} · {equipment.status || equipment.statut || 'statut non renseigné'}</p> : null}</div><button type="button" onClick={onClose} className="text-[#8a7456]"><X size={18} /></button></div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3"><label className="space-y-1 md:col-span-2"><span className="text-xs text-[#8a7456]">Équipement</span><select className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.equipment_id || ''} onChange={(e) => set('equipment_id', e.target.value)}><option value="">Choisir un équipement</option>{rows.map((row) => <option key={row.id} value={row.id}>{equipmentName(row)} · {row.type || 'type non renseigné'}</option>)}</select></label>{action !== 'panne' ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">Date</span><input required type="date" className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.date || today()} onChange={(e) => set('date', e.target.value)} /></label> : null}{action === 'panne' ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">Priorité</span><select className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.priority || 'critique'} onChange={(e) => set('priority', e.target.value)}><option value="critique">Critique</option><option value="haute">Haute</option><option value="moyenne">Moyenne</option></select></label> : null}{action === 'maintenance' ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">Type de maintenance</span><select required className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.maintenance_type || 'preventive'} onChange={(e) => set('maintenance_type', e.target.value)}><option value="preventive">Préventive</option><option value="corrective">Corrective</option><option value="inspection">Inspection</option></select></label> : null}{['maintenance', 'fuel', 'repair'].includes(action) ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">{action === 'repair' ? 'Coût lu dans Finance' : 'Montant'}</span><input type="number" min="0" className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} /></label> : null}{['maintenance', 'repair'].includes(action) ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">Responsable</span><input required className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.responsible || ''} onChange={(e) => set('responsible', e.target.value)} /></label> : null}{action === 'maintenance' ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">Prochaine maintenance</span><input type="date" className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.next_maintenance_date || ''} onChange={(e) => set('next_maintenance_date', e.target.value)} /></label> : null}{action === 'fuel' ? <label className="space-y-1"><span className="text-xs text-[#8a7456]">Quantité carburant</span><input type="number" className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.quantity || ''} onChange={(e) => set('quantity', e.target.value)} /></label> : null}<label className="space-y-1 md:col-span-2"><span className="text-xs text-[#8a7456]">{action === 'repair' ? 'Résultat de la réparation' : 'Notes'}</span><textarea rows={3} className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={action === 'repair' ? form.result || '' : form.notes || ''} onChange={(e) => set(action === 'repair' ? 'result' : 'notes', e.target.value)} /></label>{action === 'repair' ? <label className="flex items-center gap-2 md:col-span-2 text-sm font-bold text-[#2f2415]"><input type="checkbox" checked={Boolean(form.validated)} onChange={(e) => set('validated', e.target.checked)} /> Je valide la remise en service après contrôle</label> : null}</div>
        <div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2"><button type="button" className="px-4 py-2 rounded-xl border border-[#d6c3a0]" onClick={onClose}>Annuler</button><button type="button" disabled={saving} className="px-4 py-2 rounded-xl bg-[#c9a96a] text-white font-bold disabled:opacity-60" onClick={onSubmit}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      </div>
    </div>
  );
}

export default function EquipementsQuickActionsBridge({ rows = [], tasks = [], alertes = [], transactions = [], documents = [], businessEvents = [], allowedActions = ['panne', 'maintenance', 'repair', 'fuel'], onUpdate, onRefresh, onCreateTask, onUpdateTask, onRefreshTasks, onCreateAlert, onUpdateAlert, onRefreshAlertes, onCreateFinanceTransaction, onRefreshFinances, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [action, setAction] = useState('');
  const [form, setForm] = useState({});
  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  const usableRows = useMemo(() => arr(rows).filter((row) => row?.id && (activeStatuses.has(clean(row.status || row.statut)) || !row.status)), [rows]);
  const open = (kind) => { setAction(kind); setForm({ equipment_id: usableRows[0]?.id || '', date: today(), priority: kind === 'panne' ? 'critique' : 'haute', maintenance_type: 'preventive' }); };
  const close = () => { setAction(''); setForm({}); };
  const selected = usableRows.find((row) => row.id === form.equipment_id);

  const submit = async () => {
    if (!selected) return toast.error('Choisis un équipement');
    const amount = toNumber(form.amount);
    const actionKey = `equipment:${action}:${selected.id}:${form.date || today()}`;
    await workflowSubmit(actionKey, async () => {
      if (action === 'panne') {
        await runEquipmentBreakdownSideEffects({
          equipment: selected,
          note: form.notes || '',
          priority: form.priority || 'critique',
          tasks,
          alertes,
          handlers: { onUpdateEquipment: onUpdate, onCreateTask, onCreateAlert, onCreateBusinessEvent },
        });
        toast.success('Panne déclarée');
      }
      if (action === 'maintenance') {
        await runEquipmentMaintenanceSideEffects({
          equipment: selected,
          date: form.date || today(),
          maintenanceType: form.maintenance_type || 'preventive',
          responsible: form.responsible || '',
          cost: amount,
          notes: form.notes || '',
          nextMaintenanceDate: form.next_maintenance_date || '',
          tasks,
          transactions,
          handlers: {
            onUpdateEquipment: onUpdate,
            onCreateTask,
            onUpdateTask,
            onCreateFinanceTransaction,
            onCreateDocument,
            onCreateBusinessEvent,
            existingDocuments: documents,
            existingBusinessEvents: businessEvents,
          },
        });
        toast.success(amount > 0 ? 'Maintenance enregistrée en Finance' : 'Maintenance programmée');
      }
      if (action === 'fuel') {
        const trxId = financeIds.equipment(selected.id, 'fuel');
        const financeRow = { id: trxId, type: 'sortie', libelle: `Carburant ${equipmentName(selected)}`, montant: amount, date: form.date || today(), categorie: 'Carburant équipements', module_lie: 'equipements', related_id: selected.id, source_module: 'equipements', source_record_id: selected.id, statut: 'paye', side_effects_managed: true, created_from: 'equipment_side_effects' };
        await onCreateFinanceTransaction?.(financeRow);
        await syncFinanceSideEffects(financeRow, { handlers: { onCreateFinanceTransaction } });
        await onUpdate?.(selected.id, { fuel_cost: toNumber(selected.fuel_cost) + amount, last_fuel_amount: amount, last_fuel_qty: toNumber(form.quantity), last_fuel_at: form.date || today(), side_effects_managed: true });
        await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'carburant_equipement', module_source: 'equipements', entity_type: 'equipement', entity_id: selected.id, title: `Carburant ${equipmentName(selected)}`, description: fmtCurrency(amount), event_date: form.date || today(), severity: 'info', linked_transaction_id: trxId, saisies_evitees: 2, side_effects_managed: true });
        toast.success('Carburant enregistré');
      }
      if (action === 'repair') {
        await runEquipmentRepairSideEffects({
          equipment: selected,
          cost: amount,
          result: form.result || '',
          responsible: form.responsible || '',
          validated: Boolean(form.validated),
          date: form.date || today(),
          tasks,
          alertes,
          transactions,
          handlers: { onUpdateEquipment: onUpdate, onUpdateTask, onUpdateAlert, onCreateFinanceTransaction, onCreateDocument, onCreateBusinessEvent, existingDocuments: documents },
        });
        toast.success('Réparation clôturée');
      }
      await Promise.allSettled([onRefresh?.(), onRefreshTasks?.(), onRefreshAlertes?.(), onRefreshFinances?.(), onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      close();
    });
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      {action ? <Modal title={action === 'panne' ? 'Déclarer une panne' : action === 'maintenance' ? 'Programmer une maintenance' : action === 'repair' ? 'Marquer réparé' : 'Saisir carburant'} action={action} rows={usableRows} form={form} setForm={setForm} onClose={close} onSubmit={submit} saving={workflowBusy} /> : null}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Actions rapides</p><h3 className="font-black text-[#2f2415]">Équipements</h3><p className="text-sm text-[#8a7456] mt-1">Déclarer un événement sans modifier toute la fiche.</p></div><div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]">{usableRows.length} équipement(s)</div></div>
      {usableRows.length ? <div className="grid grid-cols-1 md:grid-cols-4 gap-2">{allowedActions.includes('panne') ? <button type="button" className="rounded-xl border border-red-200 bg-red-50 p-3 text-left text-red-700" onClick={() => open('panne')}><AlertTriangle size={16} /> <b className="block mt-1">Déclarer panne</b><span className="text-xs">Tâche + alerte + indisponibilité</span></button> : null}{allowedActions.includes('maintenance') ? <button type="button" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-amber-700" onClick={() => open('maintenance')}><Wrench size={16} /> <b className="block mt-1">Programmer maintenance</b><span className="text-xs">Date + dépense Finance</span></button> : null}{allowedActions.includes('repair') ? <button type="button" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left text-emerald-700" onClick={() => open('repair')}><Wrench size={16} /> <b className="block mt-1">Remettre en service</b><span className="text-xs">Validation + résultat + responsable</span></button> : null}{allowedActions.includes('fuel') ? <button type="button" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left text-emerald-700" onClick={() => open('fuel')}><Fuel size={16} /> <b className="block mt-1">Saisir carburant</b><span className="text-xs">Dépense dans Finance</span></button> : null}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">Aucun équipement disponible.</div>}
    </div>
  );
}
