import { CalendarRange, Thermometer, AlertTriangle } from 'lucide-react';
import ProductionQuestionsPanel from '../../components/ProductionQuestionsPanel.jsx';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';
import StrategicDecisionCard from '../centre/StrategicDecisionCard.jsx';
import { fmtNumber } from '../../utils/format';
import { Btn, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionCyclesTab({
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  strategicPlan = {},
  onNavigate,
}) {
  const lotCount = (lots || []).length;
  const animalCount = (animaux || []).length;
  const logCount = (productionLogs || []).length;
  const launchDecisions = strategicPlan.launch?.cycleDecisions || [];
  const launchAlerts = strategicPlan.launch?.alerts || [];
  const bfr = strategicPlan.bfr || {};
  const sanitary = strategicPlan.sanitary || [];

  return (
    <div className="space-y-5">
      <TabIntro
        title="Cycles & QUAND LANCER une bande"
        detail="Calendrier religieux (Tabaski, Korité), stress thermique ITH, BFR et vide sanitaire — dates pivot calculées automatiquement."
        action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Cycles' })}>Élevage → Cycles</Btn> : null}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <VisionKpi label="Décisions lancement" value={fmtNumber(launchDecisions.length)} tone={launchAlerts.length ? 'warn' : 'good'} />
        <VisionKpi label="ITH actuel" value={strategicPlan.ith ?? '—'} tone={(strategicPlan.ith ?? 0) >= 29 ? 'bad' : 'good'} />
        <VisionKpi label="Couverture BFR" value={bfr.coveragePct != null ? `${bfr.coveragePct}%` : '—'} tone={bfr.blocked ? 'bad' : 'good'} />
        <VisionKpi label="Autonomie aliment" value={bfr.feedAutonomyDays != null ? `${bfr.feedAutonomyDays} j` : '—'} tone={(bfr.feedAutonomyDays ?? 99) < 5 ? 'bad' : 'neutral'} />
        <VisionKpi label="Alertes vide sanitaire" value={fmtNumber(sanitary.filter((s) => s.blocking).length)} tone={sanitary.some((s) => s.blocking) ? 'bad' : 'good'} />
      </div>

      {bfr.blocked ? (
        <div className="rounded-2xl border border-red-400 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-black flex items-center gap-2"><AlertTriangle size={16} /> Lancement suspendu — BFR</p>
          <p className="mt-1">{bfr.message}</p>
        </div>
      ) : null}

      {launchDecisions.length ? (
        <Section icon={CalendarRange} title="Timing marché & calendrier religieux">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {launchDecisions.map((d) => (
              <StrategicDecisionCard key={d.id} item={d} onNavigate={onNavigate} />
            ))}
          </div>
        </Section>
      ) : null}

      {sanitary.filter((s) => s.blocking).length ? (
        <Section icon={AlertTriangle} title="Vide sanitaire & historique pathologique">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sanitary.filter((s) => s.blocking).map((s) => (
              <StrategicDecisionCard key={s.id} item={{ ...s, title: `Vide sanitaire — ${s.building}`, priority: 'critique' }} onNavigate={onNavigate} />
            ))}
          </div>
        </Section>
      ) : null}

      {strategicPlan.scissors ? (
        <Section icon={Thermometer} title="Effet ciseau — intrants aliment">
          <StrategicDecisionCard item={{ ...strategicPlan.scissors, title: 'Achat groupé recommandé' }} onNavigate={onNavigate} />
        </Section>
      ) : null}

      {strategicPlan.transformation ? (
        <Section icon={CalendarRange} title="Arbitrage œuf vs poussin">
          <StrategicDecisionCard item={{ ...strategicPlan.transformation, title: 'Transformation incubateur' }} onNavigate={onNavigate} />
        </Section>
      ) : null}

      <Section icon={CalendarRange} title="Questions production">
        <ProductionQuestionsPanel dataMap={dataMap} onNavigate={onNavigate} />
      </Section>

      <Section icon={CalendarRange} title="Calendrier & décisions de cycle">
        <ProductionCycleDecisionPanel
          dataMap={dataMap}
          lots={lots}
          animaux={animaux}
          productionLogs={productionLogs}
          onNavigate={onNavigate}
        />
      </Section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Lots avicoles" value={fmtNumber(lotCount)} onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })} />
        <VisionKpi label="Animaux suivis" value={fmtNumber(animalCount)} onClick={() => onNavigate?.('elevage', { tab: 'Animaux' })} />
        <VisionKpi label="Logs production" value={fmtNumber(logCount)} onClick={() => onNavigate?.('elevage', { tab: 'Production' })} />
        <VisionKpi label="Stocks aliment" value={fmtNumber((dataMap.stock || dataMap.stocks || []).length)} tone="neutral" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} />
      </div>
    </div>
  );
}
