import { DERFJ_GREENPRENEURS_PROFILE, ORGALOOP_EFFLUENT_CHANNEL } from '../../config/derfjGreenpreneurs.config.js';
import { computeEffluentSurplusKg } from './orgaloopEffluentChannel.js';
import { buildGreenpreneursReadinessScore } from './greenpreneursReadinessScore.js';
import { computeCircularEconomyMetrics } from './circularEconomyMetrics.js';
import { computeValorisationReadiness } from './valorisationReadinessEngine.js';

const arr = (value) => (Array.isArray(value) ? value : []);

/** Normalise les données ERP vers un dataMap unifié pour Greenpreneurs. */
export function normalizeGreenpreneursDataMap(raw = {}) {
  return {
    animaux: arr(raw.animaux),
    avicole: arr(raw.avicole || raw.lots),
    lots: arr(raw.lots || raw.avicole),
    cultures: arr(raw.cultures),
    stocks: arr(raw.stocks || raw.stock),
    stock: arr(raw.stock || raw.stocks),
    stock_movements: arr(raw.stock_movements || raw.stockMovements),
    sales_orders: arr(raw.sales_orders || raw.salesOrders),
    salesOrders: arr(raw.salesOrders || raw.sales_orders),
    payments: arr(raw.payments),
    finances: arr(raw.finances || raw.transactions),
    transactions: arr(raw.transactions || raw.finances),
    clients: arr(raw.clients),
    fournisseurs: arr(raw.fournisseurs),
    documents: arr(raw.documents),
    taches: arr(raw.taches),
    alertes_center: arr(raw.alertes_center || raw.alertes),
    alertes: arr(raw.alertes || raw.alertes_center),
    business_events: arr(raw.business_events || raw.businessEvents),
    businessEvents: arr(raw.businessEvents || raw.business_events),
    sensor_devices: arr(raw.sensor_devices),
    camera_devices: arr(raw.camera_devices),
    smartfarm_events: arr(raw.smartfarm_events || raw.smartFarmEvents),
    investissements: arr(raw.investissements),
    business_plans: arr(raw.business_plans || raw.businessPlans),
    businessPlans: arr(raw.businessPlans || raw.business_plans),
    bp_investment_lines: arr(raw.bp_investment_lines),
    bp_recurring_costs: arr(raw.bp_recurring_costs),
    bp_revenue_projections: arr(raw.bp_revenue_projections),
    bp_funding_sources: arr(raw.bp_funding_sources),
    bp_risks: arr(raw.bp_risks),
    sales_opportunities: arr(raw.sales_opportunities || raw.opportunities),
    opportunities: arr(raw.opportunities || raw.sales_opportunities),
    production_oeufs_logs: arr(raw.production_oeufs_logs || raw.productionLogs),
    alimentation_logs: arr(raw.alimentation_logs || raw.alimentationLogs),
  };
}

/** Alertes utiles pour le Centre décisionnel (économie circulaire + valorisation). */
export function buildGreenpreneursCentreAlerts(metrics = {}) {
  const alerts = [];
  const circular = metrics.circular || {};
  const orgaloop = circular.orgaloop || {};
  const orgaloopHybrid = circular.orgaloopHybrid ?? ORGALOOP_EFFLUENT_CHANNEL.strategy === 'hybride_surplus_orgaloop';
  const orgaloopPrimary = circular.orgaloopPrimary
    ?? ORGALOOP_EFFLUENT_CHANNEL.strategy === 'vente_directe_orgaloop';
  const platformName = orgaloop.platformName || ORGALOOP_EFFLUENT_CHANNEL.platformName;

  const effluentSurplusKg = circular.effluentSurplusKg ?? computeEffluentSurplusKg(circular);

  if (orgaloopHybrid && circular.fumierBovin?.availableKg > 100 && circular.usedOnCulturesKg < circular.fumierBovin.availableKg * 0.2) {
    alerts.push({
      id: 'gp-fumier-priorite-cultures',
      title: 'Fumier disponible — priorité fertilisation cultures',
      detail: `${Math.round(circular.fumierBovin.availableKg)} kg — valoriser d'abord sur les parcelles Horizon Farm (argument DER/FJ agroécologie).`,
      severity: 'warn',
      navigate: { module: 'cultures', tab: 'Économie circulaire' },
    });
  } else if (!orgaloopHybrid && !orgaloopPrimary && circular.fumierBovin?.availableKg > 100 && circular.usedOnCulturesKg < circular.fumierBovin.availableKg * 0.2) {
    alerts.push({
      id: 'gp-fumier-non-valorise',
      title: 'Fumier bovin disponible mais peu valorisé',
      detail: `${Math.round(circular.fumierBovin.availableKg)} kg disponibles — enregistrer fertilisation cultures.`,
      severity: 'warn',
      navigate: { module: 'cultures', tab: 'Économie circulaire' },
    });
  }

  if (orgaloopHybrid && effluentSurplusKg > 100) {
    alerts.push({
      id: 'gp-surplus-orgaloop',
      title: `Surplus effluent — publier sur ${platformName}`,
      detail: `~${effluentSurplusKg} kg au-delà des besoins cultures — vente surplus plateforme.`,
      severity: 'info',
      navigate: { module: 'commercial', tab: 'Opportunités' },
    });
  } else if (orgaloopPrimary && effluentSurplusKg > 100) {
    alerts.push({
      id: 'gp-effluent-a-publier-orgaloop',
      title: `Effluents à publier sur ${platformName}`,
      detail: `~${effluentSurplusKg} kg collectés — vente directe plateforme.`,
      severity: 'warn',
      navigate: { module: 'commercial', tab: 'Opportunités' },
    });
  }

  if (!orgaloopPrimary && circular.fertilisantStockKg > circular.usedOnCulturesKg * 2 && circular.fertilisantStockKg > 500) {
    alerts.push({
      id: 'gp-stock-fertilisant-eleve',
      title: 'Stock de fertilisant naturel élevé',
      detail: 'Planifier utilisation sur parcelles ou vente opportunité.',
      severity: 'info',
      navigate: { module: 'cultures', tab: 'Économie circulaire' },
    });
  }
  if (!orgaloopPrimary && circular.parcellesFertilisees === 0 && circular.fertilisantStockKg > 200) {
    alerts.push({
      id: 'gp-parcelle-non-fertilisee',
      title: 'Fertilisant disponible — parcelles non fertilisées',
      detail: 'Boucle élevage-cultures à activer dans Cultures.',
      severity: 'warn',
      navigate: { module: 'cultures', tab: 'Économie circulaire' },
    });
  }
  if (!orgaloopPrimary && circular.engraisSavingsFcfa < 50000 && circular.hasRealData) {
    alerts.push({
      id: 'gp-economie-engrais-faible',
      title: 'Économie d\'engrais encore faible',
      detail: 'Tracer les flux fumier/fientes vers les cultures pour prouver l\'impact.',
      severity: 'info',
      navigate: { module: 'objectifs_croissance', tab: 'Suivi du Business Plan' },
    });
  }
  if (orgaloop.soldKg > 0) {
    alerts.push({
      id: 'gp-orgaloop-ventes-trackees',
      title: `${platformName} — ventes effluents tracées`,
      detail: `${Math.round(orgaloop.soldKg)} kg vendus · ${orgaloop.revenueFcfa > 0 ? `${Math.round(orgaloop.revenueFcfa).toLocaleString('fr-FR')} FCFA` : 'revenu à renseigner'}.`,
      severity: 'info',
      navigate: { module: 'commercial', tab: 'Ventes' },
    });
  }

  return alerts.slice(0, 6);
}

/**
 * Point d'entrée principal — calcule score DER/FJ, circularité et valorisation.
 * @param {object} rawData — props ERP brutes ou dataMap
 * @param {{ simulatedMode?: boolean }} options
 */
export function computeGreenpreneursMetrics(rawData = {}, options = {}) {
  const dataMap = normalizeGreenpreneursDataMap(rawData);
  const readiness = buildGreenpreneursReadinessScore(dataMap, options);
  const circular = computeCircularEconomyMetrics(dataMap, options);
  const valorisation = computeValorisationReadiness(dataMap, options);
  const centreAlerts = buildGreenpreneursCentreAlerts({ circular, valorisation, readiness });

  return {
    profile: DERFJ_GREENPRENEURS_PROFILE,
    readiness,
    circular,
    valorisation,
    centreAlerts,
    dataMap,
  };
}
