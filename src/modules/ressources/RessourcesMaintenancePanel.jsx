import { Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../../utils/format';
import { commitEquipmentBreakdown, commitEquipmentMaintenance } from '../../utils/ressourcesWorkflow.js';

const today = () => new Date().toISOString().slice(0, 10);
const label = (row = {}) => row.name || row.nom || row.id || 'Équipement';
const inputCls = 'w-full rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';

export default function RessourcesMaintenancePanel({
  equipment = [],
  context,
  handlers,
  onSuccess,
}) {
  const rows = useMemo(() => (Array.isArray(equipment) ? equipment : []), [equipment]);
  const initial = {
    equipment_id: rows[0]?.id || '',
    action: 'schedule',
    date: today(),
    due_date: today(),
    cost: '',
    priority: 'haute',
    notes: '',
    document_url: '',
    mark_paid: false,
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await commitEquipmentMaintenance({
        form: {
          ...form,
          cost: toNumber(form.cost),
          amount: toNumber(form.cost),
        },
        context,
        handlers,
      });
      toast.success('Maintenance enregistrée — tâche, alerte, finance et traçabilité à jour');
      setForm(initial);
      await onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Maintenance impossible');
    } finally {
      setBusy(false);
    }
  };

  const declareBreakdown = async () => {
    if (!form.equipment_id) return toast.error('Choisir un équipement');
    try {
      setBusy(true);
      await commitEquipmentBreakdown({
        form: {
          equipment_id: form.equipment_id,
          priority: 'critique',
          notes: form.notes || 'Panne critique déclarée',
          date: form.date,
        },
        context,
        handlers,
      });
      toast.success('Panne critique — tâche et alerte créées');
      await onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Déclaration panne impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Wrench size={20} /> Maintenance équipement</p>
        <p className="mt-1 text-sm text-[#8a7456]">Une saisie : tâche, alerte si critique, charge finance, document et statut matériel.</p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-6 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <label className="md:col-span-2 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Équipement</span>
          <select className={inputCls} value={form.equipment_id} onChange={(e) => update('equipment_id', e.target.value)} required>
            <option value="">Choisir</option>
            {rows.map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Action</span>
          <select className={inputCls} value={form.action} onChange={(e) => update('action', e.target.value)}>
            <option value="schedule">Planifier</option>
            <option value="complete">Clôturer / réparer</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Date</span>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Coût (FCFA)</span>
          <input type="number" min="0" className={inputCls} value={form.cost} onChange={(e) => update('cost', e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Priorité</span>
          <select className={inputCls} value={form.priority} onChange={(e) => update('priority', e.target.value)}>
            <option value="critique">Critique</option>
            <option value="haute">Haute</option>
            <option value="moyenne">Moyenne</option>
          </select>
        </label>
        <label className="md:col-span-2 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">URL facture / garantie</span>
          <input type="url" className={inputCls} value={form.document_url} onChange={(e) => update('document_url', e.target.value)} placeholder="https://..." />
        </label>
        <label className="md:col-span-3 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Notes</span>
          <input type="text" className={inputCls} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" checked={form.mark_paid} onChange={(e) => update('mark_paid', e.target.checked)} />
          <span>Charge payée immédiatement</span>
        </label>
        <div className="md:col-span-2 flex flex-wrap items-end gap-2">
          <button type="submit" disabled={busy} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? '…' : 'Enregistrer'}
          </button>
          <button type="button" disabled={busy} onClick={declareBreakdown} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800">
            Panne critique
          </button>
        </div>
      </form>
      {form.cost ? (
        <p className="text-sm text-[#7d6a4a]">Coût saisi : <b>{fmtCurrency(toNumber(form.cost))}</b></p>
      ) : null}
    </section>
  );
}
