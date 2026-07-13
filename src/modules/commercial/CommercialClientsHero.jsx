import { AlertTriangle, CheckCircle2, CreditCard, Users } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function CommercialClientsHero({ receivable = 0, debtCount = 0, clientCount = 0, onFilterDebt }) {
  const hasDebt = receivable > 0;
  return (
    <section className={`rounded-2xl border p-4 shadow-card ${hasDebt ? 'border-vigilance bg-vigilance-bg' : 'border-positive bg-positive-bg'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-meta font-semibold uppercase tracking-normal text-slate flex items-center gap-2">
            {hasDebt ? <AlertTriangle size={14} className="text-horizon-dark" /> : <CheckCircle2 size={14} className="text-positive" />}
            {hasDebt ? 'Créances à encaisser' : 'Situation clients'}
          </p>
          <p className={`mt-1 text-3xl font-semibold ${hasDebt ? 'text-horizon-dark' : 'text-positive'}`}>{fmtCurrency(receivable)}</p>
          <p className="mt-1 text-sm text-slate">
            {hasDebt ? `${debtCount} client(s) à relancer · ${clientCount} clients actifs` : `${clientCount} client(s) · créances à jour`}
          </p>
        </div>
        {hasDebt ? (
          <button type="button" onClick={onFilterDebt} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-vigilance px-4 py-2 text-sm font-semibold text-white">
            <CreditCard size={16} /> Voir les créances
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-positive bg-white px-4 py-3 text-sm font-semibold text-positive">
            <Users size={16} /> Portefeuille sain
          </div>
        )}
      </div>
    </section>
  );
}
