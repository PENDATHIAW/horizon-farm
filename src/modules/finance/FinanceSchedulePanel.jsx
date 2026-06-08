import { CalendarClock } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

function BucketSection({ bucket = null, showFarm = false }) {
  if (!bucket || (!bucket.inflows.length && !bucket.outflows.length)) return null;
  return (
    <section className="rounded-2xl border border-[#eadcc2] bg-white p-4">
      <h3 className="text-sm font-black text-[#2f2415]">{bucket.label}</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Encaissements attendus</p>
          {bucket.inflows.length ? (
            <ul className="mt-2 space-y-2">
              {bucket.inflows.map((row) => (
                <li key={row.id} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#2f2415]">{row.title}</p>
                      <p className="text-xs text-[#8a7456]">{row.detail}{showFarm && row.farmLabel ? ` · ${row.farmLabel}` : ''}</p>
                    </div>
                    <span className="font-black text-emerald-700">{fmtCurrency(row.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#8a7456]">Aucun encaissement prévu.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Paiements à effectuer</p>
          {bucket.outflows.length ? (
            <ul className="mt-2 space-y-2">
              {bucket.outflows.map((row) => (
                <li key={row.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#2f2415]">{row.title}</p>
                      <p className="text-xs text-[#8a7456]">{row.detail}{showFarm && row.farmLabel ? ` · ${row.farmLabel}` : ''}</p>
                    </div>
                    <span className="font-black text-amber-700">{fmtCurrency(row.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#8a7456]">Aucun paiement prévu.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function FinanceSchedulePanel({ schedule = null, showFarm = false }) {
  if (!schedule) return null;
  const empty = !schedule.inflows.length && !schedule.outflows.length;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-[#9a6b12]" />
          <div>
            <h2 className="text-lg font-black text-[#2f2415]">Échéancier financier</h2>
            <p className="text-sm text-[#8a7456]">Encaissements attendus et paiements à effectuer — lecture direction.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="À encaisser" value={fmtCurrency(schedule.totals.inflows)} tone="good" />
          <Stat label="À payer" value={fmtCurrency(schedule.totals.outflows)} tone="warn" />
          <Stat label="Encaissements" value={schedule.inflows.length} />
          <Stat label="Paiements" value={schedule.outflows.length} />
        </div>
      </section>

      {empty ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
          Aucune échéance ouverte — créances et dettes sont à jour.
        </div>
      ) : (
        Object.values(schedule.buckets).map((bucket) => (
          <BucketSection key={bucket.key} bucket={bucket} showFarm={showFarm} />
        ))
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-lg font-black ${cls}`}>{value}</p>
    </div>
  );
}
