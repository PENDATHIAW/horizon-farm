/**
 * AGRI FEEDS - achat / réception matière première + contrôle qualité.
 * Réutilise le pattern prepare/commit (stock + finance + business_event).
 */
import { AGRI_FEEDS_ALERT_THRESHOLDS } from '../../config/agriFeeds.config.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (v) => String(v || '').trim();
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function supplierHints(supplier = {}, dataMap = {}) {
  if (!supplier?.id) {
    return {
      usualMaterials: [],
      lastPriceByMaterial: {},
      averageQualityScore: null,
      averageDeliveryDelay: null,
      usualStorageLocation: '',
      paymentTerms: '',
    };
  }
  const batches = arr(dataMap.feed_raw_batches)
    .filter((b) => String(b.supplier_id) === String(supplier.id))
    .sort((a, b) => String(b.received_date || '').localeCompare(String(a.received_date || '')));

  const materials = arr(dataMap.feed_raw_materials);
  const materialIds = [...new Set(batches.map((b) => String(b.raw_material_id)).filter(Boolean))];
  const usualMaterials = materialIds.map((id) => materials.find((m) => String(m.id) === id)).filter(Boolean);

  const lastPriceByMaterial = {};
  materialIds.forEach((id) => {
    const last = batches.find((b) => String(b.raw_material_id) === id);
    if (last) lastPriceByMaterial[id] = toNumber(last.unit_cost);
  });

  const qualityScores = batches
    .map((b) => {
      if (norm(b.quality_status) === 'accepted') return 1;
      if (norm(b.quality_status) === 'rejected') return 0;
      return 0.5;
    });
  const averageQualityScore = qualityScores.length
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : toNumber(supplier.average_quality_score, null);

  return {
    usualMaterials,
    lastPriceByMaterial,
    averageQualityScore,
    averageDeliveryDelay: toNumber(supplier.average_delivery_delay, null),
    usualStorageLocation: batches[0]?.storage_location || '',
    paymentTerms: supplier.payment_terms || '',
    lastPurchaseDate: batches[0]?.received_date || supplier.last_purchase_date || null,
  };
}

export function qualityThresholdsForMaterial(material = {}) {
  const moisture = toNumber(material.standard_moisture_threshold, AGRI_FEEDS_ALERT_THRESHOLDS.moisture_reject_above);
  return {
    unit: material.unit || 'kg',
    moisture_reject_above: moisture,
    checks: ['visual_check', 'smell_check', 'insect_check', 'impurity_check', 'moisture_value'],
    storage_requirements: material.storage_requirements || '',
    is_experimental: Boolean(material.is_experimental),
  };
}

export function evaluateReceptionQuality(payload = {}, material = {}) {
  const thresholds = qualityThresholdsForMaterial(material);
  const moisture = toNumber(payload.moisture_value, null);
  const issues = [];

  if (moisture != null && moisture > thresholds.moisture_reject_above) {
    issues.push(`Humidité ${moisture} % > seuil ${thresholds.moisture_reject_above} %`);
  }
  ['visual_check', 'smell_check', 'insect_check', 'impurity_check'].forEach((key) => {
    const val = norm(payload[key]);
    if (val.includes('non') || val.includes('mauvais') || val.includes('doute') || val.includes('insect') || val.includes('impur')) {
      issues.push(`Contrôle ${key.replace('_check', '')} : ${payload[key]}`);
    }
  });

  let qualityStatus = clean(payload.quality_status) || 'under_review';
  if (payload.force_reject || issues.length >= 2) qualityStatus = 'rejected';
  else if (payload.force_accept && issues.length === 0) qualityStatus = 'accepted';
  else if (issues.length === 0 && (moisture == null || moisture <= thresholds.moisture_reject_above)) {
    if (!payload.quality_status) qualityStatus = 'accepted';
  }

  return {
    quality_status: qualityStatus,
    issues,
    thresholds,
    usable_in_production: qualityStatus === 'accepted',
  };
}

/**
 * Prépare réception MP : stock + batch + finance + event (+ alerte si rejeté).
 */
export function prepareRawMaterialReception(payload = {}, context = {}) {
  const material = context.material
    || arr(context.feed_raw_materials).find((m) => String(m.id) === String(payload.raw_material_id));
  if (!material) {
    return { ok: false, error: 'Matière première introuvable.' };
  }

  const qty = toNumber(payload.quantity_received);
  const unitCost = toNumber(payload.unit_cost);
  if (qty <= 0) return { ok: false, error: 'Quantité reçue obligatoire.' };
  if (unitCost < 0) return { ok: false, error: 'Coût unitaire invalide.' };

  const totalCost = toNumber(payload.total_cost) > 0 ? toNumber(payload.total_cost) : qty * unitCost;
  const quality = evaluateReceptionQuality(payload, material);
  const batchId = clean(payload.id) || makeId('FRB');
  const batchCode = clean(payload.batch_code) || `MP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${batchId.slice(-4)}`;
  const stockId = clean(payload.stock_id) || makeId('STK');
  const receivedDate = clean(payload.received_date) || new Date().toISOString().slice(0, 10);
  const paymentStatus = clean(payload.payment_status) || 'paye';
  const paidAmount = paymentStatus === 'a_payer' ? 0 : (paymentStatus === 'partiel' ? toNumber(payload.paid_amount) : totalCost);

  const batch = {
    id: batchId,
    raw_material_id: material.id,
    supplier_id: clean(payload.supplier_id) || null,
    purchase_id: clean(payload.purchase_id) || null,
    stock_id: stockId,
    batch_code: batchCode,
    received_date: receivedDate,
    quantity_received: qty,
    quantity_available: quality.quality_status === 'rejected' ? 0 : qty,
    unit_cost: unitCost,
    total_cost: totalCost,
    quality_status: quality.quality_status,
    moisture_value: payload.moisture_value ?? null,
    visual_check: payload.visual_check || '',
    smell_check: payload.smell_check || '',
    insect_check: payload.insect_check || '',
    impurity_check: payload.impurity_check || '',
    storage_location: clean(payload.storage_location) || 'Stockage matières premières',
    expiry_internal_date: payload.expiry_internal_date || null,
    sample_reference: payload.sample_reference || '',
    notes: payload.notes || '',
    created_from: 'agri_feeds_raw_reception',
  };

  const stockPatch = {
    id: stockId,
    produit: `${material.name} · ${batchCode}`,
    categorie: 'matiere_premiere_aliment',
    quantite: quality.quality_status === 'rejected' ? 0 : qty,
    unite: material.unit || 'kg',
    prixUnit: unitCost,
    seuil: toNumber(payload.seuil, AGRI_FEEDS_ALERT_THRESHOLDS.raw_material_stock_critical_kg),
    fournisseur_id: batch.supplier_id,
    raw_material_id: material.id,
    feed_raw_batch_id: batchId,
    notes: quality.quality_status === 'rejected' ? 'Lot rejeté - non utilisable en production' : '',
  };

  const movement = {
    id: makeId('STKMVT'),
    stock_id: stockId,
    movement_type: quality.quality_status === 'rejected' ? 'reception_rejetee' : 'reception_achat',
    quantity: qty,
    movement_date: receivedDate,
    metadata: {
      unit_cost: unitCost,
      feed_raw_batch_id: batchId,
      quality_status: quality.quality_status,
      created_from: 'agri_feeds_raw_reception',
    },
  };

  const finance = paidAmount > 0 ? {
    id: makeId('TRX'),
    type: 'sortie',
    categorie: 'Stock',
    libelle: `Achat MP AGRI FEEDS - ${material.name}`,
    montant: paidAmount,
    module_lie: 'agri_feeds',
    related_id: batchId,
    fournisseur_id: batch.supplier_id,
    stock_id: stockId,
    created_from: 'agri_feeds_raw_reception',
  } : null;

  const supplierPatch = batch.supplier_id ? {
    id: batch.supplier_id,
    last_purchase_date: receivedDate,
    supplier_type: payload.supplier_type || 'raw_material_supplier',
    ...(paymentStatus !== 'paye' ? { dettes_delta: totalCost - paidAmount } : {}),
    ...(quality.quality_status === 'rejected' ? { quality_event: 'reject' } : {}),
  } : null;

  const businessEvent = {
    event_type: quality.quality_status === 'rejected' ? 'agri_feeds_mp_rejetee' : 'agri_feeds_mp_reception',
    module_source: 'agri_feeds',
    entity_type: 'feed_raw_batch',
    entity_id: batchId,
    title: quality.quality_status === 'rejected'
      ? `MP rejetée - ${material.name}`
      : `Réception MP - ${material.name}`,
    description: `${qty} ${material.unit || 'kg'} · ${batchCode} · ${quality.quality_status}`,
    amount: totalCost,
    event_date: receivedDate,
    severity: quality.quality_status === 'rejected' ? 'haute' : 'info',
  };

  const alert = quality.quality_status === 'rejected' ? {
    title: `Qualité MP - ${material.name} rejetée`,
    message: quality.issues.join(' · ') || 'Lot matière première rejeté à la réception.',
    severity: 'haute',
    module_source: 'agri_feeds',
    entity_id: batchId,
    action_recommandee: 'Ne pas utiliser en production. Contacter le fournisseur.',
    created_from: 'agri_feeds_raw_reception',
  } : null;

  return {
    ok: true,
    batch,
    stockPatch,
    movement,
    finance,
    supplierPatch,
    businessEvent,
    alert,
    quality,
    side_effects_managed: true,
  };
}

export async function commitRawMaterialReception(preview = {}, handlers = {}) {
  if (!preview?.ok) throw new Error(preview?.error || 'Réception invalide');

  const results = { batch: null, stock: null, movement: null, finance: null, alert: null };

  if (handlers.onCreateBatch) {
    results.batch = await handlers.onCreateBatch(preview.batch);
  }
  if (handlers.onCreateStock || handlers.onUpdateStock) {
    const existing = handlers.findStock?.(preview.stockPatch.id);
    if (existing && handlers.onUpdateStock) {
      results.stock = await handlers.onUpdateStock(preview.stockPatch.id, {
        ...preview.stockPatch,
        quantite: toNumber(existing.quantite) + toNumber(preview.stockPatch.quantite),
      });
    } else if (handlers.onCreateStock) {
      results.stock = await handlers.onCreateStock(preview.stockPatch);
    }
  }
  if (handlers.onCreateStockMovement && preview.movement) {
    results.movement = await handlers.onCreateStockMovement(preview.movement);
  }
  if (handlers.onCreateFinance && preview.finance) {
    results.finance = await handlers.onCreateFinance(preview.finance);
  }
  if (handlers.onUpdateSupplier && preview.supplierPatch) {
    const patch = { ...preview.supplierPatch };
    const delta = toNumber(patch.dettes_delta);
    delete patch.dettes_delta;
    delete patch.quality_event;
    if (delta > 0) {
      const current = toNumber(handlers.findSupplier?.(patch.id)?.dettes);
      patch.dettes = current + delta;
    }
    await handlers.onUpdateSupplier(patch.id, patch);
  }
  if (handlers.onCreateBusinessEvent && preview.businessEvent) {
    await handlers.onCreateBusinessEvent(preview.businessEvent);
  }
  if (handlers.onCreateAlert && preview.alert) {
    results.alert = await handlers.onCreateAlert(preview.alert);
  }

  return results;
}

/** Bloque l’usage production si lot rejeté. */
export function assertBatchUsableInProduction(batch = {}) {
  if (!batch?.id) return { ok: false, message: 'Lot matière introuvable.' };
  if (norm(batch.quality_status) === 'rejected') {
    return { ok: false, message: 'Matière première rejetée - production bloquée.' };
  }
  if (norm(batch.quality_status) === 'under_review') {
    return { ok: false, message: 'Lot encore en revue qualité - production bloquée.' };
  }
  if (toNumber(batch.quantity_available) <= 0) {
    return { ok: false, message: 'Quantité disponible insuffisante.' };
  }
  return { ok: true };
}
