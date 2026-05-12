import { AlertTriangle, CreditCard, Landmark, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import FinancesV10 from './FinancesV10.jsx';
import ProfitabilityStatement from './ProfitabilityStatement.jsx';

export default function FinancesV11(props) {
  const finance = useMemo(() => consolidateFinance({
    transactions: props.rows || [],
    salesOrders: props.salesOrders || [],
    payments: props.payments || [],
    fournisseurs: props.fournisseurs || [],
    stocks: props.stocks || [],
  }), [props.rows, props.salesOrders, props.payments, props.fournisseurs, props.stocks]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold">Synthèse financière</p>
            <h3 className="text-xl font-black text-[#2f2415]">Cash, créances et marge</h3>
            <p className="text-sm text-[#8a7456] mt-1">Les indicateurs essentiels pour piloter les entrées, sorties et montants à suivre.</p>
          </div>
          {finance.warnings?.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {finance.warnings.length} point(s) à vérifier</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Données cohérentes</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(finance.cashEncaisse)} sub={`CA ${fmtCurrency(finance.caConsolide)}`} color="bg-sky-500/20 text-sky-500" />
          <KpiCard icon={Landmark} label="À encaisser" value={fmtCurrency(finance.creancesReelles)} sub="créances clients" color="bg-amber-500/20 text-amber-500" />
          <KpiCard icon={TrendingDown} label="Charges" value={fmtCurrency(finance.chargesEngagees)} sub="sorties engagées" color="bg-red-500/20 text-red-500" />
          <KpiCard icon={TrendingUp} label="Marge" value={fmtCurrency(finance.margeReelle)} sub={`${finance.marginRate}%`} color={finance.margeReelle >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
        </div>
        {finance.warnings?.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{finance.warnings.slice(0, 4).map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
      </section>
      <ProfitabilityStatement
        transactions={props.rows || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        animaux={props.animaux || []}
        lots={props.lots || []}
        cultures={props.cultures || []}
        stocks={props.stocks || []}
        compact
      />
      <FinancesV10 {...props} />
    </div>
  );
}
