/**
 * Objectifs canoniques — une seule vérité pour Assistant, Accueil et Centre décisionnel.
 * S'aligne sur computeDashboardPeriodGoal (dashboard).
 */

import { computeDashboardPeriodGoal } from '../modules/dashboard/dashboardMetrics.js';
import { annualRevenueTarget } from './growthDecisionEngine.js';
import { propsFromDataMap } from './assistantDirectorSnapshot.js';

const n = (v) => Number(v || 0);

export function resolveCanonicalGoalProgress(dataMap = {}) {
  const props = propsFromDataMap(dataMap);
  const salesOrders = props.salesOrdersAll;
  const periodScope = props.periodScope || dataMap.periodScope || {};
  const annualTarget = n(dataMap.growth_settings?.annual_ca_target) || annualRevenueTarget;

  const goal = computeDashboardPeriodGoal(salesOrders, periodScope, { annualTarget });
  const monthTarget = n(goal.periodTarget);
  const monthRealized = n(goal.periodRealized);
  const monthPct = monthTarget > 0
    ? n(goal.periodAttainment) || Math.round((monthRealized / monthTarget) * 100)
    : null;

  return {
    monthTarget,
    monthRealized,
    monthPct,
    annualTarget: n(goal.annualTarget),
    annualRealized: n(goal.annualRealized),
    annualPct: n(goal.annualAttainment) || (n(goal.annualTarget) > 0
      ? Math.round((n(goal.annualRealized) / n(goal.annualTarget)) * 100)
      : null),
    hasMonthlyGoal: monthTarget > 0,
    goal,
  };
}

export default {
  resolveCanonicalGoalProgress,
};
