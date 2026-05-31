import { CalendarRange, Thermometer, AlertTriangle } from 'lucide-react';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';
import StrategicDecisionCard from '../centre/StrategicDecisionCard.jsx';
import SanitaryVacuumPanel from '../centre/SanitaryVacuumPanel.jsx';
import { fmtNumber } from '../../utils/format';
import { Btn, Section, TabIntro, VisionKpi } from './visionUtils';

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
}) {
  const launchDecisions = (strategicPlan.launch?.cycleDecisions || []).filter((d) => d.type !== 'stress_thermique' || d.priority === 'haute');
  const heatDecision = strategicPlan.launch?.cycleDecisions?.find((d) => d.type === 'stress_thermique');
  const bfr = strategicPlan.bfr || {};
  const sanitary = strategicPlan.sanitary || [];

  return (
    <div className="space-y-5">
      <TabIntro
        title="Cycles — QUAND LANCER une bande"
        detail="Dates pivot (Tabaski, Korité), trésorerie, chaleur et vide sanitaire. Une section = une décision."
        action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Cycles' })}>Élevage → Cycles</Btn> : null}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Dates pivot marché" value={fmtNumber(launchDecisions.filter((d) => d.eventLabel).length)} tone={launchDecisions.some((d) => d.priority === 'critique') ? 'bad' : 'good'} />
        <VisionKpi label="ITH actuel" value={strategicPlan.ith ?? '—'} tone={(strategicPlan.ith ?? 0) >= 29 ? 'bad' : 'good'} />
        <VisionKpi label="Couverture BFR" value={bfr.coveragePct != null ? `${bfr.coveragePct}%` : '—'} tone={bfr.blocked ? 'bad' : 'good'} />
        <VisionKpi label="Blocages vide sanitaire" value={fmtNumber(sanitary.filter((s) => s.blocking).length)} tone={sanitary.some((s) => s.blocking) ? 'bad' : 'good'} />
      </div>

      {bfr.blocked ? (
        <div className="rounded-2xl border border-red-400 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-black flex items-center gap-2"><AlertTriangle size={16} /> Lancement suspendu — trésorerie</p>
          <p className="mt-1">{bfr.message}</p>
        </div>
      ) : null}

      {launchDecisions.filter((d) => d.eventLabel).length ? (
        <Section icon={CalendarRange} title="1. Calendrier marché — date limite de mise en place">
          <p className="text-xs text-[#8a7456] mb-3">Acheter ou lancer la bande avant la date pivot pour être prêt à la fête.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {launchDecisions.filter((d) => d.eventLabel).map((d) => (
              <StrategicDecisionCard key={d.id} item={d} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section icon={AlertTriangle} title="2. Vide sanitaire & historique pathologique">
        <SanitaryVacuumPanel alerts={sanitary} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} />
      </Section>

      {heatDecision ? (
        <Section icon={Thermometer} title="3. Chaleur & ITH — ajuster le lancement">
          <StrategicDecisionCard item={heatDecision} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} />
        </Section>
      ) : null}

      {strategicPlan.scissors ? (
        <Section icon={Thermometer} title="4. Effet ciseau — stocker les intrants">
          <StrategicDecisionCard item={{ ...strategicPlan.scissors, title: 'Achat groupé recommandé' }} onNavigate={onNavigate} onCreateTask={onCreateTask} onCreateAlert={onCreateAlert} onRefreshTasks={onRefreshTasks} onRefreshAlertes={onRefreshAlertes} />
        </Section>
      ) : null}

      <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-[#2f2415] text-sm">Calendrier détaillé des lots (J+40 chair, J+90 bovins…)</summary>
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
