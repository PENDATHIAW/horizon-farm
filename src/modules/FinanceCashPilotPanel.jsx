import { AlertTriangle, Banknote, CreditCard, PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { computeFinanceCash } from '../utils/financeCash';

function Mini({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

export default function FinanceCashPilotPanel(props) {
  const k = computeFinanceCash(props);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Wallet size={15} /> Trésorerie</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Argent reçu, dépensé et à suivre</h3><p className="text-sm text-[#8a7456] mt-1">Vue simple : ce qui est encaissé, ce qui est dépensé, ce qui reste à recevoir et ce qui reste à payer.</p></div>{k.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {k.warnings.length} point(s) cash</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Cash suivi</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm"><Mini icon={TrendingUp} label="Argent reçu" value={fmtCurrency(k.cashIn)} hint="Ventes payées et paiements reçus." /><Mini icon={TrendingDown} label="Argent dépensé" value={fmtCurrency(k.cashOut)} hint="Dépenses réellement payées." danger={k.cashOut > k.cashIn} /><Mini icon={PiggyBank} label="Disponible estimé" value={fmtCurrency(k.cashBalance)} danger={k.cashBalance < 0} /><Mini icon={CreditCard} label="Reste à encaisser" value={fmtCurrency(k.receivables)} hint="Ventes non encore payées." danger={k.receivables > 0} /><Mini icon={Receipt} label="Reste à payer" value={fmtCurrency(k.debts)} hint="Fournisseurs ou dépenses ouvertes." danger={k.debts > 0} /><Mini icon={Banknote} label="Position nette" value={fmtCurrency(k.netPosition)} danger={k.netPosition < 0} /></div>
    {k.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{k.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Lecture :</b> Finances répond à “combien j’ai encaissé, dépensé, à recevoir et à payer ?”. Comptabilité contrôle ensuite les preuves et régularisations.</div>
  </section>;
}
