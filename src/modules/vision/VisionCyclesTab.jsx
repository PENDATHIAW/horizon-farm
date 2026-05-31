import { CalendarRange } from 'lucide-react';
import ProductionQuestionsPanel from '../../components/ProductionQuestionsPanel.jsx';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';
import { fmtNumber } from '../../utils/format';
import { Btn, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionCyclesTab({
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  onNavigate,
}) {
  const lotCount = (lots || []).length;
  const animalCount = (animaux || []).length;
  const logCount = (productionLogs || []).length;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Cycles & décisions production"
        detail="Questions stratégiques (lancer une bande, timing marché) et calendrier J+40 / J+90."
        action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Cycles' })}>Élevage → Cycles</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Lots avicoles" value={fmtNumber(lotCount)} onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })} />
        <VisionKpi label="Animaux suivis" value={fmtNumber(animalCount)} onClick={() => onNavigate?.('elevage', { tab: 'Animaux' })} />
        <VisionKpi label="Logs production" value={fmtNumber(logCount)} onClick={() => onNavigate?.('elevage', { tab: 'Production' })} />
        <VisionKpi label="Stocks aliment" value={fmtNumber((dataMap.stock || dataMap.stocks || []).length)} tone="neutral" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} />
      </div>
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
    </div>
  );
}
