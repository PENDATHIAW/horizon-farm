import { buildOperationalForecast } from './aiForecastService';
import { detectFarmAnomalies } from './aiAnomalyService';
import { buildPondeusesIntelligence } from './aiPondeusesService';
import { buildSalePricingIntelligence } from './aiSalePricingService.js';

const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const makeAlertId = (prefix, key) =>
  `${prefix}-${normalizeText(key).replace(/\s+/g, '-')}-${Date.now()}`;

const sameAlertKey = (alert = {}) =>
  normalizeText(`${alert.module_source || ''}:${alert.entity_type || ''}:${alert.entity_id || ''}:${alert.title || ''}`);

const isOpenAlert = (alert = {}) => !['traitee', 'ignoree', 'closed', 'resolved'].includes(normalizeText(alert.status));

const alreadyExists = (candidate, existingAlerts = []) => {
  const key = sameAlertKey(candidate);
  return asRows(existingAlerts).some((alert) => isOpenAlert(alert) && sameAlertKey(alert) === key);
};

const pushAlert = (alerts, candidate, existingAlerts) => {
  const alert = {
    id: candidate.id || makeAlertId('ai-alert', candidate.title || candidate.event_type || 'alerte'),
    title: candidate.title,
    message: candidate.message || candidate.summary || '',
    module_source: candidate.module_source || 'centre_ia',
    entity_type: candidate.entity_type || null,
    entity_id: candidate.entity_id || null,
    severity: candidate.severity || 'warning',
    status: 'nouvelle',
    action_recommandee: candidate.action_recommandee || 'Verifier dans Horizon Farm.',
    source: 'centre_ia',
    confidence_score: candidate.confidence_score ?? 70,
    source_data: candidate.source_data || {},
    created_at: new Date().toISOString(),
  };

  if (!alreadyExists(alert, existingAlerts) && !alreadyExists(alert, alerts)) alerts.push(alert);
};

const inferSecuritySeverity = (event = {}) => {
  const type = normalizeText(event.event_type);
  const zone = normalizeText(event.zone);
  if ((type.includes('intrusion') || type.includes('humain')) && (zone.includes('stock') || zone.includes('poulailler'))) return 'urgence';
  if (type.includes('intrusion') || type.includes('humain')) return 'critique';
  return event.severity || 'warning';
};

export const buildSmartFarmAlerts = ({ smartfarmEvents = [], existingAlerts = [] } = {}) => {
  const alerts = [];

  asRows(smartfarmEvents).forEach((event) => {
    const type = normalizeText(event.event_type);
    const zone = event.zone || 'zone non precisee';

    if (type.includes('intrusion') || type.includes('humain_detecte')) {
      pushAlert(alerts, {
        title: `Presence humaine detectee — ${zone}`,
        message: event.message || `Presence humaine ou intrusion detectee dans ${zone}.`,
        module_source: 'smartfarm',
        entity_type: 'security_event',
        entity_id: event.id,
        severity: inferSecuritySeverity(event),
        action_recommandee: 'Verifier le flux camera, contacter le responsable terrain et journaliser l incident.',
        confidence_score: 82,
        source_data: event,
      }, existingAlerts);
    }

    if (type.includes('chaleur_critique') || (type.includes('temperature') && Number(event.event_value || 0) >= 36)) {
      pushAlert(alerts, {
        title: `Temperature critique — ${zone}`,
        message: `Temperature detectee: ${event.event_value ?? '?'} ${event.event_unit || 'C'}.`,
        module_source: 'smartfarm',
        entity_type: 'sensor_event',
        entity_id: event.id,
        severity: 'critique',
        action_recommandee: 'Verifier ventilation, abreuvement, ombrage et impact sur la ponte.',
        confidence_score: 80,
        source_data: event,
      }, existingAlerts);
    }

    if (type.includes('camera_offline') || type.includes('capteur_offline')) {
      pushAlert(alerts, {
        title: `Equipement Smart Farm hors ligne — ${zone}`,
        message: event.message || 'Un appareil Smart Farm ne repond plus.',
        module_source: 'smartfarm',
        entity_type: 'device_event',
        entity_id: event.device_id || event.id,
        severity: 'warning',
        action_recommandee: 'Verifier alimentation, PoE, batterie, reseau ou routeur 4G.',
        confidence_score: 78,
        source_data: event,
      }, existingAlerts);
    }
  });

  return alerts;
};

export const buildForecastAlerts = ({
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  salesOrders = [],
  payments = [],
  transactions = [],
  existingAlerts = [],
} = {}) => {
  const alerts = [];
  const forecast = buildOperationalForecast({ stocks, alimentationLogs, productionLogs, salesOrders, payments, transactions, horizonDays: 30 });

  if (forecast.feed.autonomy_days !== null && forecast.feed.autonomy_days <= 7) {
    pushAlert(alerts, {
      title: 'Autonomie aliment critique',
      message: `Le stock aliment couvre environ ${Math.round(forecast.feed.autonomy_days)} jour(s).`,
      module_source: 'stock',
      entity_type: 'stock_feed',
      entity_id: 'feed-autonomy',
      severity: 'critique',
      action_recommandee: 'Comparer les prix, verifier le stock physique et commander avant rupture.',
      confidence_score: 82,
      source_data: forecast.feed,
    }, existingAlerts);
  }

  if (forecast.cash.projected_cash_balance < 0) {
    pushAlert(alerts, {
      title: 'Tresorerie previsionnelle negative',
      message: `Projection cash 30 jours: ${Math.round(forecast.cash.projected_cash_balance)} FCFA.`,
      module_source: 'finances',
      entity_type: 'cash_forecast',
      entity_id: 'cash-30-days',
      severity: 'critique',
      action_recommandee: 'Relancer encaissements, reduire depenses non critiques et accelerer ventes rentables.',
      confidence_score: 80,
      source_data: forecast.cash,
    }, existingAlerts);
  }

  return alerts;
};

export const buildPondeusesAlerts = ({
  lots = [],
  productionLogs = [],
  alimentationLogs = [],
  stocks = [],
  marketPrices = [],
  meteo = null,
  existingAlerts = [],
} = {}) => {
  const alerts = [];
  const intelligence = buildPondeusesIntelligence({ lots, productionLogs, alimentationLogs, stocks, marketPrices, meteo });

  intelligence.lots.forEach((lot) => {
    if (lot.laying_rate > 0 && lot.laying_rate < 65) {
      pushAlert(alerts, {
        title: `Baisse ponte a surveiller — ${lot.lot_name}`,
        message: `Taux de ponte estime ${lot.laying_rate.toFixed(1)}%.`,
        module_source: 'avicole',
        entity_type: 'lot_avicole',
        entity_id: lot.lot_id,
        severity: lot.laying_rate < 50 ? 'critique' : 'warning',
        action_recommandee: 'Verifier chaleur, eau, alimentation, sante, stress et luminosite.',
        confidence_score: 76,
        source_data: lot,
      }, existingAlerts);
    }

    if (lot.cost_per_tablet > 0 && lot.market_tablet_price && Number(lot.market_tablet_price) < lot.cost_per_tablet) {
      pushAlert(alerts, {
        title: `Risque vente a perte — ${lot.lot_name}`,
        message: `Prix marche observe ${lot.market_tablet_price} FCFA, cout estime ${Math.round(lot.cost_per_tablet)} FCFA/tablette.`,
        module_source: 'ventes',
        entity_type: 'lot_avicole',
        entity_id: lot.lot_id,
        severity: 'critique',
        action_recommandee: 'Ne pas vendre sous le cout estime. Ajuster prix ou reduire cout alimentation.',
        confidence_score: 78,
        source_data: lot,
      }, existingAlerts);
    }
  });

  return alerts;
};


export const buildSalePricingAlerts = ({
  lots = [],
  animaux = [],
  opportunities = [],
  cultures = [],
  stocks = [],
  alimentationLogs = [],
  productionLogs = [],
  vaccins = [],
  marketPrices = [],
  meteo = null,
  existingAlerts = [],
} = {}) => {
  const alerts = [];
  const intelligence = buildSalePricingIntelligence({
    lots,
    animaux,
    opportunities,
    cultures,
    stocks,
    alimentationLogs,
    productionLogs,
    vaccins,
    marketPrices,
    meteo,
  });

  intelligence.recommendations.forEach((rec) => {
    pushAlert(alerts, {
      title: rec.title,
      message: rec.summary,
      module_source: rec.module_target || 'ventes',
      entity_type: rec.entity_type || 'sale_pricing',
      entity_id: rec.entity_id || null,
      severity: rec.priority === 'critique' ? 'critique' : rec.priority === 'haute' ? 'warning' : 'info',
      action_recommandee: rec.action_recommandee,
      confidence_score: rec.confidence_score ?? 70,
      source_data: rec,
    }, existingAlerts);
  });

  return alerts;
};

export const buildAnomalyAlerts = ({
  stocks = [],
  lots = [],
  productionLogs = [],
  alimentationLogs = [],
  transactions = [],
  payments = [],
  invoices = [],
  sensors = [],
  cameras = [],
  smartfarmEvents = [],
  existingAlerts = [],
} = {}) => {
  const alerts = [];
  const anomalies = detectFarmAnomalies({ stocks, lots, productionLogs, alimentationLogs, transactions, payments, invoices, sensors, cameras, smartfarmEvents });

  anomalies.anomalies
    .filter((anomaly) => ['urgence', 'critique'].includes(anomaly.severity))
    .slice(0, 10)
    .forEach((anomaly) => {
      pushAlert(alerts, {
        title: anomaly.title,
        message: anomaly.summary,
        module_source: anomaly.module_source,
        entity_type: anomaly.entity_type,
        entity_id: anomaly.entity_id,
        severity: anomaly.severity,
        action_recommandee: anomaly.action_recommandee,
        confidence_score: anomaly.confidence_score,
        source_data: anomaly.source_data,
      }, existingAlerts);
    });

  return alerts;
};

export const buildIntelligentAlerts = ({
  existingAlerts = [],
  lots = [],
  animaux = [],
  opportunities = [],
  cultures = [],
  productionLogs = [],
  alimentationLogs = [],
  vaccins = [],
  stocks = [],
  marketPrices = [],
  salesOrders = [],
  payments = [],
  invoices = [],
  transactions = [],
  smartfarmEvents = [],
  sensors = [],
  cameras = [],
  meteo = null,
} = {}) => {
  const all = [
    ...buildSmartFarmAlerts({ smartfarmEvents, existingAlerts }),
    ...buildForecastAlerts({ stocks, alimentationLogs, productionLogs, salesOrders, payments, transactions, existingAlerts }),
    ...buildPondeusesAlerts({ lots, productionLogs, alimentationLogs, stocks, marketPrices, meteo, existingAlerts }),
    ...buildSalePricingAlerts({ lots, animaux, opportunities, cultures, stocks, alimentationLogs, productionLogs, vaccins, marketPrices, meteo, existingAlerts }),
    ...buildAnomalyAlerts({ stocks, lots, productionLogs, alimentationLogs, transactions, payments, invoices, sensors, cameras, smartfarmEvents, existingAlerts }),
  ];

  const severityOrder = { urgence: 0, critique: 1, warning: 2, info: 3 };
  const unique = [];
  all.forEach((alert) => {
    if (!alreadyExists(alert, unique)) unique.push(alert);
  });

  unique.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return {
    generated_at: new Date().toISOString(),
    count: unique.length,
    alerts: unique,
  };
};

export default buildIntelligentAlerts;
