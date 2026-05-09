import { CheckCircle2, CreditCard, FileText, Receipt, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { commitSaleWorkflow, prepareSaleWorkflow, useSuggestion } from '../services/workflowService';
import Ventes from './Ventes.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const total = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount);
const paid = (order = {}) => toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
const payStatus = (order = {}) => String(order.statut_paiement ?? order.payment_status ?? '').toLowerCase();
const orderStatus = (order = {}) => String(order.statut_commande ?? order.status ?? '').toLowerCase();
const clientName = (clients, id) => arr(clients).find((c) => c.id === id)?.nom || arr(clients).find((c) => c.id === id)?.name || id || 'Client non renseigné';
const badgeClass = (kind) => kind === 'Modifié' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';

async function secureSale(order, props, setPreview) {
  const preview = prepareSaleWorkflow(order, {
    invoices: props.invoicesList,
    payments: props.paymentsList,
    transactions: props.transactions,
    documents: props.documents,
    clients: props.clients,
    events: props.businessEvents,
    alerts: props.alertes,
  });
  setPreview(preview);
}

async function commitPreview(preview, props, setPreview) {
  try {
    const result = await commitSaleWorkflow(preview, {
      onCreateInvoice: props.onCreateInvoice,
      onCreatePayment: props.onCreatePayment,
      onCreateFinanceTransaction: props.onCreateFinanceTransaction,
      onUpdateOrder: props.onUpdate,
      onUpdateClient: props.onUpdateClient,
      onCreateDocument: props.onCreateDocument,
      onCreateBusinessEvent: props.onCreateBusinessEvent,
      onCreateAlert: props.onCreateAlert,
    });
    await props.onRefresh?.();
    toast.success(`Vente validée · ${result.saisies_evitees} saisies évitées`);
    setPreview(null);
  } catch (error) {
    toast.error(error.message || 'Validation workflow vente impossible');
  }
}

function SalesPreviewModal({ preview, setPreview, props }) {
  if (!preview) return null;
  const amount = preview.fields.amount;
  const paidField = preview.fields.paid;
  const activity = preview.fields.activity;
  const overridePaid = (value) => setPreview((p) => ({ ...p, fields: { ...p.fields, paid: { ...p.fields.paid, final_value: toNumber(value), manual_override: true } } }));
  const resetPaid = () => setPreview((p) => useSuggestion(p, 'fields.paid'));
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Preview workflow vente</p><h3 className="text-xl font-black text-[#2f2415]">Avant validation multi-modules</h3><p className="text-sm text-[#8a7456] mt-1">Tu peux corriger avant d’écrire dans Finances, Documents, Client et Traçabilité.</p></div>
          <button type="button" onClick={() => setPreview(null)} className="text-[#8a7456] font-bold">×</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info title="Montant auto" value={fmtCurrency(amount.auto_value)} badge={amount.manual_override ? 'Modifié' : 'Auto'} />
            <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><span className={`text-xs border rounded-full px-2 py-0.5 ${badgeClass(paidField.manual_override ? 'Modifié' : 'Auto')}`}>{paidField.manual_override ? 'Modifié' : 'Auto'}</span><p className="text-xs text-[#8a7456] mt-2">Montant encaissé final</p><input className="mt-1 w-full rounded-lg border border-[#d6c3a0] px-2 py-1 font-bold" type="number" value={paidField.final_value} onChange={(e) => overridePaid(e.target.value)} /><button className="mt-2 text-xs font-bold text-emerald-700" type="button" onClick={resetPaid}><RefreshCw size={12} className="inline" /> Utiliser la suggestion</button></div>
            <Info title="Activité" value={activity.final_value} badge={activity.manual_override ? 'Modifié' : 'Auto'} />
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
  const ca = orders.reduce((sum, order) => sum + total(order), 0);
  const cash = orders.reduce((sum, order) => sum + paid(order), 0);
  const creances = Math.max(0, ca - cash);
  const toSecure = orders.filter((order) => total(order) > 0 && payStatus(order) !== 'paye' && orderStatus(order) !== 'annule').slice(0, 6);
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
      {toSecure.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{toSecure.map((order) => <div key={order.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]"><FileText size={14} className="inline" /> {order.product_name || order.libelle || order.id}</p><p className="text-xs text-[#8a7456] mt-1">{clientName(props.clients, order.client_id)} · reste {fmtCurrency(Math.max(0, total(order) - paid(order)))}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => secureSale(order, props, setPreview)}><CheckCircle2 size={14} className="inline" /> Préparer workflow</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune vente à sécuriser.</div>}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[110px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function VentesV2(props) {
  return <div className="space-y-6"><SalesBridge {...props} /><Ventes {...props} /></div>;
}
