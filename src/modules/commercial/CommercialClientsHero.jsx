import { AlertTriangle, CheckCircle2, CreditCard, Users } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function CommercialClientsHero({ receivable = 0, debtCount = 0, clientCount = 0, onFilterDebt }) {
  const hasDebt = receivable > 0;
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${hasDebt ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white' : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#8a7456] flex items-center gap-1.5">
            {hasDebt ? <AlertTriangle size={14} className="text-amber-700" /> : <CheckCircle2 size={14} className="text-emerald-700" />}
            {hasDebt ? 'Créances à encaisser' : 'Situation clients'}
          </p>
          <p className={`mt-1 text-3xl font-black ${hasDebt ? 'text-amber-800' : 'text-emerald-800'}`}>{fmtCurrency(receivable)}</p>
          <p className="mt-1 text-sm text-[#8a7456]">
            {hasDebt ? `${debtCount} client(s) à relancer · ${clientCount} clients actifs` : `${clientCount} client(s) · créances à jour`}
          </p>
        </div>
        {hasDebt ? (
          <button type="button" onClick={onFilterDebt} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white">
            <CreditCard size={16} /> Voir les créances
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-800">
            <Users size={16} /> Portefeuille sain
          </div>
        )}
      </div>
    </section>
  );
}
