import { AlertTriangle, CheckCircle2, CreditCard, ShoppingCart, UserRound } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const paidOrder = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const orderClientId = (row = {}) => clean(row.client_id || row.customer_id || row.client);
const paymentOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id);
const clientName = (client = {}) => clean(client.nom || client.name || client.raison_sociale || client.id || 'Client');
const saleDate = (row = {}) => clean(row.date || row.date_vente || row.order_date || row.created_at).slice(0, 10);

function paidForOrder(order, payments = []) {
  return Math.max(paidOrder(order), arr(payments).filter((p) => paymentOrderId(p) === clean(order.id)).reduce((sum, p) => sum + paymentAmount(p), 0));
}
function buildRows({ clients = [], salesOrders = [], payments = [] }) {
  const rows = arr(clients).map((client) => {
    const id = clean(client.id);
    const orders = arr(salesOrders).filter((order) => orderClientId(order) === id);
    const ca = orders.reduce((sum, order) => sum + amount(order), 0);
    const paid = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
    const remaining = Math.max(0, ca - paid);
    const lastSale = orders.map(saleDate).filter(Boolean).sort().reverse()[0] || '';
    return { client, id, name: clientName(client), orders: orders.length, ca, paid, remaining, lastSale };
  }).sort((a, b) => b.remaining - a.remaining || b.ca - a.ca);
  const walkInOrders = arr(salesOrders).filter((order) => !orderClientId(order) && clean(order.client_type) === 'passage');
  return { rows, walkInOrders };
}
function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><p className="mt-1 text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${danger ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{children}</span>;
}

export default function ClientSalesHealthPanel({ rows = [], salesOrders = [], payments = [], onNavigate }) {
  const { rows: clientRows, walkInOrders } = buildRows({ clients: rows, salesOrders, payments });
  const receivables = clientRows.reduce((sum, row) => sum + row.remaining, 0);
  const clientsWithDebt = clientRows.filter((row) => row.remaining > 0);
  const ca = clientRows.reduce((sum, row) => sum + row.ca, 0) + walkInOrders.reduce((sum, row) => sum + amount(row), 0);
  const top = clientRows.slice(0, 6);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><UserRound size={15} /> Santé commerciale clients</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Historique, créances et clients à suivre</h3><p className="text-sm text-[#8a7456] mt-1">Les ventes à crédit doivent être rattachées à un client réel ; les clients de passage restent réservés au paiement comptant.</p></div>{clientsWithDebt.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {clientsWithDebt.length} client(s) à relancer</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Créances maîtrisées</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><Mini icon={UserRound} label="Clients" value={clientRows.length} /><Mini icon={ShoppingCart} label="CA clients" value={fmtCurrency(ca)} /><Mini icon={CreditCard} label="À encaisser" value={fmtCurrency(receivables)} danger={receivables > 0} /><Mini icon={ShoppingCart} label="Ventes passage" value={walkInOrders.length} danger={walkInOrders.length > 0} /></div>
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]"><table className="min-w-full text-sm"><thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Client</th><th className="px-3 py-2 text-right">Ventes</th><th className="px-3 py-2 text-right">CA</th><th className="px-3 py-2 text-right">À encaisser</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{top.length ? top.map((row) => <tr key={row.id || row.name} className="border-t border-[#eadcc2]"><td className="px-3 py-2"><b className="text-[#2f2415]">{row.name}</b><p className="text-xs text-[#8a7456]">Dernière vente : {row.lastSale || 'aucune'}</p></td><td className="px-3 py-2 text-right font-bold text-[#2f2415]">{row.orders}</td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(row.ca)}</td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(row.remaining)}</td><td className="px-3 py-2"><Badge danger={row.remaining > 0}>{row.remaining > 0 ? 'À relancer' : 'À jour'}</Badge></td></tr>) : <tr><td colSpan="5" className="px-3 py-6 text-center text-[#8a7456]">Aucun client enregistré pour le moment.</td></tr>}</tbody></table></div>
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Voir ventes</button><button type="button" onClick={() => onNavigate?.('finances')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Voir finances</button></div>
  </section>;
}
