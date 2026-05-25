import { CheckCircle2, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { makeId } from '../utils/ids';
import Equipements from './Equipements.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const lower = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const inferType = (draft = {}) => {
  const text = lower(`${draft.raw_input || ''} ${draft.intent || ''} ${draft.form_type || ''}`);
  if (text.includes('achat') || text.includes('achete') || text.includes('acheté')) return 'achat';
  if (text.includes('maintenance') || text.includes('revision') || text.includes('révision') || text.includes('entretien')) return 'maintenance';
  return 'panne';
};
const inferName = (draft = {}) => {
  const text = String(draft.raw_input || '').replace(/^(déclarer|declare|j'ai|jai|créer|creer|ajouter|ajoute|achat|maintenance|panne|équipement|equipement)\s+/i, '').trim();
  return draft.draft_fields?.equipment_name || draft.draft_fields?.name || text || 'Équipement à préciser';
};
const labelOf = (row = {}) => row.name || row.nom || row.libelle || row.equipement || row.id || 'Équipement';

function HeyHorizonEquipmentCard({ draft, rows, onCreate, onUpdate, onCreateTask, onCreateFinanceTransaction, onCreateDocument, onCreateBusinessEvent, onRefresh, onRefreshTasks, onRefreshFinances, onRefreshDocuments, onRefreshBusinessEvents, onClose }) {
  const fields = draft?.draft_fields || {};
  const initialType = inferType(draft);
  const [actionType, setActionType] = useState(initialType);
  const [equipmentId, setEquipmentId] = useState(fields.equipment_id || '');
  const [name, setName] = useState(inferName(draft));
  const [date, setDate] = useState(fields.date || today());
  const [cost, setCost] = useState(fields.amount || fields.payment_amount || '');
  const [note, setNote] = useState(fields.notes || draft?.raw_input || '');
  const [saving, setSaving] = useState(false);
  const existing = rows.find((row) => String(row.id) === String(equipmentId)) || null;
  const submit = async () => {
    if (!name.trim() && !equipmentId) return toast.error('Équipement obligatoire');
    try {
      setSaving(true);
      const eqId = equipmentId || makeId('EQP');
      const title = actionType === 'achat' ? `Achat équipement · ${name}` : actionType === 'maintenance' ? `Maintenance · ${existing ? labelOf(existing) : name}` : `Panne · ${existing ? labelOf(existing) : name}`;
      if (actionType === 'achat') {
        await onCreate?.({ id: eqId, name: name.trim(), nom: name.trim(), status: 'actif', statut: 'actif', date_achat: date, cout_achat: num(cost), valeur: num(cost), notes: note, source_module: 'hey_horizon', created_from: 'hey_horizon' });
      } else if (existing) {
        await onUpdate?.(eqId, { status: actionType === 'panne' ? 'panne' : 'maintenance', statut: actionType === 'panne' ? 'panne' : 'maintenance', last_maintenance_date: actionType === 'maintenance' ? date : existing.last_maintenance_date, last_incident_date: actionType === 'panne' ? date : existing.last_incident_date, notes_maintenance: note, last_event_source: 'hey_horizon' });
      } else {
        await onCreate?.({ id: eqId, name: name.trim(), nom: name.trim(), status: actionType === 'panne' ? 'panne' : 'maintenance', statut: actionType === 'panne' ? 'panne' : 'maintenance', date_achat: '', notes: note, source_module: 'hey_horizon', created_from: 'hey_horizon' });
      }
      if (actionType !== 'achat') {
        await onCreateTask?.({ id: makeId('TSK'), title, module_lie: 'equipements', related_id: eqId, due_date: date, priority: actionType === 'panne' ? 'haute' : 'normale', status: 'a_faire', checklist: actionType === 'panne' ? 'Diagnostiquer; Réparer; Tester; Clôturer' : 'Contrôler; Nettoyer; Tester; Clôturer', source_module: 'hey_horizon' });
      }
      if (num(cost) > 0) {
        await onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', transaction_type: 'sortie', libelle: title, montant: num(cost), amount: num(cost), date, categorie: actionType === 'achat' ? 'Investissement équipement' : 'Maintenance équipement', module_lie: 'equipements', related_id: eqId, source_module: 'equipements', source_record_id: eqId, transaction_origin: 'automatique' });
      }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: `equipement_${actionType}`, module_source: 'equipements', entity_type: 'equipement', entity_id: eqId, title, description: note, event_date: date, severity: actionType === 'panne' ? 'warning' : 'info', amount: num(cost), saisies_evitees: actionType === 'achat' ? 2 : 3 });
      await Promise.allSettled([onRefresh?.(), onRefreshTasks?.(), onRefreshFinances?.(), onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success(`${title} enregistré depuis Hey Horizon`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Action équipement impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><Wrench size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">Action équipement</h3><p className="mt-1 text-sm text-emerald-800">Complète si besoin, puis valide. L’équipement, la tâche, la finance et l’historique sont liés automatiquement.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Action</span><select value={actionType} onChange={(e) => setActionType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="panne">Déclarer panne</option><option value="maintenance">Maintenance</option><option value="achat">Achat équipement</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Équipement existant</span><select value={equipmentId} onChange={(e) => { setEquipmentId(e.target.value); const row = rows.find((item) => String(item.id) === String(e.target.value)); if (row) setName(labelOf(row)); }} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="">Nouveau / à préciser</option>{rows.map((row) => <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>)}</select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Nom</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Coût éventuel</span><input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></div>
    <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="inline" /> À la validation : équipement mis à jour/créé, tâche créée si nécessaire, écriture finance créée si coût renseigné.</div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider action équipement'}</button></div>
  </section>;
}

export default function EquipementsV2(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'equipements' && draft?.form_type === 'equipment_action') {
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-equipment-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
  return <div className="space-y-6">
    {horizonDraft ? <div id="hey-horizon-equipment-card"><HeyHorizonEquipmentCard draft={horizonDraft} rows={props.rows || []} onCreate={props.onCreate} onUpdate={props.onUpdate} onCreateTask={props.onCreateTask} onCreateFinanceTransaction={props.onCreateFinanceTransaction} onCreateDocument={props.onCreateDocument} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefresh={props.onRefresh} onRefreshTasks={props.onRefreshTasks} onRefreshFinances={props.onRefreshFinances} onRefreshDocuments={props.onRefreshDocuments} onRefreshBusinessEvents={props.onRefreshBusinessEvents} onClose={() => setHorizonDraft(null)} /></div> : null}
    <Equipements {...props} />
  </div>;
}