export {
  computeEggProductionSummary,
  computeFarmHeadcount,
} from '../../modules/dashboard/dashboardMetrics.js';

import {
  computeEggProductionSummary,
  computeFarmHeadcount,
} from '../../modules/dashboard/dashboardMetrics.js';

/** KPI élevage — ponte officielle depuis production_oeufs_logs. */
export function computeLivestockKpis({
  animaux = [],
  lots = [],
  cultures = [],
  productionLogs = [],
  salesOrders = [],
  periodScope = {},
} = {}) {
  const headcount = computeFarmHeadcount({ animaux, lots, cultures });
  const eggProduction = computeEggProductionSummary(productionLogs, salesOrders, periodScope);
  return {
    headcount,
    eggProduction,
    eggsPeriod: eggProduction.eggsPeriod,
    sources: { ponte: 'production_oeufs_logs', effectifs: 'animaux+avicole' },
  };
}
