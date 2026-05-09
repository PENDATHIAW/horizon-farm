import { CheckCircle2, CreditCard, FileText, Receipt, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import Ventes from './Ventes.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const total = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount);
const paid = (order = {}) => toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
const payStatus = (order = {}) => String(order.statut_paiement ?? order.payment_status ?? '').toLowerCase();
const orderStatus = (order = {}) => String(order.statut_commande ?? order.status ?? '').toLowerCase();
const clientName = (clients, id) => arr(clients).find((c) => c.id === id)?.nom || arr(clients).find((c) => c.id === id)?.name || id || 'Client non renseigné';

async function secureSale(order, props) {
  const orderTotal = total(order);
  const alreadyPaid = paid(order);
  const due = Math.max(0, orderTotal - alreadyPaid);
  const invoiceId = order.invoice_id || makeId('FAC');
  const paymentId = order.payment_id || makeId('PAI');
  const trxId = order.transaction_id || makeId('TRX');
  try {
    await props.onCreateInvoice?.({ id: invoiceId, order_id: order.id, client_id: order.client_id || '', date: today(), total_amount: orderTotal, montant_total: orderTotal, status: due > 0 ? 'a_encaisser' : 'payee', source_module: 'ventes', source_record_id: order.id });
    if (due > 0) {
      await props.onCreatePayment?.({ id: paymentId, order_id: order.id, invoice_id: invoiceId, client_id: order.client_id || '', date: today(), montant: due, amount: due, statut: 'paye', moyen_paiement: order.moyen_paiement || '', source_module: 'ventes', source_record_id: order.id });
      await props.onCreateFinanceTransaction?.({ id: trxId, type: 'entree', libelle: `Encaissement ${order.product_name || order.libelle || order.id}`, montant: due, date: today(), categorie: 'Ventes', module_lie: 'ventes', related_id: order.id, activite: order.source_type || 'ventes', client_id: order.client_id || '', statut: 'paye', source_module: 'ventes', source_record_id: order.id, invoice_id: invoiceId, payment_id: paymentId });
    }
    await props.onUpdate?.(order.id, { statut_commande: orderStatus(order) === 'brouillon' ? 'confirme' : (order.statut_commande || order.status || 'confirme'), statut_paiement: 'paye', montant_paye: orderTotal, invoice_id: invoiceId, payment_id: paymentId, transaction_id: trxId, secured_at: new Date().toISOString() });
    if (order.client_id) {
      const client = arr(props.clients).find((c) => c.id === order.client_id);
      if (client) await props.onUpdateClient?.(order.client_id, { dernier_achat: today(), total_achats: toNumber(client.total_achats) + orderTotal, creances: Math.max(0, toNumber(client.creances) - due) });
    }
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'vente_securisee', module_source: 'ventes', entity_type: 'sales_order', entity_id: order.id, title: 'Vente sécurisée', description: `${order.product_name || order.id} - ${fmtCurrency(orderTotal)}`, event_date: today(), severity: 'success' });
    await props.onRefresh?.();
    toast.success('Vente liée: facture, paiement, finance et client');
  } catch (error) {
    toast.error(error.message || 'Sécurisation vente impossible');
  }
}

function SalesBridge(props) {
  const orders = arr(props.rows);
  const ca = orders.reduce((sum, order) => sum + total(order), 0);
  const cash = orders.reduce((sum, order) => sum + paid(order), 0);
  const creances = Math.max(0, ca - cash);
  const toSecure = orders.filter((order) => total(order) > 0 && payStatus(order) !== 'paye' && orderStatus(order) !== 'annule').slice(0, 6);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Priorité 4 · Ventes connectées</p>
          <h3 className="font-black text-[#2f2415]">Commande → facture → paiement → finance → client</h3>
          <p className="text-sm text-[#8a7456] mt-1">Les ventes non encaissées peuvent être sécurisées sans ressaisie dans Finances.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={Receipt} label="CA" value={fmtCurrency(ca)} /><Mini icon={CreditCard} label="Cash" value={fmtCurrency(cash)} /><Mini icon={Users} label="Créances" value={fmtCurrency(creances)} /></div>
      </div>
      {toSecure.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{toSecure.map((order) => <div key={order.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]"><FileText size={14} className="inline" /> {order.product_name || order.libelle || order.id}</p><p className="text-xs text-[#8a7456] mt-1">{clientName(props.clients, order.client_id)} · reste {fmtCurrency(Math.max(0, total(order) - paid(order)))}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => secureSale(order, props)}><CheckCircle2 size={14} className="inline" /> Sécuriser / encaisser</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune vente à sécuriser.</div>}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[110px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function VentesV2(props) {
  return <div className="space-y-6"><SalesBridge {...props} /><Ventes {...props} /></div>;
}
