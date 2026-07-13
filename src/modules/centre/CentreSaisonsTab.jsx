import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import AnnualCommercialCalendarPanel from '../AnnualCommercialCalendarPanel.jsx';
import VisionCyclesTab from '../vision/VisionCyclesTab.jsx';
import DecisionAnnexeTab from './DecisionAnnexeTab.jsx';
import { getUpcomingMarketEvents } from '../../services/marketEventCalendar.js';
import { toDateInput } from '../../utils/format';

function AccordionSection({ title, detail, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-line bg-card shadow-card">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-6 text-left">
        <div>
          <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">{title}</p>
          {detail ? <p className="mt-1 text-sm text-slate">{detail}</p> : null}
        </div>
        {open ? <ChevronUp size={18} className="shrink-0 text-slate" /> : <ChevronDown size={18} className="shrink-0 text-slate" />}
      </button>
      {open ? <div className="border-t border-line p-6 pt-4">{children}</div> : null}
    </section>
  );
}

function UpcomingMarketEventsPanel({ dataMap = {} }) {
  const upcoming = getUpcomingMarketEvents(new Date(), dataMap, { horizonDays: 400 }).slice(0, 4);

  return (
    <section className="rounded-3xl border border-line bg-white p-4 shadow-card space-y-3">
      <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold flex items-center gap-2">
        <CalendarDays size={15} /> Prochaines fêtes & marchés
      </p>
      {upcoming.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {upcoming.map((event) => (
            <article key={event.id || `${event.label}-${event.date}`} className="rounded-xl border border-line bg-card px-3 py-2 flex items-center justify-between gap-2">
              <p className="font-semibold text-earth text-sm">{event.label}</p>
              <span className="shrink-0 text-meta font-semibold text-slate">{event.date ? toDateInput(event.date) : '—'}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate">Aucune fête majeure à venir — consultez le calendrier annuel ci-dessous.</p>
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
  setTab,
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
        setTab={setTab}
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
