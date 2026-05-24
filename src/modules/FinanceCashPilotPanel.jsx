import { AlertTriangle, Banknote, CreditCard, PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const orderTotal = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount);
const paidOrder = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(lower(row.type));
const isOut = (row = {}) => ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(lower(row.type));
const isDebt = (row = {}) => isOut(row) && ['impaye', 'partiel'].includes(lower(row.statut || row.status));
const isCreditTx = (row = {}) => isIn(row) && ['impaye', 'partiel'].includes(lower(row.statut || row.status));

function compute({ transactions = [], salesOrders = [], payments = [], fournisseurs = [] }) {
  const tx = arr(transactions);
  const cashInTx = tx.filter(isIn).filter((row) => !isCreditTx(row)).reduce((sum, row) => sum + amount(row), 0);
  const cashOut = tx.filter(isOut).filter((row) => !isDebt(row)).reduce((sum, row) => sum + amount(row), 0);
  const cashFromPayments = arr(payments).reduce((sum, row) => sum + paymentAmount(row), 0);
  const cashIn = Math.max(cashInTx, cashFromPayments);
  const receivablesOrders = arr(salesOrders).reduce((sum, row) => sum + Math.max(0, orderTotal(row) - paidOrder(row)), 0);
  const receivablesTx = tx.filter(isCreditTx).reduce((sum, row) => sum + amount(row), 0);
  const receivables = Math.max(receivablesOrders, receivablesTx);
  const debtsTx = tx.filter(isDebt).reduce((sum, row) => sum + amount(row), 0);
  const debtsSuppliers = arr(fournisseurs).reduce((sum, row) => sum + toNumber(row.dettes ?? row.dette ?? row.solde_du), 0);
  const debts = Math.max(debtsTx, debtsSuppliers);
  const cashBalance = cashIn - cashOut;
  const netPosition = cashBalance + receivables - debts;
  const warnings = [];
  if (cashBalance < 0) warnings.push('La trésorerie encaissée est inférieure aux dépenses payées.');
  if (receivables > cashIn * 0.35 && receivables > 0) warnings.push('Les créances représentent une part importante du cash encaissé.');
  if (debts > cashBalance && debts > 0) warnings.push('Les dettes dépassent la trésorerie disponible.');
  return { cashIn, cashOut, cashBalance, receivables, debts, netPosition, warnings };
}
function Mini({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

export default function FinanceCashPilotPanel(props) {
  const k = compute(props);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Wallet size={15} /> Trésorerie</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Cash, créances et dettes</h3><p className="text-sm text-[#8a7456] mt-1">Vue simple : ce qui est encaissé, ce qui est dépensé, ce qui reste à recevoir et ce qui reste à payer.</p></div>{k.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {k.warnings.length} alerte(s) cash</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Cash suivi</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm"><Mini icon={TrendingUp} label="Cash encaissé" value={fmtCurrency(k.cashIn)} /><Mini icon={TrendingDown} label="Dépenses payées" value={fmtCurrency(k.cashOut)} danger={k.cashOut > k.cashIn} /><Mini icon={PiggyBank} label="Trésorerie nette" value={fmtCurrency(k.cashBalance)} danger={k.cashBalance < 0} /><Mini icon={CreditCard} label="Créances" value={fmtCurrency(k.receivables)} danger={k.receivables > 0} /><Mini icon={Receipt} label="Dettes" value={fmtCurrency(k.debts)} danger={k.debts > 0} /><Mini icon={Banknote} label="Position nette" value={fmtCurrency(k.netPosition)} danger={k.netPosition < 0} /></div>
    {k.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{k.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Lecture :</b> Finances répond à “combien j’ai encaissé, dépensé, à recevoir et à payer ?”. Comptabilité contrôle ensuite les preuves et régularisations.</div>
  </section>;
}
