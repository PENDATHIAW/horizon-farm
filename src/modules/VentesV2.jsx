import { CheckCircle2, CreditCard, FileText, Receipt, RefreshCw, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { commitSaleWorkflow, prepareSaleWorkflow, useSuggestion } from '../services/workflowService';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import SalesOpportunitiesBridge from './SalesOpportunitiesBridge.jsx';
import Ventes from './Ventes.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const total = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount);
const paidFromOrder = (order = {}) => toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
const payStatus = (order = {}) => String(order.statut_paiement ?? order.payment_status ?? '').toLowerCase();
const orderStatus = (order = {}) => String(order.statut_commande ?? order.status ?? '').toLowerCase();
const paymentOrderId = (payment = {}) => payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id;
const clientName = (clients, id) => arr(clients).find((c) => c.id === id)?.nom || arr(clients).find((c) => c.id === id)?.name || id || 'Client non renseigné';
const badgeClass = (kind) => kind === 'Modifié' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
const paymentMethods = [
  { value: 'especes', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];

const paidForOrder = (order, payments = []) => {
  const fromPayments = arr(payments)
    .filter((payment) => String(paymentOrderId(payment) || '') === String(order.id || ''))
    .filter((payment) => String(payment.statut || 'paye') !== 'annule')
    .reduce((sum, payment) => sum + toNumber(payment.montant_paye ?? payment.montant ?? payment.amount), 0);
  return Math.max(paidFromOrder(order), fromPayments);
};
const remainingForOrder = (order, payments = []) => Math.max(0, total(order) - paidForOrder(order, payments));
const isOrderOpenForPayment = (order, payments = []) => total(order) > 0 && orderStatus(order) !== 'annule' && payStatus(order) !== 'paye' && remainingForOrder(order, payments) > 0;
const nextPaymentStatus = (order, payments = [], extra = 0) => {
  const nextPaid = paidForOrder(order, payments) + toNumber(extra);
  const amount = total(order);
  if (amount > 0 && nextPaid >= amount) return 'paye';
  if (nextPaid > 0) return 'partiel';
  return 'non_paye';
};
const nextOrderStatus = (order, payments = [], extra = 0) => {
  const current = orderStatus(order);
  if (current === 'annule' || current === 'livre') return current;
  if (paidForOrder(order, payments) + toNumber(extra) > 0) return 'confirme';
  if (total(order) > 0) return current && current !== 'brouillon' ? current : 'enregistree';
  return current || 'brouillon';
};

async function secureSale(order, props, setPreview) {
  const payments = arr(props.paymentsList || props.payments);
  if (!isOrderOpenForPayment(order, payments)) {
    toast.success('Commande déjà soldée');
    setPreview(null);
    return;
  }
  const preview = prepareSaleWorkflow(order, {
    invoices: props.invoicesList,
    payments: props.paymentsList,
    transactions: props.transactions,
    documents: props.documents,
    clients: props.clients,
    events: props.businessEvents,
    alerts: props.alertes,
  });
  const paymentValue = toNumber(preview?.fields?.payment_to_record?.final_value ?? preview?.fields?.paid?.final_value);
  if (paymentValue <= 0 || remainingForOrder(order, payments) <= 0) {
    toast.success('Aucun encaissement restant pour cette commande');
    setPreview(null);
    return;
  }
  setPreview(preview);
}

async function updateSourceAsset(activity, id, patch, props) {
  if (!id) return null;
  if (activity === 'animaux') return props.onUpdateAnimal?.(id, patch);
  if (activity === 'cultures') return props.onUpdateCulture?.(id, patch);
  if (activity === 'stock') return props.onUpdateStock?.(id, patch);
  if (String(activity || '').startsWith('avicole')) return props.onUpdateLot?.(id, patch);
  return null;
}

async function refreshRelated(props) {
  await Promise.allSettled([
    props.onRefresh?.(),
    props.onRefreshDocuments?.(),
    props.onRefreshAlertes?.(),
    props.onRefreshFinances?.(),
    props.onRefreshBusinessEvents?.(),
    props.onRefreshInvoices?.(),
    props.onRefreshPayments?.(),
    props.onRefreshOpportunities?.(),
  ]);
}

async function commitPreview(preview, props, setPreview) {
  try {
    const paymentValue = toNumber(preview?.fields?.payment_to_record?.final_value ?? preview?.fields?.paid?.final_value);
    if (paymentValue <= 0) return toast.error('Aucun montant à encaisser');
    const result = await commitSaleWorkflow(preview, {
      onCreateInvoice: props.onCreateInvoice,
      onCreatePayment: props.onCreatePayment,
      onCreateFinanceTransaction: props.onCreateFinanceTransaction,
      onUpdateOrder: props.onUpdate,
      onUpdateClient: props.onUpdateClient,
      onUpdateSourceAsset: (activity, id, patch) => updateSourceAsset(activity, id, patch, props),
      onCreateDocument: props.onCreateDocument,
      onCreateBusinessEvent: props.onCreateBusinessEvent,
      onCreateAlert: props.onCreateAlert,
    });
    await refreshRelated(props);
    toast.success(`Vente validée · ${result.saisies_evitees} saisies évitées`);
    setPreview(null);
  } catch (error) {
    toast.error(error.message || 'Validation workflow vente impossible');
  }
}

function PaymentCapturePanel(props) {
  const [form, setForm] = useState({ order_id: '', montant: '', moyen_paiement: 'wave', date_paiement: today(), notes: '' });
  const [saving, setSaving] = useState(false);
  const payments = arr(props.paymentsList || props.payments);
  const openOrders = useMemo(() => arr(props.rows).filter((order) => isOrderOpenForPayment(order, payments)), [props.rows, payments]);
  const selectedOrder = openOrders.find((order) => String(order.id) === String(form.order_id));
  const remaining = selectedOrder ? remainingForOrder(selectedOrder, payments) : 0;
  const amount = toNumber(form.montant || remaining);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const chooseOrder = (id) => {
    const order = openOrders.find((item) => String(item.id) === String(id));
    setForm((prev) => ({ ...prev, order_id: id, montant: order ? remainingForOrder(order, payments) : '' }));
  };

  const submit = async () => {
    if (!selectedOrder) return toast.error('Choisis une commande à encaisser');
    if (amount <= 0) return toast.error('Montant invalide');
    if (amount > remaining) return toast.error(`Montant supérieur au reste à payer (${fmtCurrency(remaining)})`);
    try {
      setSaving(true);
      const nextPaid = paidForOrder(selectedOrder, payments) + amount;
      const paymentId = makeId('PAY');
      await props.onCreatePayment?.({
        id: paymentId,
        order_id: selectedOrder.id,
        sale_id: selectedOrder.id,
        source_record_id: selectedOrder.id,
        client_id: selectedOrder.client_id,
        invoice_id: selectedOrder.invoice_id || '',
        date_paiement: form.date_paiement || today(),
        date: form.date_paiement || today(),
        montant_paye: amount,
        montant: amount,
        amount,
        moyen_paiement: form.moyen_paiement,
        mode_paiement: form.moyen_paiement,
        statut: 'paye',
        notes: form.notes || `Paiement commande ${selectedOrder.id}`,
      });
      await props.onUpdate?.(selectedOrder.id, {
        montant_paye: Math.min(total(selectedOrder), nextPaid),
        reste_a_payer: Math.max(0, total(selectedOrder) - nextPaid),
        statut_paiement: nextPaymentStatus(selectedOrder, payments, amount),
        statut_commande: nextOrderStatus(selectedOrder, payments, amount),
        moyen_paiement: form.moyen_paiement,
        last_payment_id: paymentId,
        last_payment_date: form.date_paiement || today(),
      });
      await refreshRelated(props);
      toast.success('Paiement enregistré et commande mise à jour');
      setForm({ order_id: '', montant: '', moyen_paiement: 'wave', date_paiement: today(), notes: '' });
    } catch (error) {
      toast.error(error.message || 'Paiement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Paiement</p>
          <h3 className="font-black text-[#2f2415]">Encaisser une commande ouverte</h3>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]">
          {openOrders.length} commande(s) à encaisser
        </div>
      </div>
      {openOrders.length ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[#8a7456]">Commande</span>
            <select className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.order_id} onChange={(e) => chooseOrder(e.target.value)}>
              <option value="">Choisir une commande</option>
              {openOrders.map((order) => (
                <option key={order.id} value={order.id}>{order.id} · {clientName(props.clients, order.client_id)} · reste {fmtCurrency(remainingForOrder(order, payments))}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8a7456]">Montant</span>
            <input type="number" className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.montant} onChange={(e) => set('montant', e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8a7456]">Moyen</span>
            <select className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.moyen_paiement} onChange={(e) => set('moyen_paiement', e.target.value)}>
              {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8a7456]">Date</span>
            <input type="date" className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.date_paiement} onChange={(e) => set('date_paiement', e.target.value)} />
          </label>
          <label className="space-y-1 md:col-span-4">
            <span className="text-xs text-[#8a7456]">Notes</span>
            <input className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
          <div className="flex items-end justify-end">
            <button type="button" disabled={saving} className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60" onClick={submit}>{saving ? 'Enregistrement...' : 'Encaisser'}</button>
          </div>
          {selectedOrder ? <div className="md:col-span-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Reste à payer : <b>{fmtCurrency(remaining)}</b> · Après paiement : <b>{fmtCurrency(Math.max(0, remaining - amount))}</b></div> : null}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune commande en attente de paiement.</div>
      )}
    </div>
  );
}

function SalesPreviewModal({ preview, setPreview, props }) {
  if (!preview) return null;
  const amount = preview.fields.amount;
  const paidField = preview.fields.payment_to_record || preview.fields.paid;
  const remainingField = preview.fields.remaining_after_payment;
  const activity = preview.fields.activity;
  const category = preview.fields.category;
  const overridePaid = (value) => setPreview((p) => ({ ...p, fields: { ...p.fields, payment_to_record: { ...p.fields.payment_to_record, final_value: toNumber(value), manual_override: true, manual_override_at: new Date().toISOString() } } }));
  const resetPaid = () => setPreview((p) => useSuggestion(p, 'fields.payment_to_record'));
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Preview workflow vente</p><h3 className="text-xl font-black text-[#2f2415]">Avant validation multi-modules</h3><p className="text-sm text-[#8a7456] mt-1">Tu peux corriger avant d’écrire dans Finances, Documents, Client et Traçabilité.</p></div>
          <button type="button" onClick={() => setPreview(null)} className="text-[#8a7456] font-bold">×</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info title="Montant vente" value={fmtCurrency(amount.auto_value)} badge={amount.manual_override ? 'Modifié' : 'Auto'} />
            <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><span className={`text-xs border rounded-full px-2 py-0.5 ${badgeClass(paidField.manual_override ? 'Modifié' : 'Auto')}`}>{paidField.manual_override ? 'Modifié' : 'Auto'}</span><p className="text-xs text-[#8a7456] mt-2">Montant encaissé maintenant</p><input className="mt-1 w-full rounded-lg border border-[#d6c3a0] px-2 py-1 font-bold" type="number" value={paidField.final_value} onChange={(e) => overridePaid(e.target.value)} /><button className="mt-2 text-xs font-bold text-emerald-700" type="button" onClick={resetPaid}><RefreshCw size={12} className="inline" /> Utiliser la suggestion</button></div>
            <Info title="Reste après validation" value={fmtCurrency(remainingField?.auto_value || 0)} badge={remainingField?.manual_override ? 'Modifié' : 'Auto'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Info title="Activité finance" value={activity.final_value} badge={activity.manual_override ? 'Modifié' : 'Auto'} />
            <Info title="Catégorie finance" value={category?.final_value || 'Ventes'} badge={category?.manual_override ? 'Modifié' : 'Auto'} />
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><p className="font-bold text-[#2f2415] mb-2">Actions ERP générées</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{preview.actions.map((a) => <div key={a.id} className="text-sm text-[#7d6a4a]"><CheckCircle2 size={13} className="inline text-emerald-600" /> {a.label}</div>)}</div></div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><b>1 saisie utilisateur</b> = {preview.workflow_meta.actions_erp} actions ERP · <b>{preview.workflow_meta.saisies_evitees} saisies évitées</b></div>
        </div>
        <div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2"><button type="button" className="px-4 py-2 rounded-xl border border-[#d6c3a0]" onClick={() => setPreview(null)}>Annuler</button><button type="button" className="px-4 py-2 rounded-xl bg-[#c9a96a] text-white font-bold" onClick={() => commitPreview(preview, props, setPreview)}>Valider workflow</button></div>
      </div>
    </div>
  );
}
function Info({ title, value, badge }) { return <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><span className={`text-xs border rounded-full px-2 py-0.5 ${badgeClass(badge)}`}>{badge}</span><p className="text-xs text-[#8a7456] mt-2">{title}</p><p className="text-lg font-black text-[#2f2415]">{value}</p></div>; }

function SalesBridge(props) {
  const [preview, setPreview] = useState(null);
  const orders = arr(props.rows);
  const payments = arr(props.paymentsList || props.payments);
  const ca = orders.reduce((sum, order) => sum + total(order), 0);
  const cash = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
  const creances = Math.max(0, ca - cash);
  const toSecure = orders.filter((order) => isOrderOpenForPayment(order, payments)).slice(0, 6);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <SalesPreviewModal preview={preview} setPreview={setPreview} props={props} />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Workflow vente intelligent</p>
          <h3 className="font-black text-[#2f2415]">1 vente = plusieurs modules mis à jour</h3>
          <p className="text-sm text-[#8a7456] mt-1">Preview avant validation, valeurs automatiques corrigeables, aucune ressaisie inutile.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={Receipt} label="CA" value={fmtCurrency(ca)} /><Mini icon={CreditCard} label="Cash" value={fmtCurrency(cash)} /><Mini icon={Users} label="Créances" value={fmtCurrency(creances)} /></div>
      </div>
      {toSecure.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{toSecure.map((order) => <div key={order.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]"><FileText size={14} className="inline" /> {order.product_name || order.libelle || order.id}</p><p className="text-xs text-[#8a7456] mt-1">{clientName(props.clients, order.client_id)} · reste {fmtCurrency(remainingForOrder(order, payments))}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => secureSale(order, props, setPreview)}><CheckCircle2 size={14} className="inline" /> Préparer workflow</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune vente à sécuriser.</div>}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[110px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function VentesV2(props) {
  const documentsCrud = useCrudModule('documents');
  const alertesCrud = useCrudModule('alertes_center');
  const mergedProps = {
    ...props,
    documents: props.documents || documentsCrud.rows,
    alertes: props.alertes || alertesCrud.rows,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertesCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertesCrud.refresh,
  };
  return <div className="space-y-6"><SalesOpportunitiesBridge {...mergedProps} /><SalesBridge {...mergedProps} /><PaymentCapturePanel {...mergedProps} /><Ventes {...mergedProps} /></div>;
}
