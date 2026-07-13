import { Droplets } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../../hooks/useWorkflowSubmit.js';
import { t } from '../../i18n/fr/index.js';
import {
  DAILY_ENTRY_TYPES,
  dailyEntryConfirmation,
} from '../../utils/dailyQuickEntryContract.js';
import { commitCultureIrrigation } from '../../utils/culturesWorkflow.js';
import { makeId } from '../../utils/ids.js';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const inputClass = 'min-h-[42px] w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-earth';

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
  return <label className="block text-sm"><span className="mb-1 block text-xs font-semibold text-slate">{label}</span>{children}</label>;
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
      toast.error(error.message || t('dailyEntries.irrigation.error'));
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-card" data-testid="daily-irrigation-panel">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-earth"><Droplets size={20} /> {t('dailyEntries.irrigation.title')}</h3>
      <form onSubmit={submit} className="space-y-3" data-testid="daily-irrigation-form">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('dailyEntries.irrigation.culture')}><select className={inputClass} value={form.culture_id} onChange={(event) => set('culture_id', event.target.value)} required data-testid="daily-irrigation-target"><option value="">{t('dailyEntries.common.choose')}</option>{cultures.map((culture) => <option key={culture.id} value={culture.id}>{culture.nom || culture.culture || culture.type || culture.id}</option>)}</select></Field>
          <Field label={t('dailyEntries.irrigation.volumeLitres')}><input className={inputClass} type="number" min="0.01" step="0.01" value={form.volume_litres} onChange={(event) => set('volume_litres', event.target.value)} required data-testid="daily-irrigation-volume" /></Field>
        </div>
        <details className="rounded-lg border border-line bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold text-earth">{t('dailyEntries.common.details')}</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('dailyEntries.common.date')}><input className={inputClass} type="date" value={form.date} onChange={(event) => set('date', event.target.value)} /></Field>
            <Field label={t('dailyEntries.irrigation.source')}><input className={inputClass} value={form.source_eau} onChange={(event) => set('source_eau', event.target.value)} /></Field>
            <Field label={t('dailyEntries.irrigation.durationMinutes')}><input className={inputClass} type="number" min="0" value={form.duree_minutes} onChange={(event) => set('duree_minutes', event.target.value)} /></Field>
            <Field label={t('dailyEntries.irrigation.estimatedCostPerLitre')}><input className={inputClass} type="number" min="0" step="0.01" value={form.cout_unitaire_litre} onChange={(event) => set('cout_unitaire_litre', event.target.value)} /></Field>
          </div>
        </details>
        <div className="flex justify-end"><button type="submit" disabled={busy} className="min-h-[42px] rounded-lg bg-earth px-6 text-sm font-semibold text-white disabled:opacity-50" data-testid="daily-irrigation-submit">{busy ? t('dailyEntries.common.saving') : t('dailyEntries.common.save')}</button></div>
      </form>
    </section>
  );
}
