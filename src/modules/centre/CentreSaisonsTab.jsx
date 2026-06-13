import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import AnnualCommercialCalendarPanel from '../AnnualCommercialCalendarPanel.jsx';
import VisionCyclesTab from '../vision/VisionCyclesTab.jsx';
import DecisionAnnexeTab from './DecisionAnnexeTab.jsx';
import { getUpcomingMarketEvents } from '../../services/marketEventCalendar.js';
import { toDateInput } from '../../utils/format';

function AccordionSection({ title, detail, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-5 text-left">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">{title}</p>
          {detail ? <p className="mt-1 text-sm text-[#8a7456]">{detail}</p> : null}
        </div>
        {open ? <ChevronUp size={18} className="shrink-0 text-[#8a7456]" /> : <ChevronDown size={18} className="shrink-0 text-[#8a7456]" />}
      </button>
      {open ? <div className="border-t border-[#eadcc2] p-5 pt-4">{children}</div> : null}
    </section>
  );
}

function UpcomingMarketEventsPanel({ dataMap = {} }) {
  const upcoming = getUpcomingMarketEvents(new Date(), dataMap, { horizonDays: 400 }).slice(0, 4);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-3">
      <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black flex items-center gap-2">
        <CalendarDays size={15} /> Prochaines fêtes & marchés
      </p>
      {upcoming.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {upcoming.map((event) => (
            <article key={event.id || `${event.label}-${event.date}`} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 flex items-center justify-between gap-2">
              <p className="font-black text-[#2f2415] text-sm">{event.label}</p>
              <span className="shrink-0 text-[10px] font-black text-[#8a7456]">{event.date ? toDateInput(event.date) : '—'}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#8a7456]">Aucune fête majeure à venir — consultez le calendrier annuel ci-dessous.</p>
      )}
    </section>
  );
}

/**
 * Saisons & marchés — fêtes, dates pivot, vide sanitaire (sans urgences ni ROI).
 */
export default function CentreSaisonsTab({
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  strategicPlan = {},
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [annexeOpen, setAnnexeOpen] = useState(false);

  return (
    <div className="space-y-4">
      <UpcomingMarketEventsPanel dataMap={dataMap} />
      <VisionCyclesTab
        dataMap={dataMap}
        lots={lots}
        animaux={animaux}
        productionLogs={productionLogs}
        strategicPlan={strategicPlan}
        onNavigate={onNavigate}
        onCreateTask={onCreateTask}
        onCreateAlert={onCreateAlert}
        onRefreshTasks={onRefreshTasks}
        onRefreshAlertes={onRefreshAlertes}
        existingTasks={existingTasks}
        existingAlerts={existingAlerts}
        compact
        hideBfr
      />
      <AccordionSection
        title="Calendrier annuel"
        detail="Référence saisonnière par mois — lecture, pas une file d'actions."
        open={calendarOpen}
        onToggle={() => setCalendarOpen((v) => !v)}
      >
        <AnnualCommercialCalendarPanel dataMap={dataMap} compact hideUpcoming />
      </AccordionSection>
      <AccordionSection
        title="Méthode & calculs"
        detail="ITH, BFR, dates pivot."
        open={annexeOpen}
        onToggle={() => setAnnexeOpen((v) => !v)}
      >
        <DecisionAnnexeTab moduleLabel="Centre décisionnel" moduleId="centre_ia" dataMap={dataMap} onNavigate={onNavigate} />
      </AccordionSection>
    </div>
  );
}
