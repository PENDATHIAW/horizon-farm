import { useCallback, useRef } from 'react';
import { CalendarRange, Thermometer, AlertTriangle } from 'lucide-react';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';
import StrategicDecisionCard from '../centre/StrategicDecisionCard.jsx';
import SanitaryVacuumPanel from '../centre/SanitaryVacuumPanel.jsx';
import { Btn, Section } from './visionUtils';

export default function VisionCyclesTab({
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
  compact = false,
  hideBfr = false,
}) {
  const calendarDetailsRef = useRef(null);
  const openProductionCalendar = useCallback(() => {
    const node = calendarDetailsRef.current;
    if (!node) {
      onNavigate?.('elevage', { tab: 'Cycles & Reproduction' });
      return;
    }
    node.open = true;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [onNavigate]);
  const launchDecisions = (strategicPlan.launch?.cycleDecisions || [])
    .filter((d) => d.type !== 'stress_thermique' || d.priority === 'haute');
  const heatDecision = strategicPlan.launch?.cycleDecisions?.find((d) => d.type === 'stress_thermique');
  const sanitary = strategicPlan.sanitary || [];
  const pivotDecisions = launchDecisions.filter((d) => d.eventLabel);
  const pivotSlice = compact ? pivotDecisions.slice(0, 4) : pivotDecisions;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {!compact ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Cycles de production</p>
              <h3 className="text-lg font-black text-[#2f2415] mt-1">Quand lancer une bande</h3>
            </div>
            {onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Cycles & Reproduction' })}>Élevage → Cycles</Btn> : null}
          </div>
        </>
      ) : (
        <p className="text-xs font-black uppercase tracking-widest text-[#9a6b12]">Dates pivot & lancement</p>
      )}

      {!hideBfr && strategicPlan.bfr?.blocked ? (
        <div className="rounded-2xl border border-red-400 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-black flex items-center gap-2"><AlertTriangle size={16} /> Lancement suspendu — trésorerie</p>
          <p className="mt-1 text-xs">{strategicPlan.bfr.message}</p>
        </div>
      ) : null}

      {pivotSlice.length ? (
        <Section icon={CalendarRange} title={compact ? 'Dates limites par fête' : 'Calendrier marché — date limite de mise en place'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pivotSlice.map((d) => (
              <StrategicDecisionCard
                key={d.id}
                item={d}
                onNavigate={onNavigate}
                setTab={setTab}
                onOpenProductionCalendar={openProductionCalendar}
                onCreateTask={onCreateTask}
                onCreateAlert={onCreateAlert}
                onRefreshTasks={onRefreshTasks}
                onRefreshAlertes={onRefreshAlertes}
                existingTasks={existingTasks}
                existingAlerts={existingAlerts}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section icon={AlertTriangle} title={compact ? 'Vide sanitaire' : 'Vide sanitaire & historique pathologique'}>
        <SanitaryVacuumPanel alerts={sanitary} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} existingTasks={existingTasks} existingAlerts={existingAlerts} />
      </Section>

      {!compact && heatDecision ? (
        <Section icon={Thermometer} title="Chaleur & ITH">
          <StrategicDecisionCard item={heatDecision} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} existingTasks={existingTasks} existingAlerts={existingAlerts} />
        </Section>
      ) : null}

      {!compact && strategicPlan.scissors ? (
        <Section icon={Thermometer} title="Effet ciseau — stocker les intrants">
          <StrategicDecisionCard item={{ ...strategicPlan.scissors, title: 'Achat groupé recommandé' }} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} existingTasks={existingTasks} existingAlerts={existingAlerts} />
        </Section>
      ) : null}

      {!compact && strategicPlan.transformation ? (
        <Section icon={CalendarRange} title="Arbitrage transformation">
          <StrategicDecisionCard
            item={{ ...strategicPlan.transformation, title: 'Incubation vs vente directe', category: 'transformation', module: 'elevage', navTab: 'Transformation' }}
            onNavigate={onNavigate}
            onCreateTask={onCreateTask}
            onCreateAlert={onCreateAlert}
            onRefreshTasks={onRefreshTasks}
            onRefreshAlertes={onRefreshAlertes}
            existingTasks={existingTasks}
            existingAlerts={existingAlerts}
          />
        </Section>
      ) : null}

      <details ref={calendarDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-[#2f2415] text-sm">Calendrier détaillé des lots (J+40, J+90…)</summary>
        <div className="mt-4">
          <ProductionCycleDecisionPanel
            dataMap={dataMap}
            lots={lots}
            animaux={animaux}
            productionLogs={productionLogs}
            onNavigate={onNavigate}
          />
        </div>
      </details>
    </div>
  );
}
