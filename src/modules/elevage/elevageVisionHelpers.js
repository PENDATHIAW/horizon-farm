import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
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

export function computeLotMargin(lot = {}) {
  const missing = [];
  if (!n(lot.cout_poussins ?? lot.chick_cost)) missing.push('poussins');
  if (!n(lot.cout_aliment ?? lot.feed_cost)) missing.push('alimentation');
  if (!n(lot.cout_vaccins ?? lot.vaccine_cost)) missing.push('vaccins');
  if (missing.length >= 2) {
    return { id: lot.id, name: label(lot), reliable: false, missing, margin: null };
  }
  const cost = n(lot.cout_poussins ?? lot.chick_cost)
    + n(lot.cout_aliment ?? lot.feed_cost)
    + n(lot.cout_vaccins ?? lot.vaccine_cost)
    + n(lot.cout_energie ?? lot.energy_cost)
    + n(lot.cout_transport ?? lot.transport_cost);
  const revenue = n(lot.revenu ?? lot.revenue ?? lot.ca ?? lot.montant_vente);
  return {
    id: lot.id,
    name: label(lot),
    reliable: true,
    cost,
    revenue,
    margin: revenue - cost,
    missing: [],
  };
}

export function computeAnimalMargin(animal = {}) {
  const missing = [];
  if (!n(animal.cout_achat ?? animal.purchase_cost)) missing.push('achat');
  if (!n(animal.cout_alimentation ?? animal.feed_cost)) missing.push('alimentation');
  if (!n(animal.cout_sante ?? animal.health_cost)) missing.push('santé');
  if (missing.length >= 2) {
    return { id: animal.id, name: label(animal), reliable: false, missing, margin: null };
  }
  const cost = n(animal.cout_achat ?? animal.purchase_cost)
    + n(animal.cout_alimentation ?? animal.feed_cost)
    + n(animal.cout_sante ?? animal.health_cost)
    + n(animal.cout_transport ?? animal.transport_cost);
  const revenue = n(animal.prix_vente ?? animal.sale_price ?? animal.revenu);
  return { id: animal.id, name: label(animal), reliable: true, cost, revenue, margin: revenue - cost, missing: [] };
}

export function formatMargin(row) {
  if (!row.reliable) return 'Non fiable';
  return fmtCurrency(row.margin);
}

export function computeLotMarginWithRollup(lot = {}, context = {}) {
  const rollup = rollupLotCosts(lot, context);
  if (rollup.reliable) {
    return {
      id: rollup.id,
      name: rollup.name,
      reliable: true,
      cost: rollup.cost,
      revenue: rollup.revenue,
      margin: rollup.margin,
      missing: [],
      rollup: true,
    };
  }
  return { ...computeLotMargin(lot), rollup: false };
}

export function computeAnimalMarginWithRollup(animal = {}, context = {}) {
  const rollup = rollupAnimalCosts(animal, context);
  if (rollup.reliable) {
    return {
      id: rollup.id,
      name: rollup.name,
      reliable: true,
      cost: rollup.cost,
      revenue: rollup.revenue,
      margin: rollup.margin,
      missing: [],
      rollup: true,
    };
  }
  return { ...computeAnimalMargin(animal), rollup: false };
}
