import { AlertTriangle, CreditCard, Landmark, ListChecks, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import FinancesV10 from './FinancesV10.jsx';
import OwnerSalaryRecommendationPanel from './OwnerSalaryRecommendationPanel.jsx';
import ProfitabilityStatement from './ProfitabilityStatement.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function FinancesV11(props) {
  const finance = useMemo(() => consolidateFinance({
    transactions: props.rows || [],
    salesOrders: props.salesOrders || [],
    payments: props.payments || [],
    fournisseurs: props.fournisseurs || [],
    stocks: props.stocks || [],
  }), [props.rows, props.salesOrders, props.payments, props.fournisseurs, props.stocks]);

  return (
    <div className="space-y-6 finances-mobile-structured">
      <style>{`@media (max-width: 640px){.finances-mobile-structured .rounded-2xl{border-radius:18px}.finances-mobile-structured table{font-size:12px}.finances-mobile-structured th,.finances-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.finances-mobile-structured .text-2xl{font-size:1.35rem}.finances-mobile-structured .grid{gap:.75rem}.finances-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection
        icon={CreditCard}
        title="Trésorerie et alertes financières"
        subtitle="Cash encaissé, créances, charges engagées et points à vérifier."
      >
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
      </ModuleSection>

      <ModuleSection
        icon={Wallet}
        title="Rémunération propriétaire"
        subtitle="Salaire recommandé selon résultat, cash disponible et réserve de sécurité."
      >
        <OwnerSalaryRecommendationPanel
          transactions={props.rows || []}
          salesOrders={props.salesOrders || []}
          payments={props.payments || []}
          animaux={props.animaux || []}
          lots={props.lots || []}
          cultures={props.cultures || []}
          stocks={props.stocks || []}
          onCreateFinanceTransaction={props.onCreate}
          onRefreshFinances={props.onRefresh}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      </ModuleSection>

      <ModuleSection
        icon={TrendingUp}
        title="Résultat réel ferme"
        subtitle="CA, charges directes, charges de structure, investissements, prélèvements et cash disponible."
      >
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
      </ModuleSection>

      <ModuleSection
        icon={ListChecks}
        title="Écritures financières"
        subtitle="Liste détaillée des entrées, sorties, paiements, justificatifs et opérations."
      >
        <FinancesV10 {...props} />
      </ModuleSection>
    </div>
  );
}
