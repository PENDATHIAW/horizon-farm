import { CreditCard, FileText, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { fmtCurrency } from '../utils/format.js';
import DailySaleModal from './commercial/DailySaleModal.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0) || 0;
const orderAmount = (order = {}) => num(order.montant_total ?? order.total ?? order.amount);
const paymentAmount = (payment = {}) => num(payment.montant_paye ?? payment.montant ?? payment.amount);
const paidForOrder = (order, payments = []) => Math.max(
  num(order.montant_paye),
  arr(payments)
    .filter((payment) => String(payment.order_id || payment.sale_id || payment.source_record_id) === String(order.id))
    .reduce((sum, payment) => sum + paymentAmount(payment), 0),
);

function Kpi({ icon: Icon, label, value }) {
  return <div className="rounded-lg border border-line bg-white p-4"><Icon size={17} className="text-horizon-dark" /><p className="mt-2 text-xs text-slate">{label}</p><p className="text-lg font-semibold text-earth">{value}</p></div>;
}

export const SaleModal = DailySaleModal;

export default function VentesTerrainV3(props) {
  const [modal, setModal] = useState(false);
  const payments = arr(props.paymentsList || props.payments);
  const orders = arr(props.rows);
  const revenue = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const paid = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
  const remaining = Math.max(0, revenue - paid);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-xl font-semibold text-earth">Ventes</h1>
        <div className="flex gap-2">
          <button type="button" onClick={props.onRefresh} className="min-h-[44px] rounded-lg border border-line px-3 text-xs font-semibold text-slate" title="Actualiser"><RefreshCw size={15} /></button>
          <button type="button" onClick={() => setModal(true)} className="min-h-[44px] rounded-lg bg-earth px-4 text-xs font-semibold text-white"><Plus size={14} className="mr-1 inline" /> Nouvelle vente</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi icon={ShoppingCart} label="CA ventes" value={fmtCurrency(revenue)} />
        <Kpi icon={CreditCard} label="Encaissé" value={fmtCurrency(paid)} />
        <Kpi icon={FileText} label="Créances" value={fmtCurrency(remaining)} />
      </div>
      {modal ? <DailySaleModal props={props} onClose={() => setModal(false)} onDone={() => setModal(false)} /> : null}
    </div>
  );
}
