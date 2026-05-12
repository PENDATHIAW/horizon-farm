import { AlertTriangle, Calculator, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { computeGlobalProfitability, PROFIT_BUCKETS } from '../services/globalProfitabilityService';
import { fmtCurrency } from '../utils/format';

const bucketOrder = ['animaux', 'avicole', 'cultures', 'stock_non_affecte', 'sante_non_affectee', 'rh', 'exploitation', 'equipements', 'fournisseurs_achats', 'autres_charges', 'investissements'];

function Line({ label, value, strong = false, danger = false, muted = false }) {
  return <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${strong ? 'border-[#2f2415] bg-[#2f2415] text-white' : danger ? 'border-amber-200 bg-amber-50 text-amber-900' : muted ? 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]' : 'border-[#eadcc2] bg-white text-[#2f2415]'}`}>
    <span className={strong ? 'font-black' : 'font-bold'}>{label}</span>
    <span className={strong ? 'font-black' : 'font-bold'}>{value}</span>
  </div>;
}

export default function ProfitabilityStatement({ transactions = [], salesOrders = [], payments = [], compact = false }) {
  const profit = computeGlobalProfitability({ transactions, salesOrders, payments });
  const unallocatedCount = (profit.rowsByBucket.stock_non_affecte?.length || 0) + (profit.rowsByBucket.sante_non_affectee?.length || 0);
  const title = compact ? 'Rentabilité réelle' : 'Compte d’exploitation réel';
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Calculator size={20} /> {title}</p>
        <p className="mt-1 text-sm text-[#8a7456]">Lecture anti double-comptage : une charge liée à une activité n’est pas reprise une deuxième fois ailleurs.</p>
      </div>
      <div className={`${profit.operatingResult >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'} rounded-2xl border px-4 py-3 text-sm font-black`}>
        {profit.operatingResult >= 0 ? <TrendingUp size={15} className="inline" /> : <TrendingDown size={15} className="inline" />} Résultat {fmtCurrency(profit.operatingResult)}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Line label="Chiffre d’affaires total" value={fmtCurrency(profit.caTotal)} strong />
        <Line label="Charges directes activités" value={`- ${fmtCurrency(profit.directActivityCharges)}`} />
        <Line label="Marge brute activités" value={fmtCurrency(profit.grossActivityMargin)} strong={profit.grossActivityMargin >= 0} danger={profit.grossActivityMargin < 0} />
        <Line label="Charges non affectées à ventiler" value={`- ${fmtCurrency(profit.unallocatedOperationalCharges)}`} danger={profit.unallocatedOperationalCharges > 0} />
        <Line label="Charges de structure" value={`- ${fmtCurrency(profit.structureCharges)}`} />
        <Line label="Résultat opérationnel" value={fmtCurrency(profit.operatingResult)} strong />
        <Line label="Investissements" value={`- ${fmtCurrency(profit.investments)}`} muted />
        <Line label="Solde trésorerie après investissements" value={fmtCurrency(profit.cashResultAfterInvestments)} danger={profit.cashResultAfterInvestments < 0} />
      </div>
      <div className="space-y-2">
        {bucketOrder.map((key) => <Line key={key} label={PROFIT_BUCKETS[key]} value={fmtCurrency(profit.buckets[key])} danger={['stock_non_affecte', 'sante_non_affectee'].includes(key) && profit.buckets[key] > 0} muted={profit.buckets[key] === 0} />)}
      </div>
    </div>

    {unallocatedCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {unallocatedCount} charge(s) sont non affectées. Elles sont comptées une seule fois ici, mais doivent être rattachées à Animaux, Avicole, Cultures ou Structure pour une marge plus exacte.</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" /> Aucune charge alimentation/santé non affectée détectée. Le risque de double comptage est limité.</div>}
  </section>;
}
