import { AlertTriangle, BookOpen, CreditCard, Landmark, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import FinancesV10 from './FinancesV10.jsx';

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
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold">Contrôle consolidé</p>
            <h3 className="text-xl font-black text-[#2f2415]">Finances alignées avec Dashboard & Comptabilité</h3>
            <p className="text-sm text-[#8a7456] mt-1">Commandes, paiements et transactions sont rapprochés avant affichage.</p>
          </div>
          {finance.warnings?.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {finance.warnings.length} point(s) à vérifier</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Rapprochement cohérent</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          <KpiCard icon={TrendingUp} label="CA consolidé" value={fmtCurrency(finance.caConsolide)} sub="commandes non annulées" color="bg-emerald-500/20 text-emerald-500" />
          <KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(finance.cashEncaisse)} sub="paiements rapprochés" color="bg-sky-500/20 text-sky-500" />
          <KpiCard icon={Landmark} label="Créances" value={fmtCurrency(finance.creancesReelles)} sub="reste client réel" color="bg-amber-500/20 text-amber-500" />
          <KpiCard icon={TrendingDown} label="Charges engagées" value={fmtCurrency(finance.chargesEngagees)} sub="transactions sorties" color="bg-red-500/20 text-red-500" />
          <KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(finance.cashNet)} sub="encaissements - charges payées" color={finance.cashNet >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
          <KpiCard icon={BookOpen} label="Marge réelle" value={fmtCurrency(finance.margeReelle)} sub={`CA - charges · ${finance.marginRate}%`} color={finance.margeReelle >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
        </div>
        {finance.warnings?.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{finance.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
      </section>
      <FinancesV10 {...props} />
    </div>
  );
}
