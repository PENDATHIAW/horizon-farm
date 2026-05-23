import { AlertTriangle, CalendarDays, PiggyBank, TrendingUp, WalletCards } from 'lucide-react';
import MiniMetricCard from '../components/MiniMetricCard.jsx';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { buildFinancialPlanVsActual, defaultFinancialPlan } from '../services/financialPlanService';
import { fmtCurrency } from '../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);
const last = (value) => { const rows = arr(value); return rows[rows.length - 1] || null; };

export default function FinancialPlanLightPanel({ dataMap = {}, salesOrders = [], payments = [], transactions = [], onNavigate }) {
  const model = buildFinancialPlanVsActual({
    ...dataMap,
    salesOrders: arr(salesOrders).length ? salesOrders : dataMap.salesOrders || dataMap.sales_orders || [],
    sales_orders: arr(salesOrders).length ? salesOrders : dataMap.salesOrders || dataMap.sales_orders || [],
    payments: arr(payments).length ? payments : dataMap.payments || [],
    transactions: arr(transactions).length ? transactions : dataMap.transactions || dataMap.finances || [],
    finances: arr(transactions).length ? transactions : dataMap.transactions || dataMap.finances || [],
  }, defaultFinancialPlan);

  const target = model.currentMonthTarget || { revenueTarget: 0, costTarget: 0, marginTarget: 0 };
  const lines = arr(model.revenueByActivity).slice(0, 6);
  const official = HORIZON_FARM_OFFICIAL_BP;
  const finalCash = last(official.forecast.monthlyCashYear1)?.cumulativeCash || 0;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#9a6b12] font-black flex items-center gap-2"><PiggyBank size={15} aria-hidden="true" /> Fichier financier intégré</p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Plan Horizon Farm — objectifs officiels</h2>
          <p className="mt-1 text-sm text-[#8a7456] leading-relaxed">Ce bloc reprend la source unique du BP : CA annuel, objectifs mensuels, charges corrigées, BFR, résultat et trésorerie prévisionnelle.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_ia')} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">Voir décisions</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MiniMetricCard icon={PiggyBank} tone="success" label="Objectif annuel" value={fmtCurrency(model.annualTarget)} sub="Plan financier" />
        <MiniMetricCard icon={CalendarDays} tone="white" label="Objectif du mois" value={fmtCurrency(target.revenueTarget)} sub={model.monthCode} />
        <MiniMetricCard icon={TrendingUp} tone={model.revenueAttainment >= 80 ? 'success' : 'warning'} label="Réalisé du mois" value={fmtCurrency(model.actualRevenue)} sub={`${model.revenueAttainment}% atteint`} />
        <MiniMetricCard icon={WalletCards} tone={model.cashRate >= 80 || !model.actualRevenue ? 'success' : 'warning'} label="Encaissement" value={`${model.cashRate || 0}%`} sub={fmtCurrency(model.actualCash)} />
      </div>

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Santé financière BP officiel</p>
          <p className="text-sm text-[#8a7456] mt-1">Lecture rapide des données financières de l’onglet plan financier.</p>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
          <MiniValue label="Charges variables corrigées" value={fmtCurrency(official.variableCosts.correctedAnnualTotal)} sub={`Fichier : ${fmtCurrency(official.variableCosts.workbookAnnualTotal)}`} />
          <MiniValue label="Charges fixes A1" value={fmtCurrency(official.fixedCosts.annualByYear[0])} sub="loyers + provisions + entretien" />
          <MiniValue label="Salaires + rémunération" value={fmtCurrency(official.payroll.annualTotal)} sub="année 1" />
          <MiniValue label="BFR A1" value={fmtCurrency(official.workingCapital.bfrByYear[0])} sub="30j client / 30j fournisseur" />
          <MiniValue label="Trésorerie finale A1" value={fmtCurrency(finalCash)} sub="prévisionnel" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><b>Résultat A1 :</b> {fmtCurrency(official.forecast.resultByYear[0])} · <b>CAF A1 :</b> {fmtCurrency(official.forecast.cashFlowCapacityByYear[0])}</div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={14} className="inline" /> Charges poussins chair corrigées à 1 024 000 FCFA/mois selon ta stratégie validée.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lines.map((line) => (
          <div key={line.activity} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-[#2f2415]">{line.label}</p>
                <p className="text-xs text-[#8a7456] mt-1">Annuel : {fmtCurrency(line.annualRevenue)}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black border ${Number(line.attainment || 0) >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{line.attainment || 0}%</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#8a7456]">
              <div className="rounded-xl bg-white border border-[#eadcc2] p-2"><b className="block text-[#2f2415]">{fmtCurrency(line.target)}</b>Prévu mois</div>
              <div className="rounded-xl bg-white border border-[#eadcc2] p-2"><b className="block text-[#2f2415]">{fmtCurrency(line.actual)}</b>Réel mois</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniValue({ label, value, sub }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-white p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] mt-1">{value}</p>{sub ? <p className="text-[11px] text-[#8a7456] mt-1">{sub}</p> : null}</div>;
}
