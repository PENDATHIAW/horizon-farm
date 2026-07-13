import { CalendarClock } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

function BucketSection({ bucket = null, showFarm = false }) {
  if (!bucket || (!bucket.inflows.length && !bucket.outflows.length)) return null;
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h3 className="text-sm font-semibold text-earth">{bucket.label}</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-positive">Encaissements attendus</p>
          {bucket.inflows.length ? (
            <ul className="mt-2 space-y-2">
              {bucket.inflows.map((row) => (
                <li key={row.id} className="rounded-xl border border-positive bg-positive-bg px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-earth">{row.title}</p>
                      <p className="text-xs text-slate">{row.detail}{showFarm && row.farmLabel ? ` · ${row.farmLabel}` : ''}</p>
                    </div>
                    <span className="font-semibold text-positive">{fmtCurrency(row.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate">Aucun encaissement prévu.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Paiements à effectuer</p>
          {bucket.outflows.length ? (
            <ul className="mt-2 space-y-2">
              {bucket.outflows.map((row) => (
                <li key={row.id} className="rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-earth">{row.title}</p>
                      <p className="text-xs text-slate">{row.detail}{showFarm && row.farmLabel ? ` · ${row.farmLabel}` : ''}</p>
                    </div>
                    <span className="font-semibold text-horizon-dark">{fmtCurrency(row.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate">Aucun paiement prévu.</p>
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
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-horizon-dark" />
          <div>
            <h2 className="text-lg font-semibold text-earth">Échéancier financier</h2>
            <p className="text-sm text-slate">Encaissements attendus et paiements à effectuer - lecture direction.</p>
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
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-slate">
          Aucune échéance ouverte - créances et dettes sont à jour.
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
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : 'text-earth';
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
