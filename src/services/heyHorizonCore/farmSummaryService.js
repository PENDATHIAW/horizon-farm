import { computeFarmHeadcount } from '../../modules/dashboard/dashboardMetrics.js';
import { metaBase, pickRows, textOrMissing } from './coreUtils.js';
import { formatFarmScopeLabel, normalizeFarmScope } from '../../utils/farmScope.js';
import { buildHeyHorizonFarmContext } from '../../utils/farmConsolidation.js';

/**
 * Synthèse exploitation — effectifs, surfaces, entités présentes dans le dataMap.
 * @param {object} dataMap
 */
export function getFarmSummary(dataMap = {}) {
  const animaux = pickRows(dataMap, 'animaux');
  const lots = pickRows(dataMap, 'lots', 'avicole');
  const cultures = pickRows(dataMap, 'cultures');
  const headcount = computeFarmHeadcount({ animaux, lots, cultures });

  const businessPlans = pickRows(dataMap, 'business_plans');
  const investissements = pickRows(dataMap, 'investissements');
  const meteo = dataMap.meteo ?? null;
  const farmScope = normalizeFarmScope(dataMap.farmScope || {}, dataMap.accessibleFarms || []);
  const activeFarm = dataMap.activeFarm || null;
  const phase5 = buildHeyHorizonFarmContext({
    ...dataMap,
    farmScope,
    activeFarm,
    accessibleFarms: dataMap.accessibleFarms || [],
  });

  return {
    ...metaBase({ module: 'farm' }),
    farm_name: textOrMissing(activeFarm?.name || dataMap.farm_name || dataMap.project_name, 'Non renseigné'),
    farm_scope: {
      mode: farmScope.mode,
      farm_id: farmScope.farmId || null,
      farm_ids: farmScope.farmIds || [],
      label: formatFarmScopeLabel(farmScope, dataMap.accessibleFarms || []),
    },
    activity_type: activeFarm?.activity_type || ['mixte'],
    activity_topics: phase5.suggested_questions?.length
      ? phase5.suggested_questions
      : [],
    activity_kpis: phase5.activity_kpis || [],
    activity_alerts: phase5.activity_alerts || [],
    activity_quick_actions: phase5.activity_quick_actions || [],
    farms_summary: phase5.farms_summary || null,
    comparison_summary: phase5.comparison_summary || null,
    suggested_questions: phase5.suggested_questions || [],
    headcount: {
      total: headcount.total,
      active_animals: headcount.activeAnimals,
      active_avicole: headcount.activeAvicole,
      effectif_chair: headcount.effectifChair,
      effectif_pondeuses: headcount.effectifPondeuses,
      effectif_avicole_other: headcount.effectifAvicoleOther,
      active_lots: headcount.activeLots,
      active_lots_chair: headcount.activeLotsChair,
      active_lots_pondeuses: headcount.activeLotsPondeuses,
      parcel_surface_m2: headcount.parcelSurfaceM2,
    },
    counts: {
      animaux: animaux.length,
      lots_avicole: lots.length,
      cultures: cultures.length,
      clients: pickRows(dataMap, 'clients').length,
      fournisseurs: pickRows(dataMap, 'fournisseurs').length,
      business_plans: businessPlans.length,
      investissements: investissements.length,
      documents: pickRows(dataMap, 'documents').length,
      alertes_ouvertes: pickRows(dataMap, 'alertes_center', 'alertes').length,
      taches_ouvertes: pickRows(dataMap, 'taches', 'tasks').length,
    },
    meteo: meteo
      ? {
          source: textOrMissing(meteo.source, 'Non renseigné'),
          temperature: meteo.temperature ?? meteo.temp ?? null,
          condition: textOrMissing(meteo.condition || meteo.description, 'Non renseigné'),
        }
      : null,
    period: {
      label: textOrMissing(dataMap.periodLabel, 'Non renseigné'),
      filtered: Boolean(dataMap.periodFiltered),
      scope: dataMap.periodScope ?? null,
    },
    farm_filtered: Boolean(dataMap.farmFiltered),
  };
}

export default getFarmSummary;
