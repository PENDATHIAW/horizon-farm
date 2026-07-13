import { PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../../hooks/useWorkflowSubmit.js';
import { t } from '../../i18n/fr/index.js';
import { calculateCultureMetrics } from '../../utils/businessCalculations.js';
import {
  DAILY_ENTRY_TYPES,
  dailyEntryConfirmation,
} from '../../utils/dailyQuickEntryContract.js';
import { fmtCurrency, fmtNumber, toNumber } from '../../utils/format.js';
import { makeId } from '../../utils/ids.js';
import { commitCultureHarvest } from '../../utils/culturesWorkflow.js';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const label = (row = {}) => row.nom || row.type || row.culture || row.id || t('dailyEntries.harvest.defaultCulture');
const inputClass = 'min-h-[42px] w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-earth';
const fees = (row = {}) => toNumber(row.frais_recolte) + toNumber(row.frais_transport) + toNumber(row.frais_conditionnement) + toNumber(row.frais_main_oeuvre) + toNumber(row.autres_frais);

function Field({ label: fieldLabel, children }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-semibold text-slate">{fieldLabel}</span>{children}</label>;
}

function createInitial(cultures = []) {
  return {
    entry_id: makeId('ENTRY'),
    culture_id: cultures.length === 1 ? cultures[0].id : '',
    date: today(),
    quantite_recoltee: '',
    quantite_declassee: 0,
    quantite_perdue: 0,
    unite: 'kg',
    destination: 'stock',
    prix_vente_unitaire: '',
    frais_recolte: 0,
    frais_transport: 0,
    frais_conditionnement: 0,
    frais_main_oeuvre: 0,
    autres_frais: 0,
    notes: '',
  };
}

export default function CulturesHarvestPanel({ rows = [], context, handlers, onSuccess }) {
  const cultures = useMemo(() => getRealCultureRows(rows), [rows]);
  const [form, setForm] = useState(() => createInitial(cultures));
  const { submit: workflowSubmit, busy } = useWorkflowSubmit();
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const culture = cultures.find((row) => String(row.id) === String(form.culture_id));
  const qty = toNumber(form.quantite_recoltee);
  const extra = fees(form);
  const unitCost = culture && qty > 0
    ? ((toNumber(culture.cout_total_reel) || calculateCultureMetrics(culture).costTotal) + extra) / qty
    : 0;

  const submit = async (event) => {
    event.preventDefault();
    try {
      const guarded = await workflowSubmit(form.entry_id, async () => {
        const result = await commitCultureHarvest({
          form: { ...form, recorded_by: context?.userId },
          context,
          handlers,
        });
        toast.success(dailyEntryConfirmation(DAILY_ENTRY_TYPES.HARVEST, result));
        setForm(createInitial(cultures));
        await onSuccess?.();
        return result;
      });
      if (guarded?.skipped && guarded.reason === 'in_flight') return;
    } catch (error) {
      toast.error(error.message || t('dailyEntries.harvest.error'));
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-card" data-testid="daily-harvest-panel">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-earth"><PackageCheck size={20} /> {t('dailyEntries.harvest.title')}</h3>
      <form onSubmit={submit} className="space-y-3" data-testid="daily-harvest-form">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('dailyEntries.harvest.culture')}><select className={inputClass} value={form.culture_id} onChange={(event) => update('culture_id', event.target.value)} required data-testid="daily-harvest-target"><option value="">{t('dailyEntries.common.choose')}</option>{cultures.map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}</select></Field>
          <Field label={t('dailyEntries.common.quantityWithUnit', { unit: form.unite })}><input className={inputClass} type="number" min="0.01" step="0.01" value={form.quantite_recoltee} onChange={(event) => update('quantite_recoltee', event.target.value)} required data-testid="daily-harvest-quantity" /></Field>
        </div>
        <details className="rounded-lg border border-line bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold text-earth">{t('dailyEntries.common.details')}</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('dailyEntries.common.date')}><input className={inputClass} type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.unit')}><select className={inputClass} value={form.unite} onChange={(event) => update('unite', event.target.value)}><option value="kg">kg</option><option value="sac">sac</option><option value="caisse">caisse</option><option value="botte">botte</option></select></Field>
            <Field label={t('dailyEntries.harvest.downgraded')}><input className={inputClass} type="number" min="0" step="0.01" value={form.quantite_declassee} onChange={(event) => update('quantite_declassee', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.lost')}><input className={inputClass} type="number" min="0" step="0.01" value={form.quantite_perdue} onChange={(event) => update('quantite_perdue', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.indicativeUnitPrice')}><input className={inputClass} type="number" min="0" value={form.prix_vente_unitaire} onChange={(event) => update('prix_vente_unitaire', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.harvestFees')}><input className={inputClass} type="number" min="0" value={form.frais_recolte} onChange={(event) => update('frais_recolte', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.transport')}><input className={inputClass} type="number" min="0" value={form.frais_transport} onChange={(event) => update('frais_transport', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.packaging')}><input className={inputClass} type="number" min="0" value={form.frais_conditionnement} onChange={(event) => update('frais_conditionnement', event.target.value)} /></Field>
            <Field label={t('dailyEntries.harvest.labour')}><input className={inputClass} type="number" min="0" value={form.frais_main_oeuvre} onChange={(event) => update('frais_main_oeuvre', event.target.value)} /></Field>
            <Field label={t('dailyEntries.common.notes')}><input className={inputClass} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></Field>
          </div>
        </details>
        <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate">{t('dailyEntries.harvest.estimatedCost')} <b>{unitCost ? fmtCurrency(unitCost) : t('dailyEntries.common.unavailable')}</b> / {form.unite} · {t('dailyEntries.harvest.fees')} <b>{fmtNumber(extra)} F</b></p>
          <button type="submit" disabled={busy} className="min-h-[42px] rounded-lg bg-earth px-6 text-sm font-semibold text-white disabled:opacity-50" data-testid="daily-harvest-submit">{busy ? t('dailyEntries.common.saving') : t('dailyEntries.common.save')}</button>
        </div>
      </form>
    </section>
  );
}
