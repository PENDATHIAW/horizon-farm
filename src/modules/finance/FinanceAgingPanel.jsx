import { Clock3 } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { AGING_BUCKET_KEYS } from '../../utils/financePilotageV2.js';

function AgingSection({ title, aging = null, showFarm = false }) {
  if (!aging) return null;
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <h3 className="text-base font-semibold text-earth">{title}</h3>
      <p className="text-sm text-slate">Total : {fmtCurrency(aging.total)} · {aging.count} élément(s)</p>
      <div className="mt-4 space-y-3">
        {AGING_BUCKET_KEYS.map((key) => {
          const bucket = aging.buckets[key];
          if (!bucket?.count) return null;
          return (
            <div key={key} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-earth">{bucket.label}</p>
                <p className="text-sm font-semibold text-horizon-dark">{fmtCurrency(bucket.amount)} · {bucket.count}</p>
              </div>
              <ul className="mt-2 space-y-2">
                {bucket.items.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-earth">{item.title}</p>
                      <p className="text-xs text-slate">
                        {item.detail}
                        {showFarm && item.farmLabel ? ` · ${item.farmLabel}` : ''}
                        {item.dueDate ? ` · éch. ${item.dueDate}` : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-earth">{fmtCurrency(item.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function FinanceAgingPanel({ receivablesAging = null, payablesAging = null, showFarm = false }) {
  const empty = !receivablesAging?.count && !payablesAging?.count;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-2">
          <Clock3 size={20} className="text-horizon-dark" />
          <div>
            <h2 className="text-lg font-semibold text-earth">Vieillissement créances et dettes</h2>
            <p className="text-sm text-slate">Prioriser relances clients et paiements fournisseurs.</p>
          </div>
        </div>
      </section>
      {empty ? (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-slate">
          Aucune créance ou dette ouverte à classer.
        </div>
      ) : (
        <>
          <AgingSection title="Créances clients" aging={receivablesAging} showFarm={showFarm} />
          <AgingSection title="Dettes fournisseurs" aging={payablesAging} showFarm={showFarm} />
        </>
      )}
    </div>
  );
}
