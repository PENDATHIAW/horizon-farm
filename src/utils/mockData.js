import { buildWeatherAnalysis } from './weather';
import { horizonFarmSimulationSeed } from './horizonFarmSimulationSeed';

const readableCategory = (value = '') => {
  const key = String(value || '').toLowerCase();
  if (key.includes('pondeuse')) return 'Pondeuses';
  if (key.includes('chair')) return 'Poulets de chair';
  if (key.includes('bovin')) return 'Bovins';
  if (key.includes('ovin')) return 'Ovins';
  if (key.includes('caprin')) return 'Caprins';
  if (key.includes('infrastructure')) return 'Infrastructure';
  if (key.includes('equip')) return 'Équipement';
  if (key.includes('stock')) return 'Stock initial';
  if (key.includes('sante')) return 'Santé';
  if (key.includes('tresorerie')) return 'Trésorerie';
  return value || 'Autre';
};

const normalizeBpInvestmentLines = (rows = []) => rows.map((row) => ({
  ...row,
  designation: row.designation || row.libelle || row.label || row.nom || 'Dépense BP',
  libelle: row.libelle || row.designation || row.label || row.nom || 'Dépense BP',
  categorie: row.categorie || readableCategory(row.category || row.activity),
  category: row.category || row.activity || row.categorie || 'autre',
  quantite: Number(row.quantite || row.qte || row.quantity || 1),
  unite: row.unite || row.unit || 'lot',
  prix_unitaire: Number(row.prix_unitaire || row.prix || row.unit_price || row.montant || row.total || 0),
  montant: Number(row.montant || row.total || 0),
  total: Number(row.total || row.montant || 0),
  statut: row.statut || row.status || 'prévu',
  preuve: row.preuve || row.justificatif || '',
}));

const normalizeBpRecurringCosts = (rows = []) => rows.map((row) => ({
  ...row,
  designation: row.designation || row.libelle || row.label || 'Charge BP',
  categorie: row.categorie || readableCategory(row.activity || row.category),
  montant_mensuel: Number(row.montant_mensuel || row.montant || row.total || 0),
  montant: Number(row.montant || row.montant_mensuel || row.total || 0),
  periodicite: row.periodicite || 'mensuelle',
}));

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

const bpInvestmentLinesSeed = normalizeBpInvestmentLines(horizonFarmSimulationSeed.bp_investment_lines || []);
const bpRecurringCostsSeed = normalizeBpRecurringCosts(horizonFarmSimulationSeed.bp_recurring_costs || []);

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
  bp_investment_lines: bpInvestmentLinesSeed,
  bp_recurring_costs: bpRecurringCostsSeed,
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
