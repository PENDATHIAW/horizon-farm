import { AlertTriangle, BarChart3, CheckCircle2, DollarSign, PiggyBank, TrendingUp, WalletCards } from 'lucide-react';
import MiniMetricCard from '../components/MiniMetricCard.jsx';
import { buildFinancialPlanVsActual, defaultFinancialPlan } from '../services/financialPlanService';
import { fmtCurrency } from '../utils/format';

const toneFromGap = (gap, inverse = false) => {
  const value = Number(gap || 0);
  if (value === 0) return 'info';
  const good = inverse ? value <= 0 : value >= 0;
  return good ? 'success' : 'danger';
};
const statusLabel = (attainment = 0) => Number(attainment || 0) >= 100 ? 'Atteint' : Number(attainment || 0) >= 80 ? 'À suivre' : 'Retard';
const safeModel = (model = {}) => ({
  ...model,
  currentMonthTarget: model.currentMonthTarget || { revenueTarget: 0, costTarget: 0, marginTarget: 0 },
  revenueByActivity: Array.isArray(model.revenueByActivity) ? model.revenueByActivity : [],
  annualTarget: Number(model.annualTarget || 0),
  annualActual: Number(model.annualActual || 0),
  annualAttainment: Number(model.annualAttainment || 0),
  actualRevenue: Number(model.actualRevenue || 0),
  actualCash: Number(model.actualCash || 0),
  actualCosts: Number(model.actualCosts || 0),
  actualMargin: Number(model.actualMargin || 0),
  revenueGap: Number(model.revenueGap || 0),
  costGap: Number(model.costGap || 0),
  marginGap: Number(model.marginGap || 0),
  revenueAttainment: Number(model.revenueAttainment || 0),
  cashRate: Number(model.cashRate || 0),
  monthCode: model.monthCode || '—',
});

function StatusPill({ children, tone = 'info' }) {
  const cls = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-sky-50 border-sky-200 text-sky-700',
  }[tone] || 'bg-sky-50 border-sky-200 text-sky-700';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-black ${cls}`}>{children}</span>;
}

export default function FinancialPlanPanel({ dataMap = {}, salesOrders = [], payments = [], transactions = [], animaux = [], lots = [], stocks = [], alimentationLogs = [], productionLogs = [], year, month, onNavigate }) {
  const model = safeModel(buildFinancialPlanVsActual({ ...dataMap, salesOrders, sales_orders: salesOrders, payments, transactions, finances: transactions, animaux, avicole: lots, lots, stock: stocks, stocks, alimentationLogs, alimentation_logs: alimentationLogs, productionLogs, production_oeufs_logs: productionLogs }, defaultFinancialPlan, { year, month }));
  const critical = [
    model.revenueAttainment < 80 ? `CA mensuel à ${model.revenueAttainment}% du prévu.` : null,
    model.cashRate < 80 && model.actualRevenue > 0 ? `Encaissement à ${model.cashRate}% du CA réel.` : null,
    model.costGap > 0 ? `Charges au-dessus du budget de ${fmtCurrency(model.costGap)}.` : null,
    model.marginGap < 0 ? `Marge sous le prévisionnel de ${fmtCurrency(Math.abs(model.marginGap))}.` : null,
  ].filter(Boolean);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#9a6b12] font-black flex items-center gap-2"><PiggyBank size={15} aria-hidden="true" /> Plan financier prévisionnel</p>
          <h2 className="mt-1 text-2xl font-black text-[#2f2415]">Prévu vs réel · {model.monthCode}</h2>
          <p className="mt-1 text-sm text-[#8a7456] leading-relaxed">Référence importée du plan Horizon Farm : œufs, poulets de chair, bœufs, fumier, charges, salaires et marge. Le suivi compare les prévisions au réel des ventes, paiements et finances.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('objectifs_croissance')} className="min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-2 text-sm font-black text-[#7d6a4a] hover:bg-[#fff8e8]">Objectifs</button>
          <button type="button" onClick={() => onNavigate?.('finances')} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">Voir finances</button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MiniMetricCard icon={TrendingUp} tone={model.revenueAttainment >= 80 ? 'success' : 'danger'} label="CA prévu mois" value={fmtCurrency(model.currentMonthTarget.revenueTarget)} sub={`${model.revenueAttainment}% atteint`} />
        <MiniMetricCard icon={DollarSign} tone="white" label="CA réel" value={fmtCurrency(model.actualRevenue)} sub={`Écart ${fmtCurrency(model.revenueGap)}`} />
        <MiniMetricCard icon={WalletCards} tone={model.cashRate >= 80 || !model.actualRevenue ? 'success' : 'warning'} label="Encaissement" value={`${model.cashRate}%`} sub={fmtCurrency(model.actualCash)} />
        <MiniMetricCard icon={BarChart3} tone={toneFromGap(model.costGap, true)} label="Charges réelles" value={fmtCurrency(model.actualCosts)} sub={`Budget ${fmtCurrency(model.currentMonthTarget.costTarget)}`} />
        <MiniMetricCard icon={PiggyBank} tone={toneFromGap(model.marginGap)} label="Marge réelle" value={fmtCurrency(model.actualMargin)} sub={`Prévu ${fmtCurrency(model.currentMonthTarget.marginTarget)}`} />
      </div>

      {critical.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black flex items-center gap-2"><AlertTriangle size={16} aria-hidden="true" /> Points à surveiller</p><ul className="mt-2 list-disc pl-5 space-y-1">{critical.map((item) => <li key={item}>{item}</li>)}</ul></div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" aria-hidden="true" /> Le mois est cohérent avec le prévisionnel financier.</div>}

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#eadcc2]"><p className="font-black text-[#2f2415]">CA prévu vs réel par activité</p><p className="text-xs text-[#8a7456]">Objectif annuel prévisionnel : {fmtCurrency(model.annualTarget)} · réalisé annuel : {fmtCurrency(model.annualActual)} ({model.annualAttainment}%)</p></div>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[#8a7456]"><th className="px-4 py-3">Activité</th><th className="px-4 py-3">Prévu mois</th><th className="px-4 py-3">Réel mois</th><th className="px-4 py-3">Écart</th><th className="px-4 py-3">Atteinte</th><th className="px-4 py-3">Statut</th></tr></thead>
            <tbody>{model.revenueByActivity.map((line) => <tr key={line.activity} className="border-t border-[#eadcc2]"><td className="px-4 py-3 font-black text-[#2f2415]">{line.label}</td><td className="px-4 py-3">{fmtCurrency(line.target)}</td><td className="px-4 py-3">{fmtCurrency(line.actual)}</td><td className={`px-4 py-3 font-bold ${Number(line.gap || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtCurrency(line.gap)}</td><td className="px-4 py-3">{line.attainment}%</td><td className="px-4 py-3"><StatusPill tone={line.attainment >= 100 ? 'success' : line.attainment >= 80 ? 'warning' : 'danger'}>{statusLabel(line.attainment)}</StatusPill></td></tr>)}</tbody>
          </table>
        </div>
        <div className="lg:hidden p-3 space-y-2">{model.revenueByActivity.map((line) => <div key={line.activity} className="rounded-xl border border-[#eadcc2] bg-white p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-black text-[#2f2415]">{line.label}</p><p className="text-xs text-[#8a7456]">Prévu {fmtCurrency(line.target)} · Réel {fmtCurrency(line.actual)}</p></div><StatusPill tone={line.attainment >= 100 ? 'success' : line.attainment >= 80 ? 'warning' : 'danger'}>{line.attainment}%</StatusPill></div><p className={`mt-2 text-sm font-black ${Number(line.gap || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Écart : {fmtCurrency(line.gap)}</p></div>)}</div>
      </div>

      <div className="rounded-2xl border border-[#eadcc2] bg-white p-4">
        <p className="font-black text-[#2f2415]">Comment ce plan doit être suivi</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-[#7d6a4a]">
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3"><b>Ventes</b><br />CA réel par tablettes, chair, bœufs et fumier.</div>
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3"><b>Finances</b><br />Charges réelles, salaires, loyers, achats et encaissements.</div>
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3"><b>Production</b><br />Lots, animaux, ponte, alimentation et coûts unitaires.</div>
        </div>
      </div>
    </section>
  );
}
