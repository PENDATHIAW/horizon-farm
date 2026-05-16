import { buildDecisionCenterPlan } from './growthDecisionEngine';
import { buildTechnicalFarmingAlerts } from './technicalFarmingRules';

const arr = (value) => Array.isArray(value) ? value : [];
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const priorityFromSeverity = (severity = '') => {
  const value = norm(severity);
  if (value.includes('critique') || value.includes('urgence')) return 'haute';
  if (value.includes('warning')) return 'moyenne';
  return 'basse';
};
const activityFromAlert = (alert = {}) => {
  const text = norm(`${alert.module_source || ''} ${alert.entity_type || ''} ${alert.title || ''} ${alert.message || ''}`);
  if (text.includes('pondeuse') || text.includes('oeuf')) return 'oeufs';
  if (text.includes('chair') || text.includes('poulet')) return 'poulets_chair';
  if (text.includes('animal') || text.includes('bovin') || text.includes('ovin') || text.includes('caprin')) return 'animaux';
  if (text.includes('stock')) return 'stock';
  if (text.includes('culture')) return 'cultures';
  return alert.module_source || 'pilotage';
};

function technicalRecommendationFromAlert(alert = {}) {
  const activity = activityFromAlert(alert);
  return {
    id: `tech-${alert.id}`,
    title: alert.title || 'Règle technique terrain à traiter',
    activity,
    priority: priorityFromSeverity(alert.severity),
    timing: 'Action terrain immédiate ou à planifier selon criticité',
    recommendation: alert.action_recommandee || alert.message || 'Vérifier la conduite terrain et corriger l’écart.',
    event_label: 'Conduite technique',
    event_note: alert.message || '',
    target_date: new Date().toISOString().slice(0, 10),
    earliest_start: new Date().toISOString().slice(0, 10),
    latest_start: new Date().toISOString().slice(0, 10),
    lead_time_days: 0,
    timing_status: priorityFromSeverity(alert.severity) === 'haute' ? 'urgent_deadline' : 'prepare_now',
    timing_status_label: priorityFromSeverity(alert.severity) === 'haute' ? 'À traiter rapidement' : 'À planifier',
    should_recommend_investment: false,
    demand_level: 'technique',
    demand_index: 0,
    demand_units: 0,
    demand_revenue: 0,
    available_units: 0,
    available_revenue: 0,
    coverage_rate: 0,
    coverage_status: 'conduite_terrain',
    gap_units: 0,
    gap_revenue: 0,
    capacity: null,
    source_alert_id: alert.id,
    source_module: alert.module_source,
    entity_type: alert.entity_type,
    entity_id: alert.entity_id,
    technical_rule: true,
  };
}

export function buildDecisionCenterPlanWithTechnicalRules(dataMap = {}, options = {}) {
  const plan = buildDecisionCenterPlan(dataMap, options);
  const technicalAlerts = buildTechnicalFarmingAlerts({
    lots: arr(dataMap.avicole || dataMap.lots),
    animaux: arr(dataMap.animaux),
    stocks: arr(dataMap.stock || dataMap.stocks),
    sante: arr(dataMap.sante || dataMap.vaccins),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
    sensorDevices: arr(dataMap.sensor_devices || dataMap.sensorDevices || dataMap.sensors),
  });
  const technicalRecommendations = technicalAlerts.map(technicalRecommendationFromAlert);
  const recommendations = [...technicalRecommendations, ...arr(plan.recommendations)];
  const critical = technicalAlerts.filter((alert) => priorityFromSeverity(alert.severity) === 'haute').length;
  return {
    ...plan,
    recommendations,
    technical_alerts: technicalAlerts,
    technical_recommendations: technicalRecommendations,
    executive_summary: critical
      ? `${plan.executive_summary} ${critical} écart(s) technique(s) critique(s) à corriger.`
      : technicalAlerts.length
        ? `${plan.executive_summary} ${technicalAlerts.length} point(s) de conduite technique à suivre.`
        : plan.executive_summary,
  };
}

export default buildDecisionCenterPlanWithTechnicalRules;
