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
    success: 'bg-positive-bg border-positive text-positive',
    warning: 'bg-vigilance-bg border-vigilance text-horizon-dark',
    danger: 'bg-urgent-bg border-urgent text-urgent',
    info: 'bg-neutral-bg border-line text-neutral',
  }[tone] || 'bg-neutral-bg border-line text-neutral';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
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
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold flex items-center gap-2"><PiggyBank size={15} aria-hidden="true" /> Plan financier prévisionnel</p>
          <h2 className="mt-1 text-2xl font-semibold text-earth">Prévu vs réel · {model.monthLabel || model.monthCode}</h2>
          <p className="mt-1 text-sm text-slate leading-relaxed">
            {model.activityYear?.year1Label || 'Année 1'} — objectifs BP calés sur 12 mois après le démarrage ({model.activityYear?.startDate ? new Date(model.activityYear.startDate).toLocaleDateString('fr-FR') : 'date non renseignée'}).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('objectifs_croissance')} className="min-h-[44px] rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-slate hover:bg-vigilance-bg">Objectifs</button>
          <button type="button" onClick={() => onNavigate?.('finances')} className="min-h-[44px] rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white hover:bg-earth">Voir finances</button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MiniMetricCard icon={TrendingUp} tone={model.revenueAttainment >= 80 ? 'success' : 'danger'} label="CA prévu mois" value={fmtCurrency(model.currentMonthTarget.revenueTarget)} sub={`${model.revenueAttainment}% atteint`} />
        <MiniMetricCard icon={DollarSign} tone="white" label="CA réel" value={fmtCurrency(model.actualRevenue)} sub={`Écart ${fmtCurrency(model.revenueGap)}`} />
        <MiniMetricCard icon={WalletCards} tone={model.cashRate >= 80 || !model.actualRevenue ? 'success' : 'warning'} label="Encaissement" value={`${model.cashRate}%`} sub={fmtCurrency(model.actualCash)} />
        <MiniMetricCard icon={BarChart3} tone={toneFromGap(model.costGap, true)} label="Charges réelles" value={fmtCurrency(model.actualCosts)} sub={`Budget ${fmtCurrency(model.currentMonthTarget.costTarget)}`} />
        <MiniMetricCard icon={PiggyBank} tone={toneFromGap(model.marginGap)} label="Marge réelle" value={fmtCurrency(model.actualMargin)} sub={`Prévu ${fmtCurrency(model.currentMonthTarget.marginTarget)}`} />
      </div>

      {critical.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark"><p className="font-semibold flex items-center gap-2"><AlertTriangle size={16} aria-hidden="true" /> Points à surveiller</p><ul className="mt-2 list-disc pl-6 space-y-1">{critical.map((item) => <li key={item}>{item}</li>)}</ul></div> : <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive"><CheckCircle2 size={16} className="inline" aria-hidden="true" /> Le mois est cohérent avec le prévisionnel financier.</div>}

      <div className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-line"><p className="font-semibold text-earth">CA prévu vs réel par activité</p><p className="text-xs text-slate">Objectif Année 1 : {fmtCurrency(model.annualTarget)} · réalisé Année 1 : {fmtCurrency(model.annualActual)} ({model.annualAttainment}%)</p></div>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-meta uppercase tracking-normal text-slate"><th className="px-4 py-3">Activité</th><th className="px-4 py-3">Prévu mois</th><th className="px-4 py-3">Réel mois</th><th className="px-4 py-3">Écart</th><th className="px-4 py-3">Atteinte</th><th className="px-4 py-3">Statut</th></tr></thead>
            <tbody>{model.revenueByActivity.map((line) => <tr key={line.activity} className="border-t border-line"><td className="px-4 py-3 font-semibold text-earth">{line.label}</td><td className="px-4 py-3">{fmtCurrency(line.target)}</td><td className="px-4 py-3">{fmtCurrency(line.actual)}</td><td className={`px-4 py-3 font-semibold ${Number(line.gap || 0) >= 0 ? 'text-positive' : 'text-urgent'}`}>{fmtCurrency(line.gap)}</td><td className="px-4 py-3">{line.attainment}%</td><td className="px-4 py-3"><StatusPill tone={line.attainment >= 100 ? 'success' : line.attainment >= 80 ? 'warning' : 'danger'}>{statusLabel(line.attainment)}</StatusPill></td></tr>)}</tbody>
          </table>
        </div>
        <div className="lg:hidden p-3 space-y-2">{model.revenueByActivity.map((line) => <div key={line.activity} className="rounded-xl border border-line bg-white p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-earth">{line.label}</p><p className="text-xs text-slate">Prévu {fmtCurrency(line.target)} · Réel {fmtCurrency(line.actual)}</p></div><StatusPill tone={line.attainment >= 100 ? 'success' : line.attainment >= 80 ? 'warning' : 'danger'}>{line.attainment}%</StatusPill></div><p className={`mt-2 text-sm font-semibold ${Number(line.gap || 0) >= 0 ? 'text-positive' : 'text-urgent'}`}>Écart : {fmtCurrency(line.gap)}</p></div>)}</div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="font-semibold text-earth">Comment ce plan doit être suivi</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate">
          <div className="rounded-xl bg-card border border-line p-3"><b>Ventes</b><br />CA réel par tablettes, chair, bœufs et fumier.</div>
          <div className="rounded-xl bg-card border border-line p-3"><b>Finances</b><br />Charges réelles, salaires, loyers, achats et encaissements.</div>
          <div className="rounded-xl bg-card border border-line p-3"><b>Production</b><br />Lots, animaux, ponte, alimentation et coûts unitaires.</div>
        </div>
      </div>
    </section>
  );
}
