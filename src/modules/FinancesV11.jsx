import { AlertTriangle, BarChart3, CreditCard, Landmark, ListChecks, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import { fmtCurrency, toNumber } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import FinancesV10 from './FinancesV10.jsx';
import OwnerSalaryRecommendationPanel from './OwnerSalaryRecommendationPanel.jsx';
import ProfitabilityStatement from './ProfitabilityStatement.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const rowDate = (row = {}) => row.date || row.created_at || row.paid_at || row.date_paiement || new Date().toISOString();
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(String(row.type || '').toLowerCase());
const isOut = (row = {}) => ['sortie', 'expense', 'out'].includes(String(row.type || '').toLowerCase());
function monthKey(value) { return String(value || new Date().toISOString()).slice(0, 7); }
function monthLabel(key) { const [, month] = String(key || '').split('-'); return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][Number(month || 1) - 1] || key; }
function lastMonths(count = 6) { const base = new Date(); return Array.from({ length: count }).map((_, index) => { const d = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1); return d.toISOString().slice(0, 7); }); }
function buildFinanceEvolution(transactions = [], salesOrders = [], payments = []) {
  return lastMonths(6).map((key) => {
    const tx = arr(transactions).filter((row) => monthKey(rowDate(row)) === key);
    const ventes = arr(salesOrders).filter((row) => monthKey(rowDate(row)) === key).reduce((sum, row) => sum + amount(row), 0);
    const paiements = arr(payments).filter((row) => monthKey(rowDate(row)) === key).reduce((sum, row) => sum + amount(row), 0);
    const entrees = Math.max(tx.filter(isIn).reduce((sum, row) => sum + amount(row), 0), ventes, paiements);
    const sorties = tx.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
    return { key, label: monthLabel(key), entrees, sorties, resultat: entrees - sorties };
  });
}

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

function EvolutionBar({ label, value, max, hint, danger = false }) {
  const pct = max > 0 ? Math.max(3, Math.min(100, Math.abs(value) / max * 100)) : 0;
  return <div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="font-bold text-[#2f2415]">{label}</span><span className={danger ? 'text-red-600' : 'text-[#8a7456]'}>{hint}</span></div><div className="h-3 rounded-full bg-[#f2eadb] overflow-hidden"><div className={`h-full rounded-full ${danger ? 'bg-red-400' : 'bg-[#c9a96a]'}`} style={{ width: `${pct}%` }} /></div></div>;
}

function FinanceEvolutionPanel({ transactions = [], salesOrders = [], payments = [] }) {
  const rows = useMemo(() => buildFinanceEvolution(transactions, salesOrders, payments), [transactions, salesOrders, payments]);
  const max = Math.max(...rows.flatMap((row) => [row.entrees, row.sorties, Math.abs(row.resultat)]), 0);
  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Entrées</p>{rows.map((row) => <EvolutionBar key={`in-${row.key}`} label={row.label} value={row.entrees} max={max} hint={fmtCurrency(row.entrees)} />)}</div>
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Sorties</p>{rows.map((row) => <EvolutionBar key={`out-${row.key}`} label={row.label} value={row.sorties} max={max} hint={fmtCurrency(row.sorties)} danger={row.sorties > row.entrees} />)}</div>
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Résultat</p>{rows.map((row) => <EvolutionBar key={`net-${row.key}`} label={row.label} value={row.resultat} max={max} hint={fmtCurrency(row.resultat)} danger={row.resultat < 0} />)}</div>
  </div>;
}

export default function FinancesV11(props) {
  const finance = useMemo(() => consolidateFinance({
    transactions: props.rows || [],
    salesOrders: props.salesOrders || [],
    payments: props.payments || [],
    fournisseurs: props.fournisseurs || [],
    stocks: props.stocks || [],
  }), [props.rows, props.salesOrders, props.payments, props.fournisseurs, props.stocks]);

  const dataMap = {
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.rows || [],
    animaux: props.animaux || [],
    avicole: props.lots || [],
    cultures: props.cultures || [],
    stock: props.stocks || [],
  };

  return (
    <div className="space-y-6 finances-mobile-structured">
      <style>{`@media (max-width: 640px){.finances-mobile-structured .rounded-2xl{border-radius:18px}.finances-mobile-structured table{font-size:12px}.finances-mobile-structured th,.finances-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.finances-mobile-structured .text-2xl{font-size:1.35rem}.finances-mobile-structured .grid{gap:.75rem}.finances-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ObjectivePerformanceCard dataMap={dataMap} activity="global" title="Objectif & Performance financière" onNavigate={props.onNavigate} />

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
          <KpiCard icon={Landmark} label="À encaisser" value={fmtCurrency(finance.creancesReelles)} sub="montants clients" color="bg-amber-500/20 text-amber-500" />
          <KpiCard icon={TrendingDown} label="Charges" value={fmtCurrency(finance.chargesEngagees)} sub="sorties engagées" color="bg-red-500/20 text-red-500" />
          <KpiCard icon={TrendingUp} label="Marge" value={fmtCurrency(finance.margeReelle)} sub={`${finance.marginRate}%`} color={finance.margeReelle >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
        </div>
        {finance.warnings?.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{finance.warnings.slice(0, 4).map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
      </ModuleSection>

      <ModuleSection
        icon={BarChart3}
        title="Évolution financière"
        subtitle="Graphes des entrées, sorties et résultat sur les derniers mois."
      >
        <FinanceEvolutionPanel transactions={props.rows || []} salesOrders={props.salesOrders || []} payments={props.payments || []} />
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
