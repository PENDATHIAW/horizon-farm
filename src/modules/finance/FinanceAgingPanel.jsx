import { Clock3 } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { AGING_BUCKET_KEYS } from '../../utils/financePilotageV2.js';

function AgingSection({ title, aging = null, showFarm = false }) {
  if (!aging) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <h3 className="text-base font-black text-[#2f2415]">{title}</h3>
      <p className="text-sm text-[#8a7456]">Total : {fmtCurrency(aging.total)} · {aging.count} élément(s)</p>
      <div className="mt-4 space-y-3">
        {AGING_BUCKET_KEYS.map((key) => {
          const bucket = aging.buckets[key];
          if (!bucket?.count) return null;
          return (
            <div key={key} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-[#2f2415]">{bucket.label}</p>
                <p className="text-sm font-black text-[#9a6b12]">{fmtCurrency(bucket.amount)} · {bucket.count}</p>
              </div>
              <ul className="mt-2 space-y-2">
                {bucket.items.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <p className="font-bold text-[#2f2415]">{item.title}</p>
                      <p className="text-xs text-[#8a7456]">
                        {item.detail}
                        {showFarm && item.farmLabel ? ` · ${item.farmLabel}` : ''}
                        {item.dueDate ? ` · éch. ${item.dueDate}` : ''}
                      </p>
                    </div>
                    <span className="font-black text-[#2f2415]">{fmtCurrency(item.amount)}</span>
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
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock3 size={20} className="text-[#9a6b12]" />
          <div>
            <h2 className="text-lg font-black text-[#2f2415]">Vieillissement créances et dettes</h2>
            <p className="text-sm text-[#8a7456]">Prioriser relances clients et paiements fournisseurs.</p>
          </div>
        </div>
      </section>
      {empty ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
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
