import { CheckCircle2, CreditCard, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import {
  clearBpPendingForm,
  dispatchBpCostCompleted,
  readBpPendingForm,
} from '../utils/bpLineConcretization.js';
import { makeId } from '../utils/ids';
import BpKpiHealth from './BpKpiHealth.jsx';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import FinanceCashPilotPanel from './FinanceCashPilotPanel.jsx';
import TreasuryByAccountPanel from './TreasuryByAccountPanel.jsx';
import ChargesCompletenessPanel from './ChargesCompletenessPanel.jsx';
import FinancesV11 from './FinancesV11.jsx';
import { subscribeFormModal } from '../services/formModalManager.js';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const kindLabel = (type = '') => type === 'entree' ? 'Argent reçu' : 'Argent dépensé';

function HeyHorizonFinanceCard({ draft, onCreate, onCreateBusinessEvent, onRefresh, onRefreshBusinessEvents, onClose }) {
  const categorieOptions = useMemo(() => {
    const field = (MODULE_FORM_FIELDS.finances || []).find((item) => item.key === 'categorie');
    return field?.options || ['Autre'];
  }, []);
  const fields = draft?.draft_fields || {};
  const [type, setType] = useState(fields.transaction_type || fields.type || 'sortie');
  const [amount, setAmount] = useState(fields.amount || fields.payment_amount || fields.montant || '');
  const [label, setLabel] = useState(fields.label || fields.libelle || draft?.raw_input || '');
  const [category, setCategory] = useState(fields.category || fields.categorie || categorieOptions[0] || 'Autre');
  const [date, setDate] = useState(fields.date || today());
  const [paymentStatus, setPaymentStatus] = useState(fields.payment_status === 'credit' || fields.statut === 'a_payer' ? 'a_payer' : 'paye');
  const [note, setNote] = useState(fields.notes || fields.description || '');
  const bpCostId = fields.bp_cost_id || fields.bp_line_id || '';
  const isPartial = fields.concretization_mode === 'partiel';
  const planned = num(fields.montant_prevu || fields.montant_mensuel || 0);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (num(amount) <= 0) return toast.error('Montant obligatoire');
    if (!label.trim()) return toast.error('Libellé obligatoire');
    try {
      setSaving(true);
      const id = makeId('TRX');
      await onCreate?.({ id, type, transaction_type: type, libelle: label.trim(), label: label.trim(), montant: num(amount), amount: num(amount), date, categorie: category, category, statut: paymentStatus, module_lie: 'finances', source_module: bpCostId ? 'investissements' : 'hey_horizon', created_from: bpCostId ? 'business_plan_charge' : 'hey_horizon', bp_cost_id: bpCostId || '', business_plan_id: fields.business_plan_id || '', notes: note || draft?.raw_input || '' });
      if (bpCostId) {
        dispatchBpCostCompleted({
          bp_cost_id: bpCostId,
          finance_transaction_id: id,
          amount: num(amount),
          date,
          targetModule: 'finance_pilotage',
          source: 'finance_entry',
        });
      }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'finance_hey_horizon', module_source: 'finances', entity_type: 'transaction', entity_id: id, title: `${kindLabel(type)} · ${num(amount).toLocaleString('fr-FR')} FCFA`, description: note || label, event_date: date, severity: type === 'sortie' ? 'info' : 'success', amount: num(amount), saisies_evitees: 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success(`${kindLabel(type)} créée depuis Hey Horizon`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Création finance impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-positive bg-positive-bg p-6 shadow-card space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-positive font-semibold flex items-center gap-2"><CreditCard size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-semibold text-earth">{kindLabel(type)} à enregistrer</h3><p className="mt-1 text-sm text-positive">{isPartial ? `Concrétisation partielle de la charge BP - prévu ${planned.toLocaleString('fr-FR')} FCFA. Saisis le montant réellement engagé.` : 'Complète si besoin, puis valide. La ligne finance et la charge BP seront mises à jour.'}</p></div><button type="button" onClick={onClose} className="rounded-full border border-positive bg-white p-2 text-positive"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-semibold text-positive">Type</span><select value={type} onChange={(e) => setType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm"><option value="sortie">Argent dépensé</option><option value="entree">Argent reçu</option></select></label><label className="space-y-1"><span className="text-xs font-semibold text-positive">Montant</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold text-positive">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-2"><span className="text-xs font-semibold text-positive">Libellé simple</span><input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold text-positive">Statut</span><select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm"><option value="paye">Payé</option><option value="a_payer">À payer</option><option value="partiel">Partiel</option></select></label><label className="space-y-1"><span className="text-xs font-semibold text-positive">Catégorie</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm">{categorieOptions.map((option) => { const value = typeof option === 'object' ? option.value : option; const label = typeof option === 'object' ? option.label : option; return <option key={value} value={value}>{label}</option>; })}</select></label><label className="space-y-1 md:col-span-2"><span className="text-xs font-semibold text-positive">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-positive bg-white px-3 py-2 text-sm" /></label></div>
    <div className="rounded-xl border border-positive bg-white p-3 text-sm text-positive"><CheckCircle2 size={14} className="inline" /> Montant : <b>{num(amount).toLocaleString('fr-FR')} FCFA</b> · Type : <b>{kindLabel(type)}</b></div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-earth px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Création...' : 'Enregistrer la ligne finance'}</button></div>
  </section>;
}

export default function FinancesV12(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  const documentsCrud = useCrudModule('documents');
  const businessEventsCrud = useCrudModule('business_events');
  const transactions = props.rows || props.transactions || [];
  const openFinanceDraft = (draft) => {
    if (!draft || draft.form_type !== 'finance_entry') return;
    setHorizonDraft(draft);
    clearBpPendingForm();
    window.setTimeout(() => document.getElementById('hey-horizon-finance-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  useEffect(() => {
    const pending = readBpPendingForm();
    if (pending?.module === 'finances' && pending.form_type === 'finance_entry') {
      queueMicrotask(() => openFinanceDraft({
          form_type: pending.form_type,
          intent_label: pending.intent_label,
          draft_fields: pending.draft_fields,
        }));
    }
    const handler = (detail = {}) => {
      const draft = detail.draft;
      const module = detail.module;
      if (!['finances', 'finance', 'finance_pilotage'].includes(module) || draft?.form_type !== 'finance_entry') return false;
      openFinanceDraft(draft);
      return true;
    };
    return subscribeFormModal(handler, { modules: ['finances', 'finance', 'finance_pilotage'] });
  }, []);
  return <div className="space-y-6">
    {horizonDraft ? <div id="hey-horizon-finance-card"><HeyHorizonFinanceCard draft={horizonDraft} onCreate={props.onCreate} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefresh={props.onRefresh} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} onClose={() => setHorizonDraft(null)} /></div> : null}
    <FinanceCashPilotPanel transactions={transactions} salesOrders={props.salesOrders || []} payments={props.payments || []} fournisseurs={props.fournisseurs || []} stocks={props.stocks || []} stockMovements={props.stockMovements || []} onNavigate={props.onNavigate} />
    <TreasuryByAccountPanel {...props} transactions={transactions} />
    <ChargesCompletenessPanel transactions={transactions} payments={props.payments || []} investissements={props.investissements || []} team={props.team || []} onNavigate={props.onNavigate} />
    <BpKpiHealth salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={transactions} investments={props.investissements || []} onNavigate={props.onNavigate} />
    <FinanceAccountingHealth transactions={transactions} salesOrders={props.salesOrders || []} payments={props.payments || []} documents={props.documents || documentsCrud.rows || []} clients={props.clients || []} fournisseurs={props.fournisseurs || []} onNavigate={props.onNavigate} />
    <FinancesV11 {...props} />
  </div>;
}
