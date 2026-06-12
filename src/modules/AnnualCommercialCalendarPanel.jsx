import { CalendarDays, Leaf, ShieldAlert, Target } from 'lucide-react';
import { HORIZON_COMMERCIAL_MONTHS, HORIZON_TRANSVERSAL_STRATEGIES } from '../services/horizonCommercialCalendar';
import { contextualizeSeasonalText, getUpcomingMarketEvents } from '../services/marketEventCalendar.js';

function demandText(month = {}) {
  const high = Object.entries(month.demand || {}).filter(([, level]) => level === 'forte').map(([activity]) => activity);
  return high.length ? high.join(' · ') : 'demande normale';
}

export default function AnnualCommercialCalendarPanel({ dataMap = {} }) {
  const refDate = new Date();
  const upcoming = getUpcomingMarketEvents(refDate, dataMap, { horizonDays: 400 });
  const currentMonth = refDate.getMonth() + 1;

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><CalendarDays size={15} /> Calendrier commercial annuel</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Référence saisonnière — ventes toute l&apos;année</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Document de référence (pas une file d&apos;actions). Les décisions de lancement et fêtes à venir sont dans l&apos;onglet Saisons & marchés.
          </p>
          {upcoming.length ? (
            <p className="text-xs text-[#9a6b12] font-black mt-2">
              Prochaines fenêtres : {upcoming.slice(0, 4).map((event) => event.label).join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-[#fffdf8] border border-[#eadcc2] p-3 text-xs text-[#7d6a4a] max-w-md">
          <b className="text-[#2f2415]">Principe :</b> bouchers, foirails, Touba, Berndé, restaurants et clients directs permettent de vendre toute l&apos;année. Les fêtes servent à maximiser prix et volume — seules les fêtes <b>à venir</b> sont mises en avant ci-dessous.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[...HORIZON_COMMERCIAL_MONTHS]
          .sort((a, b) => Math.abs(a.month - currentMonth) - Math.abs(b.month - currentMonth))
          .slice(0, 8)
          .map((month) => (
          <div key={month.month} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 min-w-0">
            <div className="flex justify-between gap-2 items-start">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#8a7456] font-black">{month.label}</p>
                <p className="text-xs text-[#7d6a4a] mt-1">{month.season?.replaceAll('_', ' ')}</p>
              </div>
              <span className="rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white">M{month.month}</span>
            </div>

            <div className="mt-3 rounded-xl bg-white border border-[#eadcc2] p-3">
              <p className="text-xs font-black text-[#2f2415] flex items-center gap-1"><Target size={13} /> Forte demande</p>
              <p className="text-xs text-[#7d6a4a] mt-1">{demandText(month)}</p>
            </div>

            <div className="mt-2 rounded-xl bg-white border border-[#eadcc2] p-3">
              <p className="text-xs font-black text-[#2f2415] flex items-center gap-1"><Leaf size={13} /> Cultures / focus</p>
              <p className="text-xs text-[#7d6a4a] mt-1">{month.crops?.slice(0, 4).join(' · ') || month.focus?.join(' · ')}</p>
            </div>

            <div className="mt-2 space-y-1">
              {month.actions?.slice(0, 2).map((action) => (
                <p key={action} className="text-[11px] text-[#7d6a4a] leading-snug">
                  • {contextualizeSeasonalText(action, upcoming, refDate)}
                </p>
              ))}
            </div>

            {month.risks?.length ? (
              <p className="mt-2 text-[11px] text-amber-700 flex items-start gap-1">
                <ShieldAlert size={12} className="mt-0.5 shrink-0" />
                {contextualizeSeasonalText(month.risks.slice(0, 2).join(' · '), upcoming, refDate)}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-black text-emerald-800">Stratégies transversales</p>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {HORIZON_TRANSVERSAL_STRATEGIES.slice(0, 6).map((strategy) => (
            <p key={strategy} className="text-xs text-emerald-800">• {strategy}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
