import { CalendarDays, Leaf, ShieldAlert, Target } from 'lucide-react';
import { HORIZON_COMMERCIAL_MONTHS, HORIZON_TRANSVERSAL_STRATEGIES } from '../services/horizonCommercialCalendar';
import { contextualizeSeasonalText, getUpcomingMarketEvents } from '../services/marketEventCalendar.js';

function demandText(month = {}) {
  const high = Object.entries(month.demand || {}).filter(([, level]) => level === 'forte').map(([activity]) => activity);
  return high.length ? high.join(' · ') : 'demande normale';
}

export default function AnnualCommercialCalendarPanel({ dataMap = {}, compact = false, hideUpcoming = false }) {
  const refDate = new Date();
  const upcoming = getUpcomingMarketEvents(refDate, dataMap, { horizonDays: 400 });
  const currentMonth = refDate.getMonth() + 1;
  const monthLimit = compact ? 4 : 8;
  const strategyLimit = compact ? 3 : 6;

  return (
    <div className={compact ? 'space-y-3' : 'rounded-3xl border border-line bg-white p-6 shadow-card space-y-4'}>
      {!compact ? (
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><CalendarDays size={15} /> Calendrier commercial annuel</p>
            <h3 className="text-xl font-semibold text-earth mt-1">Référence saisonnière</h3>
          </div>
          {!hideUpcoming && upcoming.length ? (
            <p className="text-xs text-horizon-dark font-semibold">
              Prochaines fenêtres : {upcoming.slice(0, 4).map((event) => event.label).join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[...HORIZON_COMMERCIAL_MONTHS]
          .sort((a, b) => Math.abs(a.month - currentMonth) - Math.abs(b.month - currentMonth))
          .slice(0, monthLimit)
          .map((month) => (
          <div key={month.month} className="rounded-2xl border border-line bg-card p-4 min-w-0">
            <div className="flex justify-between gap-2 items-start">
              <div>
                <p className="text-meta uppercase tracking-normal text-slate font-semibold">{month.label}</p>
                <p className="text-xs text-slate mt-1">{month.season?.replaceAll('_', ' ')}</p>
              </div>
              <span className="rounded-full bg-earth px-2 py-1 text-meta font-semibold text-white">M{month.month}</span>
            </div>

            <div className="mt-3 rounded-xl bg-white border border-line p-3">
              <p className="text-xs font-semibold text-earth flex items-center gap-1"><Target size={13} /> Forte demande</p>
              <p className="text-xs text-slate mt-1">{demandText(month)}</p>
            </div>

            <div className="mt-2 rounded-xl bg-white border border-line p-3">
              <p className="text-xs font-semibold text-earth flex items-center gap-1"><Leaf size={13} /> Cultures / focus</p>
              <p className="text-xs text-slate mt-1">{month.crops?.slice(0, 4).join(' · ') || month.focus?.join(' · ')}</p>
            </div>

            <div className="mt-2 space-y-1">
              {month.actions?.slice(0, 2).map((action) => (
                <p key={action} className="text-meta text-slate leading-snug">
                  • {contextualizeSeasonalText(action, upcoming, refDate)}
                </p>
              ))}
            </div>

            {month.risks?.length ? (
              <p className="mt-2 text-meta text-horizon-dark flex items-start gap-1">
                <ShieldAlert size={12} className="mt-1 shrink-0" />
                {contextualizeSeasonalText(month.risks.slice(0, 2).join(' · '), upcoming, refDate)}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {!compact ? (
        <div className="rounded-2xl border border-positive bg-positive-bg p-4">
          <p className="font-semibold text-positive">Stratégies transversales</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {HORIZON_TRANSVERSAL_STRATEGIES.slice(0, strategyLimit).map((strategy) => (
              <p key={strategy} className="text-xs text-positive">• {strategy}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
