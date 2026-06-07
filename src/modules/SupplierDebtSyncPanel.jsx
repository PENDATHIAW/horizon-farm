import { AlertTriangle, CheckCircle2, RefreshCw, Scale, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auditSupplierDebtGaps, syncSupplierDebtsToFinance } from '../services/supplierDebtSyncService.js';
import { fmtCurrency } from '../utils/format.js';

export default function SupplierDebtSyncPanel(props) {
  const [busy, setBusy] = useState(false);
  const audit = useMemo(() => auditSupplierDebtGaps({
    fournisseurs: props.fournisseurs || props.suppliers || [],
    finances: props.transactions || props.finances || [],
    transactions: props.transactions || props.finances || [],
  }), [props.fournisseurs, props.suppliers, props.transactions, props.finances]);

  const sync = async () => {
    if (busy) return;
    if (!audit.gaps.length) return toast.success('Dettes fournisseurs déjà visibles en Finances');
    try {
      setBusy(true);
      const result = await syncSupplierDebtsToFinance({
        data: {
          fournisseurs: props.fournisseurs || props.suppliers || [],
          finances: props.transactions || props.finances || [],
        },
        handlers: {
          onCreateFinanceTransaction: props.onCreateFinanceTransaction,
          onRefreshFinances: props.onRefreshFinances,
        },
      });
      toast.success(`${result.created} dette(s) fournisseur synchronisée(s) vers Finances`);
    } catch (error) {
      toast.error(error.message || 'Synchronisation dettes impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]">
            <Scale size={14} /> Dettes fournisseurs
          </p>
          <h3 className="mt-3 text-xl font-black text-[#2f2415]">Synchroniser dettes → Finances</h3>
          <p className="mt-1 text-sm text-[#8a7456]">Reste à payer fournisseurs visible en Achats et en Finances/Comptabilité.</p>
        </div>
        <button
          type="button"
          disabled={busy || !audit.gaps.length || !props.onCreateFinanceTransaction}
          onClick={sync}
          className="rounded-xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? <RefreshCw size={14} className="inline animate-spin" /> : <Wrench size={14} className="inline" />}
          {' '}
          Synchroniser dettes
        </button>
      </div>
      {audit.gaps.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-black text-amber-900 flex items-center gap-2"><AlertTriangle size={16} /> {audit.gaps.length} fournisseur(s) sans ligne Finance</p>
          {audit.gaps.map((gap) => (
            <div key={gap.dedupeKey} className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm">
              <span className="font-bold text-[#2f2415]">{gap.label}</span>
              <span className="font-black text-amber-800">{fmtCurrency(gap.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={14} className="inline" /> Dettes fournisseurs alignées avec Finances.
        </div>
      )}
    </section>
  );
}
