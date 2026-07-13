import { AlertTriangle, CheckCircle2, CreditCard, ShoppingCart, UserRound } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { buildClientLedger, saleAmount } from './commercial/commercialMetrics.js';

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={15} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><p className="mt-1 text-xs text-slate">{label}</p><p className="font-semibold text-earth break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${danger ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{children}</span>;
}

export default function ClientSalesHealthPanel({ rows = [], salesOrders = [], payments = [], onNavigate, compact = false }) {
  const { rows: clientRows, walkInOrders } = buildClientLedger(rows, salesOrders, payments);
  const receivables = clientRows.reduce((sum, row) => sum + row.remaining, 0);
  const clientsWithDebt = clientRows.filter((row) => row.remaining > 0);
  const ca = clientRows.reduce((sum, row) => sum + row.ca, 0) + walkInOrders.reduce((sum, row) => sum + saleAmount(row), 0);
  const top = clientRows.slice(0, compact ? 8 : 6);
  return (
    <section className={`rounded-2xl border border-line bg-white shadow-card ${compact ? 'p-4 space-y-3' : 'rounded-3xl p-6 space-y-4'}`}>
      {!compact ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><UserRound size={15} /> Clients</p>
            <h3 className="text-xl font-semibold text-earth mt-1">Créances & historique</h3>
          </div>
          {clientsWithDebt.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {clientsWithDebt.length} client(s) à relancer</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Créances maîtrisées</div>}
        </div>
      ) : clientsWithDebt.length ? (
        <p className="text-sm font-semibold text-horizon-dark"><AlertTriangle size={14} className="inline" /> {clientsWithDebt.length} client(s) à relancer · {fmtCurrency(receivables)}</p>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Mini icon={UserRound} label="Clients" value={clientRows.length} />
        <Mini icon={ShoppingCart} label="CA clients" value={fmtCurrency(ca)} />
        <Mini icon={CreditCard} label="À encaisser" value={fmtCurrency(receivables)} danger={receivables > 0} />
        <Mini icon={ShoppingCart} label="Passage" value={walkInOrders.length} danger={walkInOrders.length > 0} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-earth text-white"><tr><th className="px-3 py-2 text-left">Client</th><th className="px-3 py-2 text-right">Ventes</th><th className="px-3 py-2 text-right">CA</th><th className="px-3 py-2 text-right">Reste</th><th className="px-3 py-2 text-left">Statut</th></tr></thead>
          <tbody>
            {top.length ? top.map((row) => (
              <tr key={row.id || row.name} className={`border-t border-line ${row.remaining > 0 ? 'bg-vigilance-bg' : ''}`}>
                <td className="px-3 py-2"><b className="text-earth">{row.name}</b><p className="text-xs text-slate">{row.lastSale || '-'}</p></td>
                <td className="px-3 py-2 text-right font-semibold">{row.orders}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtCurrency(row.ca)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${row.remaining > 0 ? 'text-horizon-dark' : ''}`}>{fmtCurrency(row.remaining)}</td>
                <td className="px-3 py-2"><Badge danger={row.remaining > 0}>{row.remaining > 0 ? 'À relancer' : 'À jour'}</Badge></td>
              </tr>
            )) : <tr><td colSpan="5" className="px-3 py-6 text-center text-slate">Aucun client enregistré.</td></tr>}
          </tbody>
        </table>
      </div>
      {!compact ? (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Voir ventes</button>
        </div>
      ) : null}
    </section>
  );
}
