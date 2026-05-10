import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';

function Metric({ label, value, danger = false }) {
  return <div className={`rounded-2xl border p-3 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <p className="text-lg font-black text-[#2f2415]">{value}</p>
  </div>;
}

export default function ConsolidatedFinanceStrip({ title = 'Synthèse consolidée', rows = [], salesOrders = [], payments = [], fournisseurs = [], stocks = [], compact = false }) {
  const summary = consolidateFinance({ transactions: rows, salesOrders, payments, fournisseurs, stocks });
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Wallet size={19} /> {title}</p>
        <p className="mt-1 text-sm text-[#8a7456]">Même source que Finances/Comptabilité : commandes + paiements + transactions rapprochés.</p>
      </div>
      {summary.warnings.length ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><AlertTriangle size={13} className="inline" /> cohérence à vérifier</span> : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} className="inline" /> cohérent</span>}
    </div>
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 xl:grid-cols-6'}`}>
      <Metric label="CA consolidé" value={fmtCurrency(summary.caConsolide)} />
      <Metric label="Cash encaissé" value={fmtCurrency(summary.cashEncaisse)} />
      <Metric label="Créances" value={fmtCurrency(summary.creancesReelles)} danger={summary.creancesReelles > 0} />
      <Metric label="Charges" value={fmtCurrency(summary.chargesEngagees)} />
      {!compact ? <Metric label="Cash net" value={fmtCurrency(summary.cashNet)} danger={summary.cashNet < 0} /> : null}
      {!compact ? <Metric label="Marge réelle" value={fmtCurrency(summary.margeReelle)} danger={summary.margeReelle < 0} /> : null}
    </div>
  </section>;
}
