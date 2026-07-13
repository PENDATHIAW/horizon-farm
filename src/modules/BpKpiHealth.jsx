import { AlertTriangle, BarChart3, CheckCircle2, PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react';
import Btn from '../components/Btn';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const money = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant);
const paid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.amount ?? row.montant);
const kind = (row = {}) => String(row.type || '').toLowerCase();
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(kind(row));
const isOut = (row = {}) => ['sortie', 'expense', 'depense', 'dépense', 'charge'].includes(kind(row));
const pct = (value, base) => base ? Math.round((toNumber(value) / toNumber(base)) * 100) : 0;

function compute({ salesOrders = [], payments = [], transactions = [], investments = [] }) {
  const bp = HORIZON_FARM_OFFICIAL_BP;
  const caReal = arr(salesOrders).reduce((sum, row) => sum + money(row), 0);
  const cashPayments = arr(payments).reduce((sum, row) => sum + paid(row), 0);
  const cashTx = arr(transactions).filter(isIn).reduce((sum, row) => sum + money(row), 0);
  const cashIn = Math.max(cashPayments, cashTx);
  const chargesReal = arr(transactions).filter(isOut).reduce((sum, row) => sum + money(row), 0);
  const investmentReal = arr(investments).reduce((sum, row) => sum + money(row), 0);
  const bpRevenue = bp.revenue.annualTotal;
  const bpCharges = bp.variableCosts.correctedAnnualTotal + bp.fixedCosts.annualByYear[0] + bp.payroll.annualTotal;
  const bpInvestment = bp.startupNeeds.officialTotal;
  const marginReal = caReal - chargesReal;
  const bpMargin = bpRevenue - bpCharges;
  const roiReal = investmentReal > 0 ? Math.round((marginReal / investmentReal) * 100) : 0;
  const bpRoi = bpInvestment > 0 ? Math.round((bpMargin / bpInvestment) * 100) : 0;
  const warnings = [];
  if (cashIn > caReal && caReal > 0) warnings.push('Encaissements supérieurs au CA saisi : vérifier doublons paiements/transactions.');
  if (chargesReal > cashIn && cashIn > 0) warnings.push('Charges réelles supérieures au cash encaissé : surveiller la trésorerie.');
  if (investmentReal > bpInvestment * 1.2) warnings.push('Investissements réels supérieurs au besoin officiel : vérifier les lignes effectives.');
  return { caReal, cashIn, chargesReal, investmentReal, marginReal, cashNet: cashIn - chargesReal, roiReal, bpRevenue, bpCharges, bpInvestment, bpMargin, bpRoi, warnings };
}

function Mini({ icon: Icon, label, value, sub, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={14} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><b className="block text-earth break-words">{value}</b><span className="text-xs text-slate">{label}</span>{sub ? <p className="text-meta text-slate mt-1">{sub}</p> : null}</div>;
}

function Row({ label, real, bp, percent = false }) {
  const progress = pct(real, bp);
  const fmt = percent ? (value) => `${fmtNumber(value)}%` : fmtCurrency;
  return <div className="rounded-xl border border-line bg-white p-3"><div className="flex items-center justify-between gap-2"><div><b className="text-earth">{label}</b><p className="text-xs text-slate">Réel {fmt(real)} · BP {fmt(bp)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${progress > 110 ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{progress}%</span></div><div className="mt-2 h-2 rounded-full bg-line overflow-hidden"><div className="h-full bg-horizon" style={{ width: `${Math.min(100, progress)}%` }} /></div></div>;
}

export default function BpKpiHealth(props) {
  const k = compute(props);
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><BarChart3 size={15} /> KPI & BP officiel</p><h3 className="text-xl font-semibold text-earth mt-1">Réel vs Business Plan Horizon Farm</h3></div>{k.warnings.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {k.warnings.length} point(s) à vérifier</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> KPI cohérents</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 text-sm"><Mini icon={TrendingUp} label="CA réel" value={fmtCurrency(k.caReal)} sub={`${pct(k.caReal, k.bpRevenue)}% BP`} /><Mini icon={Wallet} label="Cash encaissé" value={fmtCurrency(k.cashIn)} danger={k.cashIn > k.caReal && k.caReal > 0} /><Mini icon={Scale} label="Charges" value={fmtCurrency(k.chargesReal)} sub={`${pct(k.chargesReal, k.bpCharges)}% BP`} danger={k.chargesReal > k.cashIn && k.cashIn > 0} /><Mini icon={PiggyBank} label="Investissements" value={fmtCurrency(k.investmentReal)} sub={`${pct(k.investmentReal, k.bpInvestment)}% BP`} /><Mini icon={TrendingUp} label="Marge" value={fmtCurrency(k.marginReal)} danger={k.marginReal < 0} /><Mini icon={Wallet} label="Cash net" value={fmtCurrency(k.cashNet)} danger={k.cashNet < 0} /><Mini icon={BarChart3} label="ROI" value={`${fmtNumber(k.roiReal)}%`} sub={`BP ${fmtNumber(k.bpRoi)}%`} danger={k.roiReal < 0} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3"><Row label="CA annuel" real={k.caReal} bp={k.bpRevenue} /><Row label="Charges annuelles" real={k.chargesReal} bp={k.bpCharges} /><Row label="Investissements" real={k.investmentReal} bp={k.bpInvestment} /><Row label="ROI" real={k.roiReal} bp={k.bpRoi} percent /></div>
    {k.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{k.warnings.map((warning) => <div key={warning} className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">{warning}</div>)}</div> : null}
    <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">BP officiel : CA {fmtCurrency(k.bpRevenue)} · Charges {fmtCurrency(k.bpCharges)} · Besoin démarrage {fmtCurrency(k.bpInvestment)}.</div>
    <div className="flex flex-wrap justify-end gap-2"><Btn small variant="outline" onClick={() => props.onNavigate?.('objectifs_croissance')}>Objectifs</Btn><Btn small variant="outline" onClick={() => props.onNavigate?.('finances')}>Finances</Btn><Btn small variant="outline" onClick={() => props.onNavigate?.('rapports')}>Rapports</Btn></div>
  </section>;
}
