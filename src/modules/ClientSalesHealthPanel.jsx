import { AlertTriangle, CheckCircle2, CreditCard, ShoppingCart, UserRound } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { buildClientLedger, saleAmount } from './commercial/commercialMetrics.js';

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><p className="mt-1 text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${danger ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{children}</span>;
}

export default function ClientSalesHealthPanel({ rows = [], salesOrders = [], payments = [], onNavigate, compact = false }) {
  const { rows: clientRows, walkInOrders } = buildClientLedger(rows, salesOrders, payments);
  const receivables = clientRows.reduce((sum, row) => sum + row.remaining, 0);
  const clientsWithDebt = clientRows.filter((row) => row.remaining > 0);
  const ca = clientRows.reduce((sum, row) => sum + row.ca, 0) + walkInOrders.reduce((sum, row) => sum + saleAmount(row), 0);
  const top = clientRows.slice(0, compact ? 8 : 6);
  return (
    <section className={`rounded-2xl border border-[#d6c3a0] bg-white shadow-sm ${compact ? 'p-4 space-y-3' : 'rounded-3xl p-5 space-y-4'}`}>
      {!compact ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><UserRound size={15} /> Clients</p>
            <h3 className="text-xl font-black text-[#2f2415] mt-1">Créances & historique</h3>
          </div>
          {clientsWithDebt.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {clientsWithDebt.length} client(s) à relancer</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Créances maîtrisées</div>}
        </div>
      ) : clientsWithDebt.length ? (
        <p className="text-sm font-black text-amber-800"><AlertTriangle size={14} className="inline" /> {clientsWithDebt.length} client(s) à relancer · {fmtCurrency(receivables)}</p>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Mini icon={UserRound} label="Clients" value={clientRows.length} />
        <Mini icon={ShoppingCart} label="CA clients" value={fmtCurrency(ca)} />
        <Mini icon={CreditCard} label="À encaisser" value={fmtCurrency(receivables)} danger={receivables > 0} />
        <Mini icon={ShoppingCart} label="Passage" value={walkInOrders.length} danger={walkInOrders.length > 0} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Client</th><th className="px-3 py-2 text-right">Ventes</th><th className="px-3 py-2 text-right">CA</th><th className="px-3 py-2 text-right">Reste</th><th className="px-3 py-2 text-left">Statut</th></tr></thead>
          <tbody>
            {top.length ? top.map((row) => (
              <tr key={row.id || row.name} className={`border-t border-[#eadcc2] ${row.remaining > 0 ? 'bg-amber-50/30' : ''}`}>
                <td className="px-3 py-2"><b className="text-[#2f2415]">{row.name}</b><p className="text-xs text-[#8a7456]">{row.lastSale || '—'}</p></td>
                <td className="px-3 py-2 text-right font-bold">{row.orders}</td>
                <td className="px-3 py-2 text-right font-black">{fmtCurrency(row.ca)}</td>
                <td className={`px-3 py-2 text-right font-black ${row.remaining > 0 ? 'text-amber-800' : ''}`}>{fmtCurrency(row.remaining)}</td>
                <td className="px-3 py-2"><Badge danger={row.remaining > 0}>{row.remaining > 0 ? 'À relancer' : 'À jour'}</Badge></td>
              </tr>
            )) : <tr><td colSpan="5" className="px-3 py-6 text-center text-[#8a7456]">Aucun client enregistré.</td></tr>}
          </tbody>
        </table>
      </div>
      {!compact ? (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Voir ventes</button>
        </div>
      ) : null}
    </section>
  );
}
