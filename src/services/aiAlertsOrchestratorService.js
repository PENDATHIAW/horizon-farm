import { buildIntelligentAlerts } from './aiAlertsService';

const rows = (dataMap, key) => (Array.isArray(dataMap?.[key]) ? dataMap[key] : []);

export const buildAlertsInputFromDataMap = (dataMap = {}, extra = {}) => ({
  existingAlerts: rows(dataMap, 'alertes_center'),
  lots: rows(dataMap, 'avicole'),
  productionLogs: rows(dataMap, 'production_oeufs_logs'),
  alimentationLogs: rows(dataMap, 'alimentation_logs'),
  stocks: rows(dataMap, 'stock'),
  marketPrices: rows(dataMap, 'market_prices'),
  salesOrders: rows(dataMap, 'sales_orders'),
  payments: rows(dataMap, 'payments'),
  invoices: rows(dataMap, 'invoices'),
  transactions: rows(dataMap, 'finances'),
  smartfarmEvents: rows(dataMap, 'smartfarm_events'),
  sensors: rows(dataMap, 'sensor_devices'),
  cameras: rows(dataMap, 'camera_devices'),
  meteo: dataMap?.meteo || extra.meteo || null,
  ...extra,
});

export const prepareIntelligentAlerts = (dataMap = {}, extra = {}) => {
  const input = buildAlertsInputFromDataMap(dataMap, extra);
  return buildIntelligentAlerts(input);
};

export const mapAiAlertToAlertCenterPayload = (alert = {}) => ({
  title: alert.title,
  message: alert.message,
  module_source: alert.module_source,
  entity_type: alert.entity_type,
  entity_id: alert.entity_id,
  severity: alert.severity,
  status: alert.status || 'nouvelle',
  action_recommandee: alert.action_recommandee,
  source: alert.source || 'centre_ia',
  confidence_score: alert.confidence_score,
  source_data: alert.source_data || {},
  created_at: alert.created_at || new Date().toISOString(),
});

export const prepareAlertCenterPayloads = (dataMap = {}, extra = {}) => {
  const result = prepareIntelligentAlerts(dataMap, extra);
  return {
    ...result,
    payloads: result.alerts.map(mapAiAlertToAlertCenterPayload),
  };
};

export default prepareIntelligentAlerts;
