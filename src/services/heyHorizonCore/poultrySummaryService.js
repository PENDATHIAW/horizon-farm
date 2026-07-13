import { resolveAvicoleLotKind } from '../../utils/avicoleActivity.js';
import {
  avicoleActiveCount,
  avicoleDeadCount,
  avicoleHasActiveBirds,
  avicoleSickCount,
} from '../../utils/avicoleMetrics.js';
import { computeEggProductionSummary } from '../../modules/dashboard/dashboardMetrics.js';
import {  metaBase, n, pickRows } from './coreUtils.js';

/**
 * Synthèse aviculture — lots, effectifs, production œufs.
 */
export function getPoultrySummary(dataMap = {}) {
  const lots = pickRows(dataMap, 'lots', 'avicole');
  const productionLogs = pickRows(dataMap, 'production_oeufs_logs', 'productionLogs');
  const salesOrders = pickRows(dataMap, 'sales_orders', 'salesOrders');
  const alimentationLogs = pickRows(dataMap, 'alimentation_logs', 'alimentationLogs');

  const activeLots = lots.filter(avicoleHasActiveBirds);
  const byKind = { chair: 0, pondeuse: 0, other: 0 };
  let totalActiveBirds = 0;
  let totalMortality = 0;
  let totalSick = 0;

  activeLots.forEach((lot) => {
    const kind = resolveAvicoleLotKind(lot);
    const active = avicoleActiveCount(lot);
    totalActiveBirds += active;
    totalMortality += avicoleDeadCount(lot);
    totalSick += avicoleSickCount(lot);
    if (kind === 'chair') byKind.chair += active;
    else if (kind === 'pondeuse') byKind.pondeuse += active;
    else byKind.other += active;
  });

  const eggSummary = productionLogs.length || salesOrders.length
    ? computeEggProductionSummary(productionLogs, salesOrders, dataMap.periodScope || {})
    : null;

  return {
    ...metaBase({ module: 'elevage_avicole' }),
    lots: {
      total: lots.length,
      actifs: activeLots.length,
      effectif_actif_total: totalActiveBirds,
      effectif_chair: byKind.chair,
      effectif_pondeuses: byKind.pondeuse,
      effectif_autre: byKind.other,
    },
    sante: {
      mortalite_cumulee: totalMortality,
      malades_signales: totalSick,
    },
    production_oeufs: eggSummary
      ? {
          mode: eggSummary.mode,
          oeufs_periode: n(eggSummary.eggsPeriod),
          oeufs_cumul: n(eggSummary.eggsAllTime),
          tablettes_vendues_periode: n(eggSummary.tablettesSoldPeriod),
          tablettes_vendues_cumul: n(eggSummary.tablettesSoldAllTime),
          delta_oeufs_vs_mois_precedent: eggSummary.deltaEggsVsPrevious,
        }
      : null,
    alimentation_logs_count: alimentationLogs.length,
    production_logs_count: productionLogs.length,
  };
}

export default getPoultrySummary;
