import { ArrowRight, CalendarDays, Settings2 } from 'lucide-react';
import { formatFestivalDateFr } from '../../services/islamicCalendarEngine.js';
import { getAutoFestivalSchedule } from '../../services/marketEventCalendar.js';
import { loadPilotageSettings, normalizePilotageSettings } from '../../services/pilotageSettingsService.js';

export default function PilotageContextStrip({ dataMap = {}, onNavigate, compact = false }) {
  const settings = normalizePilotageSettings(dataMap.growth_settings || loadPilotageSettings());
  const schedule = getAutoFestivalSchedule(new Date(), { growth_settings: settings });
  const festivalLine = schedule
    .filter((row) => row.activeDate || row.autoDate)
    .slice(0, 3)
    .map((row) => `${row.label} ${formatFestivalDateFr(row.overridden ? row.overrideDate : (row.activeDate || row.autoDate))}`)
    .join(' · ');

  if (compact) {
    return (
      <p className="text-xs text-[#8a7456] flex items-start gap-2">
        <CalendarDays size={14} className="mt-0.5 shrink-0 text-emerald-700" />
        <span>
          <b className="text-[#2f2415]">Pilotage :</b> bande {settings.next_band_size} sujets · BFR min {settings.bfr_min_coverage_pct}% ·
          {festivalLine ? ` prochaines fêtes : ${festivalLine}` : ' fêtes calculées automatiquement'}
        </span>
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
            <Settings2 size={14} /> Contexte pilotage
          </p>
          <p className="text-sm text-[#2f2415] mt-1">
            Bande {settings.next_band_size} sujets · vide sanitaire {settings.sanitary_min_days} j ·
            BFR min {settings.bfr_min_coverage_pct}% · VIP {(settings.vip_client_ids || []).length} client(s)
          </p>
          {festivalLine ? (
            <p className="text-xs text-[#8a7456] mt-1 flex items-start gap-2">
              <CalendarDays size={13} className="mt-0.5 shrink-0 text-emerald-700" />
              <span>Prochaines fêtes calculées : {festivalLine}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('centre_ia', { tab: 'À traiter' })}
          className="rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7] flex items-center gap-2 shrink-0"
        >
          Configurer dans Centre <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
