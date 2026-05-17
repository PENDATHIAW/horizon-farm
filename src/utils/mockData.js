import { buildWeatherAnalysis } from './weather';
import { horizonFarmSimulationSeed } from './horizonFarmSimulationSeed';

export const financeData = [
  { mois: 'M+1', recettes: 0, depenses: 6905000 },
  { mois: 'M+2', recettes: 0, depenses: 6100000 },
  { mois: 'M+3', recettes: 737200, depenses: 1160000 },
  { mois: 'M+4', recettes: 736750, depenses: 1050000 },
  { mois: 'M+5', recettes: 405000, depenses: 1045000 },
  { mois: 'M+6', recettes: 1919000, depenses: 1540000 },
  { mois: 'M+7', recettes: 864000, depenses: 1020000 },
];

export const animauxSeed = horizonFarmSimulationSeed.animaux || [];
export const lotsSeed = horizonFarmSimulationSeed.avicole || [];
export const vaccinsSeed = horizonFarmSimulationSeed.sante || [];
export const vetsSeed = horizonFarmSimulationSeed.veterinaires || [];
export const transactionsSeed = horizonFarmSimulationSeed.finances || [];
export const investissementsSeed = horizonFarmSimulationSeed.investissements || [];
export const stocksSeed = horizonFarmSimulationSeed.stock || [];
export const clientsSeed = horizonFarmSimulationSeed.clients || [];
export const fournisseursSeed = horizonFarmSimulationSeed.fournisseurs || [];
export const tracabiliteSeed = horizonFarmSimulationSeed.tracabilite || [];
export const culturesSeed = horizonFarmSimulationSeed.cultures || [];
export const ventesSeed = horizonFarmSimulationSeed.sales_orders || [];
export const documentsSeed = horizonFarmSimulationSeed.documents || [];
export const tachesSeed = horizonFarmSimulationSeed.taches || [];
export const rapportsSeed = horizonFarmSimulationSeed.rapports || [];
export const equipementsSeed = horizonFarmSimulationSeed.equipements || [];
export const auditLogsSeed = horizonFarmSimulationSeed.audit_logs || [];
export const alimentationLogsSeed = horizonFarmSimulationSeed.alimentation_logs || [];
export const productionOeufsLogsSeed = horizonFarmSimulationSeed.production_oeufs_logs || [];
export const sensorDevicesSeed = horizonFarmSimulationSeed.sensor_devices || [];
export const cameraDevicesSeed = horizonFarmSimulationSeed.camera_devices || [];

export const meteoData = buildWeatherAnalysis({
  temp: 31,
  apparentTemp: 35,
  humidite: 72,
  precipitation: 0,
  rain: 0,
  showers: 0,
  precipitationProbability: 12,
  weatherCode: 1,
  cloudCover: 28,
  windSpeed: 14,
  windDirection: 280,
  isDay: true,
  sunrise: '06:45',
  sunset: '19:28',
  latitude: 14.7167,
  longitude: -17.4677,
  locationLabel: 'Horizon Farm — Simulation financeur',
  updatedAt: new Date().toISOString(),
});

export const moduleSeedMap = {
  ...horizonFarmSimulationSeed,
  dashboard: horizonFarmSimulationSeed.dashboard || [],
  animaux: animauxSeed,
  avicole: lotsSeed,
  lots: lotsSeed,
  sante: vaccinsSeed,
  veterinaires: vetsSeed,
  finances: transactionsSeed,
  investissements: investissementsSeed,
  stock: stocksSeed,
  stocks: stocksSeed,
  clients: clientsSeed,
  fournisseurs: fournisseursSeed,
  tracabilite: tracabiliteSeed,
  cultures: culturesSeed,
  ventes: ventesSeed,
  documents: documentsSeed,
  taches: tachesSeed,
  rapports: rapportsSeed,
  equipements: equipementsSeed,
  audit_logs: auditLogsSeed,
  alimentation_logs: alimentationLogsSeed,
  production_oeufs_logs: productionOeufsLogsSeed,
  sensor_devices: sensorDevicesSeed,
  camera_devices: cameraDevicesSeed,
  business_plans: horizonFarmSimulationSeed.business_plans || [],
  bp_investment_lines: horizonFarmSimulationSeed.bp_investment_lines || [],
  bp_recurring_costs: horizonFarmSimulationSeed.bp_recurring_costs || [],
  bp_revenue_projections: horizonFarmSimulationSeed.bp_revenue_projections || [],
  bp_funding_sources: horizonFarmSimulationSeed.bp_funding_sources || [],
  bp_links: horizonFarmSimulationSeed.bp_links || [],
  bp_risks: horizonFarmSimulationSeed.bp_risks || [],
  sales_orders: horizonFarmSimulationSeed.sales_orders || [],
  sales_order_items: horizonFarmSimulationSeed.sales_order_items || [],
  deliveries: horizonFarmSimulationSeed.deliveries || [],
  invoices: horizonFarmSimulationSeed.invoices || [],
  payments: horizonFarmSimulationSeed.payments || [],
  sales_opportunities: horizonFarmSimulationSeed.sales_opportunities || [],
  business_events: horizonFarmSimulationSeed.business_events || [],
  alertes_center: horizonFarmSimulationSeed.alertes_center || [],
  whatsapp_templates: horizonFarmSimulationSeed.whatsapp_templates || [],
  whatsapp_logs: horizonFarmSimulationSeed.whatsapp_logs || [],
  price_catalog: horizonFarmSimulationSeed.price_catalog || [],
  bp_versions: horizonFarmSimulationSeed.bp_versions || [],
  bp_lines_history: horizonFarmSimulationSeed.bp_lines_history || [],
};
