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
  const refDate = new Date();
  const upcoming = getUpcomingMarketEvents(refDate, dataMap, { horizonDays: 400 }).slice(0, 8);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black flex items-center gap-2">
          <CalendarDays size={15} /> Fêtes & marchés à venir
        </p>
        <h3 className="text-lg font-black text-[#2f2415] mt-1">Guide saisons — fenêtres commerciales</h3>
        <p className="text-sm text-[#8a7456] mt-1">
          Magal, Gamou, fin d&apos;année et foires locales — dates pivot pour lancer ou vendre avant chaque pic.
        </p>
      </div>
      {upcoming.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {upcoming.map((event) => (
            <article key={event.id || `${event.label}-${event.date}`} className="rounded-2xl border border-[#eadcc2] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-[#2f2415] text-sm">{event.label}</p>
                <span className="shrink-0 rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white">
                  {event.date ? toDateInput(event.date) : '—'}
                </span>
              </div>
              {event.activities?.length ? (
                <p className="mt-2 text-xs text-[#7d6a4a]">Activités : {event.activities.join(' · ')}</p>
              ) : null}
              {event.note ? <p className="mt-1 text-xs text-[#8a7456] leading-relaxed">{event.note}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#8a7456] rounded-xl border border-[#eadcc2] bg-white p-4">
          Aucune fête majeure dans les 12 prochains mois — le calendrier annuel ci-dessous reste la référence.
        </p>
      )}
    </section>
  );
}

/**
 * Guide saisons & marchés — cycles de lancement, calendrier commercial, méthode & calculs.
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
  const [annexeOpen, setAnnexeOpen] = useState(false);

  return (
    <div className="space-y-5">
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
      />
      <AnnualCommercialCalendarPanel dataMap={dataMap} />
      <AccordionSection
        title="Annexe — méthode & calculs"
        detail="Formules ITH, BFR, dates pivot et sources des moteurs décisionnels."
        open={annexeOpen}
        onToggle={() => setAnnexeOpen((v) => !v)}
      >
        <DecisionAnnexeTab moduleLabel="Centre décisionnel" moduleId="centre_ia" dataMap={dataMap} onNavigate={onNavigate} />
      </AccordionSection>
    </div>
  );
}
