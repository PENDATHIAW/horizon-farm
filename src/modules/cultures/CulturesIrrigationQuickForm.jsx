import { Droplets } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../../hooks/useWorkflowSubmit.js';
import {
  DAILY_ENTRY_TYPES,
  dailyEntryConfirmation,
} from '../../utils/dailyQuickEntryContract.js';
import { commitCultureIrrigation } from '../../utils/culturesWorkflow.js';
import { makeId } from '../../utils/ids.js';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const inputClass = 'min-h-[42px] w-full rounded-lg border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';

function createInitial(cultures = []) {
  return {
    entry_id: makeId('ENTRY'),
    culture_id: cultures.length === 1 ? cultures[0].id : '',
    date: today(),
    volume_litres: '',
    source_eau: 'manuel',
    cout_unitaire_litre: 1,
    duree_minutes: '',
  };
}

function Field({ label, children }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-[#7d6a4a]">{label}</span>{children}</label>;
}

export default function CulturesIrrigationQuickForm({ rows = [], context, handlers, onSuccess }) {
  const cultures = useMemo(() => getRealCultureRows(rows), [rows]);
  const [form, setForm] = useState(() => createInitial(cultures));
  const { submit: workflowSubmit, busy } = useWorkflowSubmit();
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      const guarded = await workflowSubmit(form.entry_id, async () => {
        const result = await commitCultureIrrigation({
          form: { ...form, recorded_by: context?.userId },
          context,
          handlers,
        });
        toast.success(dailyEntryConfirmation(DAILY_ENTRY_TYPES.IRRIGATION, result));
        setForm(createInitial(cultures));
        await onSuccess?.();
        return result;
      });
      if (guarded?.skipped && guarded.reason === 'in_flight') return;
    } catch (error) {
      toast.error(error.message || 'Irrigation impossible');
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-[#d6c3a0] bg-white p-5 shadow-sm" data-testid="daily-irrigation-panel">
      <h3 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Droplets size={20} /> Irrigation</h3>
      <form onSubmit={submit} className="space-y-3" data-testid="daily-irrigation-form">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Culture"><select className={inputClass} value={form.culture_id} onChange={(event) => set('culture_id', event.target.value)} required data-testid="daily-irrigation-target"><option value="">Choisir</option>{cultures.map((culture) => <option key={culture.id} value={culture.id}>{culture.nom || culture.culture || culture.type || culture.id}</option>)}</select></Field>
          <Field label="Volume (L)"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.volume_litres} onChange={(event) => set('volume_litres', event.target.value)} required data-testid="daily-irrigation-volume" /></Field>
        </div>
        <details className="rounded-lg border border-[#eadcc2] bg-[#fffdf8] p-3">
          <summary className="cursor-pointer text-sm font-black text-[#2f2415]">Détails</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date"><input className={inputClass} type="date" value={form.date} onChange={(event) => set('date', event.target.value)} /></Field>
            <Field label="Source"><input className={inputClass} value={form.source_eau} onChange={(event) => set('source_eau', event.target.value)} /></Field>
            <Field label="Durée (min)"><input className={inputClass} type="number" min="0" value={form.duree_minutes} onChange={(event) => set('duree_minutes', event.target.value)} /></Field>
            <Field label="Coût estimé / L"><input className={inputClass} type="number" min="0" step="0.01" value={form.cout_unitaire_litre} onChange={(event) => set('cout_unitaire_litre', event.target.value)} /></Field>
          </div>
        </details>
        <div className="flex justify-end"><button type="submit" disabled={busy} className="min-h-[42px] rounded-lg bg-[#2f2415] px-5 text-sm font-black text-white disabled:opacity-50" data-testid="daily-irrigation-submit">{busy ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      </form>
    </section>
  );
}
