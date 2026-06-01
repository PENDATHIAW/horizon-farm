import { AlertTriangle, CheckCircle2, RefreshCw, Scale, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auditFinanceReconciliation, syncPaymentsToFinance } from '../services/financeReconciliationService.js';
import { fmtCurrency } from '../utils/format.js';

export default function FinanceReconciliationPanel(props) {
  const [busy, setBusy] = useState(false);
  const audit = useMemo(() => auditFinanceReconciliation({
    payments: props.payments || [],
    finances: props.transactions || props.finances || [],
    sales_orders: props.salesOrders || props.sales_orders || [],
  }), [props.payments, props.transactions, props.finances, props.salesOrders, props.sales_orders]);

  const sync = async () => {
    if (busy) return;
    if (!audit.paymentGaps.length) return toast.success('Paiements déjà rapprochés avec Finances');
    try {
      setBusy(true);
      const result = await syncPaymentsToFinance({
        data: {
          payments: props.payments || [],
          finances: props.transactions || props.finances || [],
          sales_orders: props.salesOrders || props.sales_orders || [],
        },
        handlers: {
          onCreateFinanceTransaction: props.onCreateFinanceTransaction,
          onRefreshFinances: props.onRefreshFinances,
        },
      });
      toast.success(`${result.created} paiement(s) rapproché(s) vers Finances`);
    } catch (error) {
      toast.error(error.message || 'Rapprochement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]">
            <Scale size={14} /> Rapprochement caisse / banque
          </p>
          <h3 className="mt-3 text-xl font-black text-[#2f2415]">Paiements ↔ Finances</h3>
          <p className="mt-1 text-sm text-[#8a7456]">Chaque encaissement commercial doit créer ou lier une écriture Finances/Comptabilité.</p>
        </div>
        <button
          type="button"
          disabled={busy || !audit.paymentGaps.length || !props.onCreateFinanceTransaction}
          onClick={sync}
          className="rounded-xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? <RefreshCw size={14} className="inline animate-spin" /> : <Wrench size={14} className="inline" />}
          {' '}
          Rapprocher paiements
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Paiements</p><p className="text-lg font-black text-[#2f2415]">{fmtCurrency(audit.paymentTotal)}</p></div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Recettes Finances</p><p className="text-lg font-black text-[#2f2415]">{fmtCurrency(audit.financeIncomeTotal)}</p></div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Écart</p><p className={`text-lg font-black ${audit.delta > 1000 ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtCurrency(audit.delta)}</p></div>
      </div>
      {audit.paymentGaps.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-black text-amber-900 flex items-center gap-2"><AlertTriangle size={16} /> {audit.paymentGaps.length} paiement(s) sans écriture Finance</p>
          {audit.paymentGaps.slice(0, 8).map((gap) => (
            <div key={gap.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm">
              <span className="font-bold text-[#2f2415]">{gap.label}</span>
              <span className="font-black text-amber-800">{fmtCurrency(gap.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={14} className="inline" /> Paiements alignés avec Finances.
        </div>
      )}
    </section>
  );
}
