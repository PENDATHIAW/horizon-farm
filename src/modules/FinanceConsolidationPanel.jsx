import { AlertTriangle, CheckCircle2, Landmark, Receipt, Wallet } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';

function Card({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#d6c3a0] bg-[#fffdf8]'}`}>
    <Icon size={17} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} />
    <p className="mt-2 text-xs text-[#8a7456]">{label}</p>
    <p className="text-xl font-black text-[#2f2415]">{value}</p>
    {hint ? <p className="mt-1 text-[11px] text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function FinanceConsolidationPanel({ rows = [], salesOrders = [], payments = [], fournisseurs = [], stocks = [], onNavigate }) {
  const summary = consolidateFinance({ transactions: rows, salesOrders, payments, fournisseurs, stocks });
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Vérité financière consolidée</p>
        <h3 className="text-lg font-black text-[#2f2415]">Ventes + paiements + transactions rapprochés</h3>
        <p className="mt-1 text-sm text-[#8a7456]">Ce panneau évite le double comptage : les créances et encaissements sont recalculés depuis les commandes et paiements réels.</p>
      </div>
      <button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white">Vérifier les ventes</button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
      <Card icon={Receipt} label="CA facturé" value={fmtCurrency(summary.caFacture)} hint={`${fmtNumber(summary.orderSettlements.length)} commande(s)`} />
      <Card icon={Wallet} label="Cash encaissé" value={fmtCurrency(summary.cashEncaisse)} hint="paiements rapprochés" />
      <Card icon={Landmark} label="Créances réelles" value={fmtCurrency(summary.creancesReelles)} hint="reste à encaisser" danger={summary.creancesReelles > 0} />
      <Card icon={Receipt} label="Charges engagées" value={fmtCurrency(summary.chargesEngagees)} hint="transactions sorties" />
      <Card icon={Wallet} label="Cash net" value={fmtCurrency(summary.cashNet)} hint="cash - charges payées" danger={summary.cashNet < 0} />
      <Card icon={CheckCircle2} label="Marge réelle" value={fmtCurrency(summary.margeReelle)} hint={`${summary.marginRate}%`} danger={summary.margeReelle < 0} />
    </div>
    {summary.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <p className="font-bold"><AlertTriangle size={14} className="inline" /> Points de cohérence à vérifier</p>
      <ul className="mt-1 list-disc pl-5">{summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Aucun paiement flottant détecté dans les données visibles.</div>}
  </section>;
}
