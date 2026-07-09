/**
 * AGRI FEEDS — ordres de fabrication, FIFO matières, lots finis, QR.
 */
import { AGRI_FEEDS_ALERT_THRESHOLDS, PACKAGE_SIZES } from '../../config/agriFeeds.config.js';
import { assertBatchUsableInProduction } from './rawMaterialWorkflow.js';
import { computeRealProductionCost, computeCostVariance } from './feedCostEngine.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (v) => String(v || '').trim();
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Lots MP acceptés, plus anciens d’abord (FIFO). */
export function proposeFifoBatches(rawMaterialId, quantityNeededKg, dataMap = {}) {
  const needed = toNumber(quantityNeededKg);
  const batches = arr(dataMap.feed_raw_batches)
    .filter((b) => String(b.raw_material_id) === String(rawMaterialId))
    .filter((b) => assertBatchUsableInProduction(b).ok)
    .sort((a, b) => String(a.received_date || a.created_at || '').localeCompare(String(b.received_date || b.created_at || '')));

  const allocations = [];
  let remaining = needed;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = toNumber(batch.quantity_available);
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    allocations.push({
      batch_id: batch.id,
      batch_code: batch.batch_code,
      raw_material_id: rawMaterialId,
      quantity: take,
      unit_cost: toNumber(batch.unit_cost),
      stock_id: batch.stock_id || null,
    });
    remaining -= take;
  }

  return {
    allocations,
    needed,
    allocated: needed - remaining,
    shortfall: Math.max(0, remaining),
    ok: remaining <= 0.0001,
  };
}

export function buildPublicQrPayload({
  batchCode,
  productName,
  feedType,
  productionDate,
  quantityKg,
  packageSize,
  qualityStatus,
  contact = 'Horizon Farm',
} = {}) {
  // Pas de recette complète — familles / type seulement.
  return {
    product: productName || 'Aliment AGRI FEEDS',
    type: feedType || 'aliment_compose',
    lot: batchCode,
    date_fabrication: productionDate,
    poids_kg: quantityKg,
    conditionnement: PACKAGE_SIZES.find((p) => p.value === packageSize)?.label || packageSize,
    qualite: qualityStatus === 'accepted' ? 'conforme' : qualityStatus,
    conseils: 'Conserver au sec. Utiliser selon le stade animal indiqué.',
    contact,
    prudence: 'Ne pas exposer la formule complète. Vérifier le lot avant distribution.',
  };
}

export function buildQrCodeUrl(payload = {}) {
  const data = encodeURIComponent(JSON.stringify(payload));
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${data}`;
}

/**
 * Prépare un OF : ingrédients, quantités, FIFO, coût théorique, code.
 */
export function prepareProductionOrder(payload = {}, dataMap = {}) {
  const versionId = clean(payload.formula_version_id);
  const version = arr(dataMap.feed_formula_versions).find((v) => String(v.id) === versionId);
  if (!version) return { ok: false, error: 'Version de formule introuvable.' };

  const formula = arr(dataMap.feed_formulas).find((f) => String(f.id) === String(version.formula_id));
  const status = norm(formula?.status || '');
  if (['abandoned', 'suspended'].includes(status)) {
    return { ok: false, error: 'Formule suspendue ou abandonnée — production bloquée.' };
  }

  const planned = toNumber(payload.planned_quantity);
  if (planned <= 0) return { ok: false, error: 'Quantité planifiée obligatoire.' };

  const ingredients = arr(dataMap.feed_formula_ingredients)
    .filter((i) => String(i.formula_version_id) === versionId);

  if (!ingredients.length) {
    return { ok: false, error: 'Aucun ingrédient sur cette version de formule.' };
  }

  const materials = arr(dataMap.feed_raw_materials);
  const requirements = [];
  const fifoAll = [];
  const blockers = [];

  ingredients.forEach((ing) => {
    const pct = toNumber(ing.percentage || ing.quantity_for_100kg);
    const qtyNeeded = (pct / 100) * planned;
    const material = materials.find((m) => String(m.id) === String(ing.raw_material_id));
    const fifo = proposeFifoBatches(ing.raw_material_id, qtyNeeded, dataMap);
    requirements.push({
      raw_material_id: ing.raw_material_id,
      raw_material_name: material?.name || ing.raw_material_id,
      percentage: pct,
      quantity_needed: qtyNeeded,
      unit_cost: toNumber(ing.latest_unit_cost) || fifo.allocations[0]?.unit_cost || 0,
      fifo,
    });
    fifoAll.push(...fifo.allocations.map((a) => ({
      ...a,
      raw_material_name: material?.name || '',
    })));
    if (!fifo.ok) {
      blockers.push(
        `Stock insuffisant : ${material?.name || ing.raw_material_id} (manque ${fifo.shortfall.toFixed(1)} kg)`,
      );
    }
    // Vérifie qu’aucun lot rejeté n’est proposé (déjà filtré) — double check
    fifo.allocations.forEach((a) => {
      const batch = arr(dataMap.feed_raw_batches).find((b) => String(b.id) === String(a.batch_id));
      const usable = assertBatchUsableInProduction(batch || {});
      if (!usable.ok) blockers.push(usable.message);
    });
  });

  if (blockers.length) {
    return { ok: false, error: blockers[0], blockers, requirements };
  }

  const theoreticalMaterialsCost = requirements.reduce(
    (s, r) => s + r.quantity_needed * r.unit_cost,
    0,
  );
  const theoreticalCostPerKg = planned > 0 ? theoreticalMaterialsCost / planned : 0;
  const orderId = clean(payload.id) || makeId('FPO');
  const orderCode = clean(payload.order_code) || `OF-${dateStamp()}-${orderId.slice(-4)}`;

  const order = {
    id: orderId,
    order_code: orderCode,
    formula_version_id: versionId,
    planned_quantity: planned,
    actual_quantity: null,
    production_date: clean(payload.production_date) || new Date().toISOString().slice(0, 10),
    status: 'planned',
    machine_used: clean(payload.machine_used) || '',
    responsible_person: clean(payload.responsible_person) || '',
    raw_material_batches_used: fifoAll,
    losses_quantity: 0,
    losses_percentage: 0,
    packaging_quantity: toNumber(payload.packaging_quantity),
    packaging_cost: toNumber(payload.packaging_cost),
    real_cost_total: 0,
    real_cost_per_kg: 0,
    theoretical_cost_per_kg: theoreticalCostPerKg,
    notes: clean(payload.notes) || '',
    created_from: 'agri_feeds_production_workflow',
  };

  // Réservations = patches quantité sur lots MP (déduction à la création OF en in_progress)
  const batchPatches = fifoAll.map((a) => {
    const batch = arr(dataMap.feed_raw_batches).find((b) => String(b.id) === String(a.batch_id));
    return {
      id: a.batch_id,
      quantity_available: Math.max(0, toNumber(batch?.quantity_available) - toNumber(a.quantity)),
      reserved_for_order_id: orderId,
    };
  });

  const stockPatches = fifoAll
    .filter((a) => a.stock_id)
    .map((a) => {
      const stock = arr(dataMap.stock || dataMap.stocks).find((s) => String(s.id) === String(a.stock_id));
      return {
        id: a.stock_id,
        quantite: Math.max(0, toNumber(stock?.quantite) - toNumber(a.quantity)),
      };
    });

  return {
    ok: true,
    order,
    formula,
    version,
    requirements,
    fifoAllocations: fifoAll,
    batchPatches,
    stockPatches,
    theoretical_cost_per_kg: theoreticalCostPerKg,
    businessEvent: {
      event_type: 'agri_feeds_of_planifie',
      module_source: 'agri_feeds',
      entity_type: 'feed_production_order',
      entity_id: orderId,
      title: `OF planifié — ${orderCode}`,
      description: `${formula?.name || version.version_code} · ${planned} kg · ${theoreticalCostPerKg.toFixed(0)} FCFA/kg théo.`,
      amount: theoreticalMaterialsCost,
      event_date: order.production_date,
      severity: 'info',
    },
  };
}

export async function commitProductionOrder(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'OF invalide');
  const results = { order: null };

  const orderToCreate = { ...preview.order, status: 'in_progress' };
  if (handlers.onCreateOrder) {
    results.order = await handlers.onCreateOrder(orderToCreate);
  }

  if (handlers.onUpdateBatch) {
    for (const patch of preview.batchPatches || []) {
      await handlers.onUpdateBatch(patch.id, {
        quantity_available: patch.quantity_available,
      });
    }
  }
  if (handlers.onUpdateStock) {
    for (const patch of preview.stockPatches || []) {
      await handlers.onUpdateStock(patch.id, { quantite: patch.quantite });
    }
  }
  if (handlers.onCreateStockMovement) {
    for (const alloc of preview.fifoAllocations || []) {
      if (!alloc.stock_id) continue;
      await handlers.onCreateStockMovement({
        id: makeId('STKMVT'),
        stock_id: alloc.stock_id,
        movement_type: 'consommation_production',
        quantity: alloc.quantity,
        movement_date: preview.order.production_date,
        metadata: {
          feed_production_order_id: preview.order.id,
          feed_raw_batch_id: alloc.batch_id,
          created_from: 'agri_feeds_production_workflow',
        },
      });
    }
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  return results;
}

/**
 * Clôture OF : quantité réelle, pertes, coût réel, lot fini, stock PF, QR, QC.
 */
export function prepareCloseProductionOrder(payload = {}, dataMap = {}) {
  const orderId = clean(payload.order_id || payload.id);
  const order = arr(dataMap.feed_production_orders).find((o) => String(o.id) === orderId);
  if (!order) return { ok: false, error: 'Ordre de fabrication introuvable.' };
  if (norm(order.status) === 'completed') {
    return { ok: false, error: 'OF déjà clôturé.' };
  }
  if (norm(order.status) === 'cancelled') {
    return { ok: false, error: 'OF annulé — clôture impossible.' };
  }

  const actual = toNumber(payload.actual_quantity);
  if (actual <= 0) return { ok: false, error: 'Quantité réelle obligatoire pour clôturer.' };

  const requireQc = payload.require_qc !== false;
  const qcResult = clean(payload.qc_result || payload.quality_status);
  if (requireQc && !qcResult) {
    return { ok: false, error: 'Contrôle qualité obligatoire avant clôture.' };
  }
  if (['rejected', 'non_conforme', 'echec'].includes(norm(qcResult))) {
    return { ok: false, error: 'QC non conforme — clôture / mise en stock commercial bloquée.' };
  }

  const allocations = arr(order.raw_material_batches_used);
  const ingredientsUsed = allocations.map((a) => ({
    quantity: toNumber(a.quantity),
    unit_cost: toNumber(a.unit_cost),
  }));

  const real = computeRealProductionCost({
    plannedQuantity: toNumber(order.planned_quantity),
    actualQuantity: actual,
    ingredientsUsed,
    packagingCost: toNumber(payload.packaging_cost ?? order.packaging_cost),
    laborCost: toNumber(payload.labor_cost),
    energyCost: toNumber(payload.energy_cost),
  });

  const variance = computeCostVariance(
    toNumber(order.theoretical_cost_per_kg),
    real.real_cost_per_kg,
    AGRI_FEEDS_ALERT_THRESHOLDS.cost_variance_pct,
  );

  const version = arr(dataMap.feed_formula_versions)
    .find((v) => String(v.id) === String(order.formula_version_id));
  const formula = arr(dataMap.feed_formulas)
    .find((f) => String(f.id) === String(version?.formula_id));

  const finishedId = makeId('FFB');
  const batchCode = clean(payload.batch_code) || `AF-${dateStamp()}-${finishedId.slice(-4)}`;
  const packageSize = clean(payload.package_size) || '25kg';
  const destination = clean(payload.destination) || 'internal_test';
  const productionDate = clean(payload.production_date) || order.production_date || new Date().toISOString().slice(0, 10);
  const qualityStatus = norm(qcResult) === 'accepted' || norm(qcResult) === 'conforme' ? 'accepted' : (qcResult || 'accepted');

  const speciesLabel = formula?.target_species || 'aliment';
  const qrPayload = buildPublicQrPayload({
    batchCode,
    productName: formula?.name || 'Aliment AGRI FEEDS',
    feedType: `${speciesLabel}${formula?.target_stage ? ` · ${formula.target_stage}` : ''}`,
    productionDate,
    quantityKg: actual,
    packageSize,
    qualityStatus,
  });
  const qrUrl = buildQrCodeUrl(qrPayload);

  const stockId = makeId('STK');
  const finishedBatch = {
    id: finishedId,
    batch_code: batchCode,
    production_order_id: order.id,
    formula_version_id: order.formula_version_id,
    stock_id: stockId,
    production_date: productionDate,
    quantity_produced: actual,
    quantity_available: actual,
    package_size: packageSize,
    destination,
    storage_location: clean(payload.storage_location) || 'Stock produits finis',
    qr_code_payload: JSON.stringify(qrPayload),
    qr_code_url: qrUrl,
    quality_status: qualityStatus,
    sample_reference: clean(payload.sample_reference) || `ECH-${batchCode}`,
    unit_cost: real.real_cost_per_kg,
    active: true,
    created_from: 'agri_feeds_production_workflow',
  };

  const stockPatch = {
    id: stockId,
    produit: `${formula?.name || 'Aliment AGRI FEEDS'} · ${batchCode}`,
    categorie: 'aliment_agri_feeds',
    quantite: actual,
    unite: 'kg',
    prixUnit: real.real_cost_per_kg,
    seuil: AGRI_FEEDS_ALERT_THRESHOLDS.finished_stock_critical_kg,
    feed_finished_batch_id: finishedId,
    formula_version_id: order.formula_version_id,
    vendable: destination === 'commercial_sale',
    notes: `Lot AGRI FEEDS — destination ${destination}`,
  };

  const orderPatch = {
    id: order.id,
    status: 'completed',
    actual_quantity: actual,
    losses_quantity: real.losses_quantity,
    losses_percentage: real.losses_percentage,
    packaging_quantity: toNumber(payload.packaging_quantity ?? order.packaging_quantity),
    packaging_cost: real.packaging_cost,
    real_cost_total: real.real_cost_total,
    real_cost_per_kg: real.real_cost_per_kg,
    production_date: productionDate,
    updated_at: new Date().toISOString(),
  };

  const qualityCheck = {
    id: makeId('FQC'),
    related_type: 'finished_batch',
    related_id: finishedId,
    check_date: productionDate,
    check_type: 'post_production',
    result: qualityStatus,
    status: qualityStatus === 'accepted' ? 'pass' : 'review',
    responsible_person: clean(payload.responsible_person || order.responsible_person),
    notes: clean(payload.qc_notes) || '',
  };

  const alert = variance.exceeds ? {
    title: `Écart coût OF ${order.order_code}`,
    message: variance.message,
    severity: 'moyenne',
    module_source: 'agri_feeds',
    entity_id: order.id,
    action_recommandee: 'Vérifier pertes, prix matières et emballage.',
    created_from: 'agri_feeds_production_workflow',
  } : null;

  return {
    ok: true,
    orderPatch,
    finishedBatch,
    stockPatch,
    qualityCheck,
    qrPayload,
    qrUrl,
    real,
    variance,
    alert,
    movement: {
      id: makeId('STKMVT'),
      stock_id: stockId,
      movement_type: 'entree_production',
      quantity: actual,
      movement_date: productionDate,
      metadata: {
        feed_production_order_id: order.id,
        feed_finished_batch_id: finishedId,
        created_from: 'agri_feeds_production_workflow',
      },
    },
    businessEvent: {
      event_type: 'agri_feeds_of_cloture',
      module_source: 'agri_feeds',
      entity_type: 'feed_finished_batch',
      entity_id: finishedId,
      title: `Lot produit — ${batchCode}`,
      description: `${actual} kg · ${real.real_cost_per_kg.toFixed(0)} FCFA/kg réel · ${destination}`,
      amount: real.real_cost_total,
      event_date: productionDate,
      severity: variance.exceeds ? 'moyenne' : 'info',
    },
  };
}

export async function commitCloseProductionOrder(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Clôture invalide');
  const results = {};

  if (handlers.onUpdateOrder) {
    results.order = await handlers.onUpdateOrder(preview.orderPatch.id, preview.orderPatch);
  }
  if (handlers.onCreateFinishedBatch) {
    results.finishedBatch = await handlers.onCreateFinishedBatch(preview.finishedBatch);
  }
  if (handlers.onCreateStock) {
    results.stock = await handlers.onCreateStock(preview.stockPatch);
  }
  if (handlers.onCreateStockMovement && preview.movement) {
    results.movement = await handlers.onCreateStockMovement(preview.movement);
  }
  if (handlers.onCreateQualityCheck && preview.qualityCheck) {
    results.qualityCheck = await handlers.onCreateQualityCheck(preview.qualityCheck);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  if (handlers.onCreateAlert && preview.alert) {
    results.alert = await handlers.onCreateAlert(preview.alert);
  }
  return results;
}

export function assertFinishedBatchSellable(batch = {}, formula = {}) {
  if (!batch?.id) return { ok: false, message: 'Lot produit introuvable.' };
  if (batch.active === false) return { ok: false, message: 'Lot inactif.' };
  if (['rejected', 'suspended', 'suspendu'].includes(norm(batch.quality_status))) {
    return { ok: false, message: 'Lot suspendu ou rejeté — vente bloquée.' };
  }
  if (toNumber(batch.quantity_available) <= 0) {
    return { ok: false, message: 'Stock produit fini insuffisant.' };
  }
  if (norm(formula.status) !== 'commercializable' && norm(batch.destination) === 'commercial_sale') {
    return { ok: false, message: 'Formule non commercialisable — vente bloquée.' };
  }
  return { ok: true };
}
