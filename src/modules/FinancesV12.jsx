import { CheckCircle2, CreditCard, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import BpKpiHealth from './BpKpiHealth.jsx';
import FinanceAccountingHealth from './FinanceAccountingHealth.jsx';
import FinanceCashPilotPanel from './FinanceCashPilotPanel.jsx';
import FinancesV11 from './FinancesV11.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const kindLabel = (type = '') => type === 'entree' ? 'Argent reçu' : 'Argent dépensé';

function HeyHorizonFinanceCard({ draft, onCreate, onCreateBusinessEvent, onRefresh, onRefreshBusinessEvents, onClose }) {
  const fields = draft?.draft_fields || {};
  const [type, setType] = useState(fields.transaction_type || 'sortie');
  const [amount, setAmount] = useState(fields.amount || fields.payment_amount || '');
  const [label, setLabel] = useState(fields.label || draft?.raw_input || '');
  const [category, setCategory] = useState(fields.category || 'general');
  const [date, setDate] = useState(fields.date || today());
  const [paymentStatus, setPaymentStatus] = useState(fields.payment_status === 'credit' ? 'a_payer' : 'paye');
  const [note, setNote] = useState(fields.notes || '');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (num(amount) <= 0) return toast.error('Montant obligatoire');
    if (!label.trim()) return toast.error('Libellé obligatoire');
    try {
      setSaving(true);
      const id = makeId('TRX');
      await onCreate?.({ id, type, transaction_type: type, libelle: label.trim(), label: label.trim(), montant: num(amount), amount: num(amount), date, categorie: category, category, statut: paymentStatus, module_lie: 'finances', source_module: 'hey_horizon', created_from: 'hey_horizon', notes: note || draft?.raw_input || '' });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'finance_hey_horizon', module_source: 'finances', entity_type: 'transaction', entity_id: id, title: `${kindLabel(type)} · ${num(amount).toLocaleString('fr-FR')} FCFA`, description: note || label, event_date: date, severity: type === 'sortie' ? 'info' : 'success', amount: num(amount), saisies_evitees: 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success(`${kindLabel(type)} créée depuis Hey Horizon`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Création finance impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><CreditCard size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">{kindLabel(type)} à enregistrer</h3><p className="mt-1 text-sm text-emerald-800">Complète si besoin, puis valide. La ligne finance et l’événement métier seront créés.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Type</span><select value={type} onChange={(e) => setType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="sortie">Argent dépensé</option><option value="entree">Argent reçu</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Montant</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-emerald-800">Libellé simple</span><input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Statut</span><select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="paye">Payé</option><option value="a_payer">À payer</option><option value="partiel">Partiel</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Catégorie</span><input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></div>
    <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="inline" /> Montant : <b>{num(amount).toLocaleString('fr-FR')} FCFA</b> · Type : <b>{kindLabel(type)}</b></div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Création...' : 'Enregistrer la ligne finance'}</button></div>
  </section>;
}

export default function FinancesV12(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  const documentsCrud = useCrudModule('documents');
  const businessEventsCrud = useCrudModule('business_events');
  const transactions = props.rows || props.transactions || [];
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'finances' && draft?.form_type === 'finance_entry') {
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-finance-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
  return <div className="space-y-6">
    {horizonDraft ? <div id="hey-horizon-finance-card"><HeyHorizonFinanceCard draft={horizonDraft} onCreate={props.onCreate} onCreateBusinessEvent={props.onCreateBusinessEvent || businessEventsCrud.create} onRefresh={props.onRefresh} onRefreshBusinessEvents={props.onRefreshBusinessEvents || businessEventsCrud.refresh} onClose={() => setHorizonDraft(null)} /></div> : null}
    <FinanceCashPilotPanel transactions={transactions} salesOrders={props.salesOrders || []} payments={props.payments || []} fournisseurs={props.fournisseurs || []} onNavigate={props.onNavigate} />
    <FinanceReconciliationPanel
      payments={props.payments || []}
      transactions={transactions}
      salesOrders={props.salesOrders || []}
      onCreateFinanceTransaction={props.onCreateFinanceTransaction}
      onRefreshFinances={props.onRefreshFinances}
    />
    <BpKpiHealth salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={transactions} investments={props.investissements || []} onNavigate={props.onNavigate} />
    <FinanceAccountingHealth transactions={transactions} salesOrders={props.salesOrders || []} payments={props.payments || []} documents={props.documents || documentsCrud.rows || []} clients={props.clients || []} fournisseurs={props.fournisseurs || []} onNavigate={props.onNavigate} />
    <FinancesV11 {...props} />
  </div>;
}
