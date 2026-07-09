/**
 * AGRI FEEDS — coûts théoriques / réels des formules et lots.
 */
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function resolveLatestUnitCost(rawMaterialId, dataMap = {}) {
  const batches = arr(dataMap.feed_raw_batches)
    .filter((b) => String(b.raw_material_id) === String(rawMaterialId))
    .filter((b) => norm(b.quality_status) !== 'rejected')
    .sort((a, b) => String(b.received_date || b.created_at || '').localeCompare(String(a.received_date || a.created_at || '')));
  if (batches[0]) return toNumber(batches[0].unit_cost);

  const stocks = arr(dataMap.stock || dataMap.stocks).filter((s) => {
    const text = norm(`${s.categorie || ''} ${s.produit || ''} ${s.raw_material_id || ''}`);
    return String(s.raw_material_id || '') === String(rawMaterialId)
      || text.includes('matiere_premiere');
  });
  if (stocks[0]) return toNumber(stocks[0].prixUnit ?? stocks[0].prix_unitaire);
  return 0;
}

/**
 * Calcule le coût théorique d'une version à partir de ses ingrédients.
 * @param {Array} ingredients — { raw_material_id, percentage, latest_unit_cost? }
 */
export function computeTheoreticalFormulaCost(ingredients = [], dataMap = {}) {
  const lines = arr(ingredients).map((ing) => {
    const percentage = toNumber(ing.percentage);
    const quantityFor100kg = percentage > 0 ? percentage : toNumber(ing.quantity_for_100kg);
    const pct = quantityFor100kg;
    const unitCost = toNumber(ing.latest_unit_cost) > 0
      ? toNumber(ing.latest_unit_cost)
      : resolveLatestUnitCost(ing.raw_material_id, dataMap);
    const qtyKg = pct; // pour 100 kg de formule, % = kg
    const costContribution = (qtyKg / 100) * unitCost * 100; // = qtyKg * unitCost for 100kg batch
    // cost for 100 kg batch = sum(qty_kg * unit_cost)
    // cost per kg = total_100 / 100
    return {
      ...ing,
      percentage: pct,
      quantity_for_100kg: pct,
      latest_unit_cost: unitCost,
      cost_contribution: qtyKg * unitCost,
      is_experimental: Boolean(ing.is_experimental),
    };
  });

  const totalPct = lines.reduce((s, l) => s + toNumber(l.percentage), 0);
  const costFor100kg = lines.reduce((s, l) => s + toNumber(l.cost_contribution), 0);
  const theoreticalCostPerKg = costFor100kg / 100;

  const alerts = [];
  if (totalPct > 0 && Math.abs(totalPct - 100) > 0.5) {
    alerts.push({
      type: 'percentage_sum',
      severity: 'attention',
      message: `Somme des pourcentages = ${totalPct.toFixed(1)} % (attendu 100 %).`,
    });
  }
  lines.forEach((l) => {
    if (l.is_experimental || norm(l.notes).includes('experiment')) {
      alerts.push({
        type: 'experimental',
        severity: 'attention',
        message: `Matière expérimentale : ${l.raw_material_name || l.raw_material_id || 'ingrédient'}.`,
      });
    }
  });

  return {
    ingredients: lines,
    total_percentage: totalPct,
    cost_for_100kg: costFor100kg,
    theoretical_cost_per_kg: theoreticalCostPerKg,
    alerts,
  };
}

export function computeCostVariance(theoreticalPerKg, realPerKg, thresholdPct = 15) {
  const theo = toNumber(theoreticalPerKg);
  const real = toNumber(realPerKg);
  if (theo <= 0 || real <= 0) {
    return { variance_pct: null, exceeds: false, message: 'Données insuffisantes pour conclure.' };
  }
  const variancePct = ((real - theo) / theo) * 100;
  return {
    variance_pct: variancePct,
    exceeds: Math.abs(variancePct) >= thresholdPct,
    message: Math.abs(variancePct) >= thresholdPct
      ? `Écart coût réel / théorique : ${variancePct.toFixed(1)} %.`
      : `Écart dans la tolérance (${variancePct.toFixed(1)} %).`,
  };
}

export function computeRealProductionCost({
  plannedQuantity = 0,
  actualQuantity = 0,
  ingredientsUsed = [],
  packagingCost = 0,
  laborCost = 0,
  energyCost = 0,
} = {}) {
  const materialsCost = arr(ingredientsUsed).reduce(
    (s, row) => s + toNumber(row.quantity) * toNumber(row.unit_cost),
    0,
  );
  const realCostTotal = materialsCost + toNumber(packagingCost) + toNumber(laborCost) + toNumber(energyCost);
  const actual = toNumber(actualQuantity);
  const planned = toNumber(plannedQuantity);
  const lossesQuantity = Math.max(0, planned - actual);
  const lossesPercentage = planned > 0 ? (lossesQuantity / planned) * 100 : 0;
  const realCostPerKg = actual > 0 ? realCostTotal / actual : 0;

  return {
    materials_cost: materialsCost,
    packaging_cost: toNumber(packagingCost),
    labor_cost: toNumber(laborCost),
    energy_cost: toNumber(energyCost),
    real_cost_total: realCostTotal,
    real_cost_per_kg: realCostPerKg,
    losses_quantity: lossesQuantity,
    losses_percentage: lossesPercentage,
  };
}

/** Compare coût formule courante vs version précédente. */
export function compareFormulaCostToPrevious(currentPerKg, previousPerKg) {
  const current = toNumber(currentPerKg);
  const previous = toNumber(previousPerKg);
  if (current <= 0 || previous <= 0) {
    return { status: 'insufficient', message: 'Données insuffisantes pour conclure.', delta_pct: null };
  }
  const deltaPct = ((current - previous) / previous) * 100;
  if (Math.abs(deltaPct) < 3) {
    return { status: 'equivalent', message: 'Coût équivalent à la version précédente.', delta_pct: deltaPct };
  }
  if (deltaPct > 0) {
    return {
      status: 'higher',
      message: `Coût supérieur de ${deltaPct.toFixed(1)} % à la version précédente.`,
      delta_pct: deltaPct,
    };
  }
  return {
    status: 'lower',
    message: `Coût inférieur de ${Math.abs(deltaPct).toFixed(1)} % à la version précédente.`,
    delta_pct: deltaPct,
  };
}

export function availableStockForMaterial(rawMaterialId, dataMap = {}) {
  const batches = arr(dataMap.feed_raw_batches).filter(
    (b) => String(b.raw_material_id) === String(rawMaterialId)
      && norm(b.quality_status) === 'accepted',
  );
  const fromBatches = batches.reduce((s, b) => s + toNumber(b.quantity_available), 0);
  if (fromBatches > 0) return { kg: fromBatches, source: 'batches', batches };

  const stocks = arr(dataMap.stock || dataMap.stocks).filter((s) => {
    if (String(s.raw_material_id || '') === String(rawMaterialId)) return true;
    const cat = norm(s.categorie || '');
    return cat.includes('matiere_premiere_aliment')
      && String(s.linked_raw_material_id || '') === String(rawMaterialId);
  });
  const fromStock = stocks.reduce((s, row) => s + toNumber(row.quantite ?? row.quantity), 0);
  return { kg: fromStock, source: 'stock', batches: stocks };
}
