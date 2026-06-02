import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../../services/unifiedCostService.js';
import { fmtCurrency } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const label = (r = {}) => r.name || r.nom || r.title || r.id || '—';

export function buildElevageHealthSnapshot({ animaux = [], lots = [], feedLogs = [], productionLogs = [], stocks = [], sante = [] }) {
  const data = {
    animaux,
    avicole: lots,
    lots,
    alimentation_logs: feedLogs,
    production_oeufs_logs: productionLogs,
    stock: stocks,
    sante,
  };
  const health = runErpHealthEngine(data);
  const findings = health.findings.filter((f) => f.module === 'elevage' || f.module === 'achats_stock');
  const predictions = health.predictions.filter((p) => p.module === 'elevage' || p.module === 'achats_stock');
  return { health, findings, predictions, score: health.score };
}

export function computeLotMargin(lot = {}, context = {}) {
  const unified = calculateUnifiedLotCost({
    lot,
    alimentationLogs: context.alimentationLogs || context.feedLogs || [],
    productionLogs: context.productionLogs || [],
    healthEvents: context.healthEvents || context.vaccins || [],
    directCharges: context.directCharges || context.businessEvents || [],
  });
  const revenue = n(lot.revenu ?? lot.revenue ?? lot.ca ?? lot.montant_vente ?? lot.prix_vente_reel ?? lot.sale_price);
  const missing = [];
  if (unified.purchaseCost <= 0) missing.push('poussins/achat');
  if (unified.feedingCost <= 0 && unified.costSource !== 'estime') missing.push('alimentation');
  if (unified.healthCost <= 0) missing.push('santé');
  const reliable = unified.totalCost > 0 && missing.length < 2;
  return {
    id: lot.id,
    name: label(lot),
    reliable,
    cost: unified.totalCost,
    revenue,
    margin: revenue > 0 ? revenue - unified.totalCost : null,
    missing,
    costSource: unified.costSource,
  };
}

export function computeAnimalMargin(animal = {}, context = {}) {
  const unified = calculateUnifiedAnimalCost({
    animal,
    alimentationLogs: context.alimentationLogs || context.feedLogs || [],
    vaccins: context.vaccins || context.healthEvents || [],
    healthEvents: context.healthEvents || [],
    directCharges: context.directCharges || [],
  });
  const revenue = n(animal.prix_vente ?? animal.sale_price ?? animal.revenu ?? animal.prix_vente_reel);
  const missing = [];
  if (unified.purchaseCost <= 0) missing.push('achat');
  if (unified.feedingCost <= 0 && unified.costSource !== 'estime') missing.push('alimentation');
  if (unified.healthCost <= 0) missing.push('santé');
  const reliable = unified.totalCost > 0 && missing.length < 2;
  return {
    id: animal.id,
    name: label(animal),
    reliable,
    cost: unified.totalCost,
    revenue,
    margin: revenue > 0 ? revenue - unified.totalCost : null,
    missing,
    costSource: unified.costSource,
  };
}

export function formatMargin(row) {
  if (!row.reliable) return 'Non fiable';
  return fmtCurrency(row.margin);
}
