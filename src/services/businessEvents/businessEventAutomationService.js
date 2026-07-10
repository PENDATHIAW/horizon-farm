import {
  BUSINESS_EVENT_IDS,
  BUSINESS_EVENT_WORKFLOWS,
  getBusinessEventWorkflow,
} from '../../config/businessInterconnections.config.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

const FIELD_ALIASES = Object.freeze({
  date: ['date', 'event_date', 'created_at', 'timestamp', 'start_date', 'production_date'],
  timestamp: ['timestamp', 'date', 'created_at', 'event_date'],
  source_id: ['source_id', 'origin_id', 'building_id', 'lot_id', 'animal_id', 'stock_id'],
  product_id: ['product_id', 'stock_id', 'feed_stock_id', 'raw_material_id'],
  target_id: ['target_id', 'lot_id', 'animal_id', 'building_id'],
  parcel_id: ['parcel_id', 'parcelle_id', 'destination_parcel_id'],
  parcel_or_stock_id: ['parcel_or_stock_id', 'parcel_id', 'parcelle_id', 'stock_id'],
  weight_or_unit_price: ['weight_or_unit_price', 'unit_price', 'price_per_kg', 'sale_price', 'weight_kg'],
  water_volume_or_duration: ['water_volume_or_duration', 'water_volume', 'volume_liters', 'volume_m3', 'duration_minutes'],
  linked_entity: ['linked_entity', 'linked_entity_id', 'entity_id', 'related_id'],
});

function candidateKeys(field) {
  return [field, ...(FIELD_ALIASES[field] || [])];
}

function fieldValue(payload = {}, field = '') {
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  for (const key of candidateKeys(field)) {
    const value = payload[key] ?? metadata[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function listBusinessEventWorkflows() {
  return BUSINESS_EVENT_WORKFLOWS;
}

export function validateBusinessEventPayload(eventId, payload = {}) {
  const workflow = getBusinessEventWorkflow(eventId);
  if (!workflow) {
    return { ok: false, eventId, missingFields: [], errors: [`Événement métier inconnu : ${eventId}`] };
  }

  const missingFields = workflow.requiredFields.filter((field) => fieldValue(payload, field) === undefined);
  const errors = missingFields.map((field) => `Champ obligatoire manquant : ${field}`);
  return {
    ok: errors.length === 0,
    eventId,
    workflow,
    missingFields,
    errors,
  };
}

export function computeBusinessEventDerivedMetrics(eventId, payload = {}, dataMap = {}) {
  const quantity = toNumber(fieldValue(payload, 'quantity') ?? payload.quantity_kg ?? payload.quantity_trays ?? payload.quantity_used ?? payload.amount);
  const unitCost = toNumber(payload.unit_cost ?? payload.cost_per_unit ?? payload.price_per_kg);
  const unitPrice = toNumber(payload.unit_price ?? payload.price_per_kg ?? payload.sale_price ?? payload.weight_or_unit_price);
  const amount = toNumber(payload.amount) || (quantity > 0 && unitPrice > 0 ? quantity * unitPrice : 0);

  const derived = {
    quantity,
    unit_cost: unitCost,
    unit_price: unitPrice,
    amount,
  };

  if (eventId === 'biosecurity_cleaning') {
    const bags = toNumber(fieldValue(payload, 'bags_collected'));
    const estimatedWeightPerBag = toNumber(fieldValue(payload, 'estimated_weight_per_bag'));
    const totalKg = bags * estimatedWeightPerBag;
    const sanitaryStatus = norm(fieldValue(payload, 'sanitary_status'));
    const destination = norm(fieldValue(payload, 'destination'));
    const isSuspect = /suspect|contamine|contaminé|maladie|doute|quarantaine/.test(sanitaryStatus);
    const destinationLooksLikeCrop = /parcelle|culture|tomate|salade|maraichage|maraîchage/.test(destination);
    return {
      ...derived,
      bags_collected: bags,
      estimated_weight_per_bag: estimatedWeightPerBag,
      total_organic_kg: totalKg,
      sanitary_status: sanitaryStatus || 'normal',
      destination,
      organic_material_blocked: isSuspect,
      crop_destination_blocked: isSuspect && destinationLooksLikeCrop,
    };
  }

  if (eventId === 'client_payment') {
    const remainingBefore = toNumber(payload.remaining_before ?? payload.reste_a_payer_avant);
    return {
      ...derived,
      amount_paid: toNumber(fieldValue(payload, 'amount')),
      remaining_after: remainingBefore > 0 ? Math.max(0, remainingBefore - toNumber(fieldValue(payload, 'amount'))) : undefined,
    };
  }

  if (eventId === 'feed_distribution') {
    const stockRows = arr(dataMap.stock || dataMap.stocks);
    const stockId = fieldValue(payload, 'feed_stock_id');
    const stock = stockRows.find((row) => String(row.id) === String(stockId));
    const available = toNumber(stock?.quantite ?? stock?.quantity ?? stock?.quantity_available);
    return {
      ...derived,
      feed_stock_id: stockId,
      stock_available_before: stock ? available : undefined,
      stock_after_distribution: stock ? available - quantity : undefined,
      stock_insufficient: stock ? quantity > available : false,
    };
  }

  return derived;
}

function buildEventTitle(workflow = {}, payload = {}) {
  const date = clean(fieldValue(payload, 'date') || fieldValue(payload, 'timestamp') || today());
  return `${workflow.label} — ${date}`;
}

function buildEventDescription(workflow = {}, payload = {}, derived = {}) {
  const bits = [];
  if (derived.quantity > 0) bits.push(`quantité ${derived.quantity}`);
  if (derived.amount > 0) bits.push(`${Math.round(derived.amount)} FCFA`);
  if (derived.total_organic_kg > 0) bits.push(`${derived.total_organic_kg} kg collectés`);
  const destination = fieldValue(payload, 'destination') || fieldValue(payload, 'destination_parcel_id');
  if (destination) bits.push(`destination ${destination}`);
  return bits.length ? `${workflow.label} : ${bits.join(' · ')}` : workflow.label;
}

export function buildBusinessEventRow(eventId, payload = {}, options = {}) {
  const workflow = getBusinessEventWorkflow(eventId);
  if (!workflow) throw new Error(`Événement métier inconnu : ${eventId}`);
  const derived = computeBusinessEventDerivedMetrics(eventId, payload, options.dataMap || {});
  const eventDate = clean(fieldValue(payload, 'date') || fieldValue(payload, 'timestamp') || today()).slice(0, 10);
  return {
    id: clean(payload.id) || makeId('EVT'),
    event_type: eventId,
    module_source: workflow.sourceModule,
    entity_type: clean(payload.entity_type || payload.target_type || payload.linked_entity_type || ''),
    entity_id: clean(payload.entity_id || payload.target_id || payload.lot_id || payload.animal_id || payload.parcel_id || payload.stock_id || ''),
    title: clean(payload.title) || buildEventTitle(workflow, payload),
    description: clean(payload.description) || buildEventDescription(workflow, payload, derived),
    event_date: eventDate,
    severity: derived.crop_destination_blocked ? 'haute' : (payload.severity || 'info'),
    amount: derived.amount || undefined,
    metadata: {
      ...(payload.metadata || {}),
      business_event_id: eventId,
      source_module: workflow.sourceModule,
      impacted_modules: workflow.impactedModules,
      required_fields: workflow.requiredFields,
      automatic_effects: workflow.automaticEffects,
      metrics_impacted: workflow.metricsImpacted,
      coherence_rules: workflow.coherenceRules,
      next_steps: workflow.nextSteps,
      payload,
      derived,
      created_from: 'business_event_automation_service',
    },
  };
}

function buildTask({ eventId, workflow, payload, label, priority = 'normale', dueDate, linkedId }) {
  return {
    id: makeId('TASK'),
    title: label,
    description: `${workflow.label} — action générée automatiquement`,
    module_source: workflow.sourceModule,
    linked_event_type: eventId,
    linked_entity_id: linkedId || payload.id || payload.entity_id || payload.lot_id || payload.animal_id || payload.parcel_id || payload.building_id || null,
    priority,
    status: 'a_faire',
    due_date: dueDate || fieldValue(payload, 'next_due_date') || fieldValue(payload, 'date') || today(),
    metadata: {
      business_event_id: eventId,
      created_from: 'business_event_automation_service',
    },
  };
}

function buildAlert({ eventId, workflow, payload, title, message, severity = 'moyenne', linkedId }) {
  return {
    id: makeId('ALERT'),
    title,
    message,
    severity,
    module_source: workflow.sourceModule,
    entity_id: linkedId || payload.id || payload.entity_id || payload.lot_id || payload.animal_id || payload.parcel_id || payload.building_id || null,
    status: 'open',
    metadata: {
      business_event_id: eventId,
      created_from: 'business_event_automation_service',
    },
  };
}

export function buildBusinessEventAutomationPlan(eventId, payload = {}, dataMap = {}, options = {}) {
  const workflow = getBusinessEventWorkflow(eventId);
  const validation = validateBusinessEventPayload(eventId, payload);
  if (!workflow || !validation.ok) {
    return {
      ok: false,
      eventId,
      workflow,
      validation,
      operations: [],
      errors: validation.errors,
    };
  }

  const derived = computeBusinessEventDerivedMetrics(eventId, payload, dataMap);
  const businessEvent = buildBusinessEventRow(eventId, payload, { ...options, dataMap });
  const operations = [
    { type: 'business_event.create', table: 'business_events', payload: businessEvent },
  ];

  if (eventId === 'biosecurity_cleaning') {
    const organicStockId = makeId('STKORG');
    operations.push({
      type: 'stock.create',
      table: 'stock',
      payload: {
        id: organicStockId,
        produit: `Matière organique — ${fieldValue(payload, 'organic_material_type')}`,
        categorie: 'matiere_organique',
        quantite: derived.total_organic_kg,
        unite: 'kg',
        source_type: 'biosecurity_cleaning',
        source_id: businessEvent.id,
        building_id: fieldValue(payload, 'building_id'),
        sanitary_status: fieldValue(payload, 'sanitary_status'),
        destination: fieldValue(payload, 'destination'),
        metadata: {
          bags_collected: derived.bags_collected,
          estimated_weight_per_bag: derived.estimated_weight_per_bag,
          next_step: fieldValue(payload, 'next_step'),
          created_from: 'biosecurity_cleaning_event',
        },
      },
    });
    operations.push({
      type: 'task.create',
      table: 'taches',
      payload: buildTask({
        eventId,
        workflow,
        payload,
        label: `Biosécurité — ${fieldValue(payload, 'next_step')}`,
        priority: derived.crop_destination_blocked ? 'haute' : 'normale',
        linkedId: businessEvent.id,
      }),
    });
    if (derived.crop_destination_blocked) {
      operations.push({
        type: 'alert.create',
        table: 'alertes_center',
        payload: buildAlert({
          eventId,
          workflow,
          payload,
          title: 'Matière organique suspecte bloquée',
          message: 'Le statut sanitaire est suspect : la valorisation vers une parcelle doit être bloquée jusqu’à validation.',
          severity: 'haute',
          linkedId: businessEvent.id,
        }),
      });
    }
  }

  if (eventId === 'feed_distribution') {
    operations.push({
      type: 'stock_movement.create',
      table: 'stock_movements',
      payload: {
        id: makeId('STKMVT'),
        stock_id: fieldValue(payload, 'feed_stock_id'),
        movement_type: 'sortie_distribution_aliment',
        quantity: derived.quantity,
        movement_date: fieldValue(payload, 'date') || today(),
        target_type: fieldValue(payload, 'target_type'),
        target_id: fieldValue(payload, 'target_id'),
        metadata: {
          business_event_id: eventId,
          business_event_row_id: businessEvent.id,
          stock_after_distribution: derived.stock_after_distribution,
        },
      },
    });
    if (derived.stock_insufficient) {
      operations.push({
        type: 'alert.create',
        table: 'alertes_center',
        payload: buildAlert({
          eventId,
          workflow,
          payload,
          title: 'Distribution aliment supérieure au stock disponible',
          message: 'La quantité distribuée dépasse le stock disponible selon les données ERP.',
          severity: 'haute',
          linkedId: businessEvent.id,
        }),
      });
    }
  }

  workflow.nextSteps.slice(0, 2).forEach((step) => {
    if (['biosecurity_cleaning'].includes(eventId)) return;
    operations.push({
      type: 'task.suggest',
      table: 'taches',
      payload: buildTask({ eventId, workflow, payload, label: step, linkedId: businessEvent.id }),
    });
  });

  return {
    ok: true,
    eventId,
    workflow,
    validation,
    derived,
    businessEvent,
    operations,
    impactedModules: workflow.impactedModules,
    refreshKeys: [...new Set([...workflow.sourceTables, 'business_events', 'alertes_center', 'taches', 'audit_logs'])],
  };
}

export function buildBusinessEventCoverageAudit() {
  const workflows = listBusinessEventWorkflows();
  const missing = workflows.filter((workflow) => (
    !workflow.id
    || !workflow.sourceModule
    || !arr(workflow.sourceTables).length
    || !arr(workflow.impactedModules).length
    || !arr(workflow.requiredFields).length
    || !arr(workflow.automaticEffects).length
    || !arr(workflow.metricsImpacted).length
    || !arr(workflow.coherenceRules).length
    || !arr(workflow.nextSteps).length
  ));
  return {
    ok: missing.length === 0 && workflows.length === BUSINESS_EVENT_IDS.length,
    total: workflows.length,
    ids: workflows.map((workflow) => workflow.id),
    missing,
  };
}

export async function commitBusinessEventAutomationPlan(plan = {}, handlers = {}) {
  if (!plan?.ok) throw new Error(plan?.errors?.[0] || 'Plan événement métier invalide.');
  const results = [];
  for (const operation of plan.operations || []) {
    const payload = operation.payload;
    if (operation.type === 'business_event.create' && handlers.onCreateBusinessEvent) {
      results.push({ operation, result: await handlers.onCreateBusinessEvent(payload) });
    } else if (operation.type === 'stock.create' && handlers.onCreateStock) {
      results.push({ operation, result: await handlers.onCreateStock(payload) });
    } else if (operation.type === 'stock_movement.create' && handlers.onCreateStockMovement) {
      results.push({ operation, result: await handlers.onCreateStockMovement(payload) });
    } else if ((operation.type === 'task.create' || operation.type === 'task.suggest') && handlers.onCreateTask) {
      results.push({ operation, result: await handlers.onCreateTask(payload) });
    } else if (operation.type === 'alert.create' && handlers.onCreateAlert) {
      results.push({ operation, result: await handlers.onCreateAlert(payload) });
    } else if (operation.type === 'finance.create' && handlers.onCreateFinanceTransaction) {
      results.push({ operation, result: await handlers.onCreateFinanceTransaction(payload) });
    } else {
      results.push({ operation, skipped: true });
    }
  }
  return results;
}
