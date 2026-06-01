import { Zap } from 'lucide-react';
import AnnualCommercialCalendarPanel from '../AnnualCommercialCalendarPanel.jsx';
import DecisionHistoryPanel from '../DecisionHistoryPanel.jsx';
import DecisionRecommendationCard from '../DecisionRecommendationCard.jsx';
import { buildDecisionCenterPlanWithTechnicalRules } from '../../services/technicalDecisionCenterEngine.js';
import { Empty, Section } from './visionUtils.jsx';

export default function VisionDecisionEnginePanels({
  dataMap = {},
  onNavigate,
  onCreateTask,
  onRefreshTasks,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const plan = buildDecisionCenterPlanWithTechnicalRules(dataMap);
  const recommendations = plan?.recommendations || [];

  return (
    <div className="space-y-6">
      <Section icon={Zap} title="Recommandations investissement & vente">
        {recommendations.length ? (
          <div className="rounded-3xl border border-[#2f2415] bg-[#2f2415] p-4 md:p-5">
            <p className="mb-4 text-sm text-[#f8e8b6]">
              Moteur croissance + règles terrain : chaque carte explique pourquoi Horizon recommande l&apos;action et où agir.
            </p>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {recommendations.slice(0, 6).map((item) => (
                <DecisionRecommendationCard
                  key={item.id}
                  item={item}
                  dataMap={dataMap}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ) : (
          <Empty>Aucune recommandation active. Enrichissez ventes, production et objectifs pour alimenter le moteur.</Empty>
        )}
      </Section>
      <AnnualCommercialCalendarPanel />
      <DecisionHistoryPanel dataMap={dataMap} onNavigate={onNavigate} />
    </div>
  );
}
