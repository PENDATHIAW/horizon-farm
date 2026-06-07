import { buildDecisionCenterPlan, annualRevenueTarget } from '../growthDecisionEngine.js';
import { computeDashboardPeriodGoal } from '../../modules/dashboard/dashboardMetrics.js';

/** KPI stratégiques Objectifs & Croissance — distincts du Centre opérationnel. */
export function computeGrowthKpis(dataMap = {}, periodScope = {}) {
  const plan = buildDecisionCenterPlan(dataMap, { periodScope });
  const salesOrders = dataMap.sales_orders || dataMap.salesOrders || [];
  const goal = computeDashboardPeriodGoal(salesOrders, periodScope, plan.goals?.global || {}, plan.activityYear);

  return {
    annualTarget: annualRevenueTarget,
    periodTarget: goal.periodTarget,
    periodRealized: goal.periodRealized,
    periodAttainment: goal.periodAttainment,
    periodRemaining: goal.periodRemaining,
    annualRealized: goal.annualRealized,
    annualAttainment: goal.annualAttainment,
    recommendations: plan.recommendations?.slice(0, 12) || [],
    activityYear: plan.activityYear,
    sources: { ca: 'sales_orders', objectifs: 'business_plans+official_bp' },
  };
}
