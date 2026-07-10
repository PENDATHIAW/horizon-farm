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
  date: ['date', 'event_date', 'created_at', 'timestamp', 'start_date', 'production_date', 'order_date'],
  timestamp: ['timestamp', 'date', 'created_at', 'event_date'],
  source_id: ['source_id', 'origin_id', 'building_id', 'lot_id', 'animal_id', 'stock_id'],
  supplier_id: ['supplier_id', 'fournisseur_id', 'vendor_id'],
  product_id: ['product_id', 'stock_id', 'feed_stock_id', 'raw_material_id', 'produit_id'],
  target_type: ['target_type', 'entity_type', 'cible_type'],
  target_id: ['target_id', 'lot_id', 'animal_id', 'building_id', 'entity_id'],
  lot_id: ['lot_id', 'avicole_id', 'batch_id'],
  animal_id: ['animal_id', 'bovin_id', 'cattle_id'],
  stock_id: ['stock_id', 'product_id', 'feed_stock_id', 'parcel_or_stock_id'],
  feed_stock_id: ['feed_stock_id', 'stock_id', 'product_id'],
  building_id: ['building_id', 'box_id', 'poulailler_id', 'batiment_id', 'bâtiment_id'],
  parcel_id: ['parcel_id', 'parcelle_id', 'destination_parcel_id'],
  destination_parcel_id: ['destination_parcel_id', 'parcel_id', 'parcelle_id'],
  parcel_or_stock_id: ['parcel_or_stock_id', 'parcel_id', 'parcelle_id', 'stock_id'],
  crop_type: ['crop_type', 'culture_type', 'produit', 'product_name'],
  weight_or_unit_price: ['weight_or_unit_price', 'unit_price', 'price_per_kg', 'sale_price', 'weight_kg'],
  water_volume_or_duration: ['water_volume_or_duration', 'water_volume', 'volume_liters', 'volume_m3', 'duration_minutes'],
  linked_entity: ['linked_entity', 'linked_entity_id', 'entity_id', 'related_id'],
  amount: ['amount', 'montant', 'paid_amount', 'montant_paye'],
  quantity: ['quantity', 'quantite', 'quantity_kg', 'quantity_trays', 'quantity_used', 'planned_quantity'],
  unit_cost: ['unit_cost', 'cout_unitaire', 'cost_per_unit', 'price_per_kg'],
  unit_price: ['unit_price', 'prix_unitaire', 'price_per_kg', 'sale_price', 'weight_or_unit_price'],
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

function eventDate(payload = {}) {
  return clean(fieldValue(payload, 'date') || fieldValue(payload, 'timestamp') || today()).slice(0, 10);
}

function linkedId(payload = {}) {
  return fieldValue(payload, 'linked_entity')
    || fieldValue(payload, 'target_id')
    || fieldValue(payload, 'lot_id')
    || fieldValue(payload, 'animal_id')
    || fieldValue(payload, 'parcel_id')
    || fieldValue(payload, 'stock_id')
    || fieldValue(payload, 'building_id')
    || null;
}

function op(type, table, payload) {
  return { type, table, payload };
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
  const quantity = toNumber(fieldValue(payload, 'quantity'));
  const unitCost = toNumber(fieldValue(payload, 'unit_cost'));
  const unitPrice = toNumber(fieldValue(payload, 'unit_price'));
  const amount = toNumber(fieldValue(payload, 'amount')) || (quantity > 0 && unitPrice > 0 ? quantity * unitPrice : 0);

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
    const amountPaid = toNumber(fieldValue(payload, 'amount'));
    return {
      ...derived,
      amount_paid: amountPaid,
      remaining_after: remainingBefore > 0 ? Math.max(0, remainingBefore - amountPaid) : undefined,
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

  if (['egg_sale', 'broiler_sale', 'bovine_sale', 'crop_sale'].includes(eventId)) {
    const paymentStatus = norm(fieldValue(payload, 'payment_status'));
    const paid = paymentStatus.includes('paye') || paymentStatus.includes('payé')
      ? amount
      : toNumber(payload.paid_amount ?? payload.montant_paye);
    return {
      ...derived,
      paid_amount: Math.min(amount, Math.max(0, paid)),
      remaining_amount: Math.max(0, amount - Math.min(amount, Math.max(0, paid))),
    };
  }

  return derived;
}

function buildEventTitle(workflow = {}, payload = {}) {
  return `${workflow.label} — ${eventDate(payload)}`;
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
  return {
    id: clean(payload.id) || makeId('EVT'),
    event_type: eventId,
    module_source: workflow.sourceModule,
    entity_type: clean(payload.entity_type || payload.target_type || payload.linked_entity_type || ''),
    entity_id: clean(payload.entity_id || linkedId(payload) || ''),
    title: clean(payload.title) || buildEventTitle(workflow, payload),
    description: clean(payload.description) || buildEventDescription(workflow, payload, derived),
    event_date: eventDate(payload),
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

function buildTask({ eventId, workflow, payload, label, priority = 'normale', dueDate, linkedId: id }) {
  return {
    id: makeId('TASK'),
    title: label,
    description: `${workflow.label} — action générée automatiquement`,
    module_source: workflow.sourceModule,
    linked_event_type: eventId,
    linked_entity_id: id || linkedId(payload),
    priority,
    status: 'a_faire',
    due_date: dueDate || fieldValue(payload, 'next_due_date') || eventDate(payload),
    metadata: {
      business_event_id: eventId,
      created_from: 'business_event_automation_service',
    },
  };
}

function buildAlert({ eventId, workflow, payload, title, message, severity = 'moyenne', linkedId: id }) {
  return {
    id: makeId('ALERT'),
    title,
    message,
    severity,
    module_source: workflow.sourceModule,
    entity_id: id || linkedId(payload),
    status: 'open',
    metadata: {
      business_event_id: eventId,
      created_from: 'business_event_automation_service',
    },
  };
}

function buildFinanceTransaction({ eventId, workflow, payload, derived, type = 'depense', label }) {
  const amount = toNumber(derived.amount || fieldValue(payload, 'amount'));
  if (amount <= 0) return null;
  return {
    id: makeId('FIN'),
    date: eventDate(payload),
    type,
    categorie: eventId,
    libelle: label || workflow.label,
    montant: amount,
    source_type: 'business_event',
    source_id: payload.id || null,
    metadata: {
      business_event_id: eventId,
      created_from: 'business_event_automation_service',
    },
  };
}

function buildStockMovement({ eventId, payload, derived, stockId, movementType, quantity, targetType, targetId }) {
  return {
    id: makeId('STKMVT'),
    stock_id: stockId || fieldValue(payload, 'stock_id'),
    movement_type: movementType,
    quantity: toNumber(quantity ?? derived.quantity),
    movement_date: eventDate(payload),
    target_type: targetType || fieldValue(payload, 'target_type') || fieldValue(payload, 'entity_type'),
    target_id: targetId || linkedId(payload),
    metadata: {
      business_event_id: eventId,
      created_from: 'business_event_automation_service',
    },
  };
}

function addPaymentOperations(operations, { eventId, workflow, payload, derived, orderId }) {
  const amount = toNumber(derived.paid_amount ?? derived.amount ?? fieldValue(payload, 'amount'));
  if (amount <= 0) return;
  operations.push(op('payment.create', 'payments', {
    id: makeId('PAY'),
    order_id: orderId || fieldValue(payload, 'sales_order_id'),
    client_id: fieldValue(payload, 'client_id'),
    montant: amount,
    payment_method: fieldValue(payload, 'payment_method') || 'non_precise',
    date_paiement: eventDate(payload),
    status: 'valide',
    metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
  }));
  const trx = buildFinanceTransaction({ eventId, workflow, payload: { ...payload, amount }, derived: { ...derived, amount }, type: 'recette', label: `Encaissement — ${workflow.label}` });
  if (trx) operations.push(op('finance.create', 'finances', trx));
}

function addSaleOperations(operations, { eventId, workflow, payload, derived }) {
  const orderId = fieldValue(payload, 'sales_order_id') || makeId('CMD');
  const itemId = makeId('CMDI');
  operations.push(op('sales_order.create', 'sales_orders', {
    id: orderId,
    client_id: fieldValue(payload, 'client_id'),
    order_date: eventDate(payload),
    montant_total: derived.amount,
    statut_paiement: derived.remaining_amount > 0 ? (derived.paid_amount > 0 ? 'partiel' : 'non_paye') : 'paye',
    source_type: eventId,
    source_id: linkedId(payload),
    metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
  }));
  operations.push(op('sales_order_item.create', 'sales_order_items', {
    id: itemId,
    order_id: orderId,
    quantity: derived.quantity,
    unit_price: derived.unit_price,
    total: derived.amount,
    stock_id: fieldValue(payload, 'stock_id') || fieldValue(payload, 'parcel_or_stock_id'),
    lot_id: fieldValue(payload, 'lot_id'),
    animal_id: fieldValue(payload, 'animal_id'),
    parcel_id: fieldValue(payload, 'parcel_id') || fieldValue(payload, 'parcel_or_stock_id'),
    product_label: fieldValue(payload, 'crop_type') || workflow.label,
    metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
  }));
  const stockId = fieldValue(payload, 'stock_id') || fieldValue(payload, 'parcel_or_stock_id');
  if (stockId) {
    operations.push(op('stock_movement.create', 'stock_movements', buildStockMovement({
      eventId,
      payload,
      derived,
      stockId,
      movementType: `sortie_${eventId}`,
      quantity: derived.quantity,
      targetType: 'vente',
      targetId: orderId,
    })));
  }
  addPaymentOperations(operations, { eventId, workflow, payload, derived, orderId });
}

function addExtendedOperations(operations, { eventId, workflow, payload, derived, businessEvent, dataMap }) {
  const amount = toNumber(derived.amount || fieldValue(payload, 'amount'));

  if (eventId === 'feed_reception') {
    operations.push(op('stock.create', 'stock', {
      id: fieldValue(payload, 'stock_id') || makeId('STK'),
      produit: fieldValue(payload, 'product_id') || 'Aliment',
      categorie: 'aliment',
      quantite: derived.quantity,
      prixUnit: derived.unit_cost,
      fournisseur_id: fieldValue(payload, 'supplier_id'),
      source_type: 'feed_reception',
      source_id: businessEvent.id,
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
    const trx = buildFinanceTransaction({ eventId, workflow, payload: { ...payload, amount: amount || derived.quantity * derived.unit_cost }, derived: { ...derived, amount: amount || derived.quantity * derived.unit_cost }, type: 'depense', label: 'Achat aliment' });
    if (trx) operations.push(op('finance.create', 'finances', trx));
  }

  if (eventId === 'feed_distribution') {
    operations.push(op('stock_movement.create', 'stock_movements', buildStockMovement({
      eventId,
      payload,
      derived,
      stockId: fieldValue(payload, 'feed_stock_id'),
      movementType: 'sortie_distribution_aliment',
      targetType: fieldValue(payload, 'target_type'),
      targetId: fieldValue(payload, 'target_id'),
    })));
    if (derived.stock_insufficient) {
      operations.push(op('alert.create', 'alertes_center', buildAlert({
        eventId,
        workflow,
        payload,
        title: 'Distribution aliment supérieure au stock disponible',
        message: 'La quantité distribuée dépasse le stock disponible selon les données ERP.',
        severity: 'haute',
        linkedId: businessEvent.id,
      })));
    }
  }

  if (eventId === 'broiler_lot_start') {
    const initialCost = toNumber(fieldValue(payload, 'unit_cost')) * toNumber(fieldValue(payload, 'initial_count'));
    const trx = buildFinanceTransaction({ eventId, workflow, payload: { ...payload, amount: amount || initialCost }, derived: { ...derived, amount: amount || initialCost }, type: 'depense', label: 'Mise en place lot poulets' });
    if (trx) operations.push(op('finance.create', 'finances', trx));
    operations.push(op('task.create', 'taches', buildTask({ eventId, workflow, payload, label: 'Programmer vaccination et première pesée', linkedId: businessEvent.id })));
  }

  if (eventId === 'mortality_record') {
    operations.push(op('alert.create', 'alertes_center', buildAlert({
      eventId,
      workflow,
      payload,
      title: 'Mortalité enregistrée — contrôle requis',
      message: 'L’effectif et la marge du lot doivent être révisés après mortalité.',
      severity: toNumber(fieldValue(payload, 'quantity')) > 0 ? 'moyenne' : 'basse',
      linkedId: fieldValue(payload, 'lot_id'),
    })));
  }

  if (eventId === 'health_treatment') {
    operations.push(op('stock_movement.create', 'stock_movements', buildStockMovement({
      eventId,
      payload,
      derived,
      stockId: fieldValue(payload, 'product_id'),
      movementType: 'sortie_traitement_sanitaire',
      quantity: fieldValue(payload, 'quantity_used'),
      targetType: fieldValue(payload, 'target_type'),
      targetId: fieldValue(payload, 'target_id'),
    })));
    const trx = buildFinanceTransaction({ eventId, workflow, payload, derived, type: 'depense', label: 'Coût sanitaire' });
    if (trx) operations.push(op('finance.create', 'finances', trx));
  }

  if (eventId === 'biosecurity_cleaning') {
    const organicStockId = makeId('STKORG');
    operations.push(op('stock.create', 'stock', {
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
    }));
    operations.push(op('task.create', 'taches', buildTask({
      eventId,
      workflow,
      payload,
      label: `Biosécurité — ${fieldValue(payload, 'next_step')}`,
      priority: derived.crop_destination_blocked ? 'haute' : 'normale',
      linkedId: businessEvent.id,
    })));
    if (derived.crop_destination_blocked) {
      operations.push(op('alert.create', 'alertes_center', buildAlert({
        eventId,
        workflow,
        payload,
        title: 'Matière organique suspecte bloquée',
        message: 'Le statut sanitaire est suspect : la valorisation vers une parcelle doit être bloquée jusqu’à validation.',
        severity: 'haute',
        linkedId: businessEvent.id,
      })));
    }
  }

  if (eventId === 'egg_production') {
    operations.push(op('stock_movement.create', 'stock_movements', buildStockMovement({
      eventId,
      payload,
      derived,
      stockId: fieldValue(payload, 'stock_id') || 'stock_oeufs',
      movementType: 'entree_ponte_jour',
      quantity: fieldValue(payload, 'trays_count') || derived.quantity,
      targetType: 'production_oeufs',
      targetId: fieldValue(payload, 'building_id'),
    })));
  }

  if (['egg_sale', 'broiler_sale', 'bovine_sale', 'crop_sale'].includes(eventId)) {
    addSaleOperations(operations, { eventId, workflow, payload, derived });
  }

  if (eventId === 'bovine_weighing') {
    operations.push(op('animal.update', 'animaux', {
      id: fieldValue(payload, 'animal_id'),
      poids_actuel: fieldValue(payload, 'weight_kg'),
      last_weighing_date: eventDate(payload),
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
  }

  if (eventId === 'crop_campaign_start') {
    operations.push(op('culture.update', 'cultures', {
      id: fieldValue(payload, 'parcel_id'),
      culture_type: fieldValue(payload, 'crop_type'),
      surface: fieldValue(payload, 'surface'),
      planned_harvest_date: fieldValue(payload, 'planned_harvest_date'),
      status: 'active',
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
  }

  if (eventId === 'irrigation_event') {
    const water = toNumber(fieldValue(payload, 'water_volume_or_duration'));
    if (water > 0) {
      operations.push(op('finance.create', 'finances', {
        id: makeId('FIN'),
        date: eventDate(payload),
        type: 'charge_interne',
        categorie: 'irrigation',
        libelle: 'Irrigation parcelle',
        montant: toNumber(payload.cost || payload.cout || 0),
        source_type: 'business_event',
        source_id: businessEvent.id,
        metadata: { business_event_id: eventId, volume_or_duration: water },
      }));
    }
  }

  if (eventId === 'organic_transfer') {
    const sanitaryStatus = norm(fieldValue(payload, 'sanitary_status'));
    operations.push(op('stock_movement.create', 'stock_movements', buildStockMovement({
      eventId,
      payload,
      derived,
      stockId: fieldValue(payload, 'origin_id') || fieldValue(payload, 'stock_id'),
      movementType: 'sortie_matiere_organique_vers_parcelle',
      quantity: fieldValue(payload, 'quantity_kg'),
      targetType: 'parcelle',
      targetId: fieldValue(payload, 'destination_parcel_id'),
    })));
    if (/suspect|contamine|contaminé|maladie|doute/.test(sanitaryStatus)) {
      operations.push(op('alert.create', 'alertes_center', buildAlert({
        eventId,
        workflow,
        payload,
        title: 'Transfert organique à valider',
        message: 'Le statut sanitaire nécessite validation avant fertilisation.',
        severity: 'haute',
        linkedId: businessEvent.id,
      })));
    }
  }

  if (eventId === 'crop_harvest') {
    operations.push(op('stock.create', 'stock', {
      id: makeId('STKREC'),
      produit: fieldValue(payload, 'crop_type') || 'Récolte',
      categorie: 'produit_fini_culture',
      quantite: fieldValue(payload, 'quantity_kg') || derived.quantity,
      unite: 'kg',
      parcel_id: fieldValue(payload, 'parcel_id'),
      source_type: 'crop_harvest',
      source_id: businessEvent.id,
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
  }

  if (eventId === 'client_payment') {
    addPaymentOperations(operations, { eventId, workflow, payload, derived, orderId: fieldValue(payload, 'sales_order_id') });
  }

  if (eventId === 'supplier_payment') {
    const trx = buildFinanceTransaction({ eventId, workflow, payload, derived, type: 'depense', label: 'Paiement fournisseur' });
    if (trx) operations.push(op('finance.create', 'finances', trx));
  }

  if (eventId === 'equipment_purchase') {
    operations.push(op('equipment.create', 'equipements', {
      id: makeId('EQP'),
      name: fieldValue(payload, 'equipment_type'),
      type: fieldValue(payload, 'equipment_type'),
      purchase_date: eventDate(payload),
      supplier_id: fieldValue(payload, 'supplier_id'),
      funding_source: fieldValue(payload, 'funding_source'),
      status: 'actif',
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
    const trx = buildFinanceTransaction({ eventId, workflow, payload, derived, type: 'investissement', label: 'Achat équipement' });
    if (trx) operations.push(op('finance.create', 'finances', trx));
  }

  if (eventId === 'equipment_maintenance') {
    operations.push(op('equipment.update', 'equipements', {
      id: fieldValue(payload, 'equipment_id'),
      status: fieldValue(payload, 'status'),
      last_maintenance_date: eventDate(payload),
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
    const trx = buildFinanceTransaction({ eventId, workflow, payload, derived, type: 'depense', label: 'Maintenance équipement' });
    if (trx) operations.push(op('finance.create', 'finances', trx));
  }

  if (eventId === 'support_document') {
    operations.push(op('document.create', 'documents', {
      id: makeId('DOC'),
      document_type: fieldValue(payload, 'document_type'),
      linked_entity_type: fieldValue(payload, 'linked_entity_type'),
      linked_entity_id: fieldValue(payload, 'linked_entity_id'),
      date: eventDate(payload),
      status: 'a_valider',
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
  }

  if (eventId === 'monthly_financier_report') {
    operations.push(op('report.create', 'rapports', {
      id: makeId('RPT'),
      title: `Rapport financeur — ${fieldValue(payload, 'period')}`,
      period: fieldValue(payload, 'period'),
      generated_by: fieldValue(payload, 'generated_by'),
      data_cutoff_date: fieldValue(payload, 'data_cutoff_date'),
      status: 'draft',
      metadata: { business_event_id: eventId, created_from: 'business_event_automation_service' },
    }));
  }

  if (eventId === 'funding_usage') {
    const trx = buildFinanceTransaction({ eventId, workflow, payload, derived, type: 'utilisation_financement', label: `Utilisation financement — ${fieldValue(payload, 'usage_category')}` });
    if (trx) operations.push(op('finance.create', 'finances', trx));
  }

  if (eventId === 'smartfarm_signal') {
    const status = norm(fieldValue(payload, 'status'));
    if (/anormal|alerte|offline|muet|hs|critique|warning/.test(status)) {
      operations.push(op('alert.create', 'alertes_center', buildAlert({
        eventId,
        workflow,
        payload,
        title: 'Signal Smart Farm à vérifier',
        message: `Signal ${fieldValue(payload, 'signal_type')} : ${fieldValue(payload, 'value')}`,
        severity: /critique|hs/.test(status) ? 'haute' : 'moyenne',
        linkedId: fieldValue(payload, 'device_id'),
      })));
    }
  }

  return operations;
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
  const operations = [op('business_event.create', 'business_events', businessEvent)];

  operations.push(...addExtendedOperations(operations, { eventId, workflow, payload, derived, businessEvent, dataMap }));

  workflow.nextSteps.slice(0, 2).forEach((step) => {
    if (['biosecurity_cleaning'].includes(eventId)) return;
    operations.push(op('task.suggest', 'taches', buildTask({ eventId, workflow, payload, label: step, linkedId: businessEvent.id })));
  });

  const dedupedOperations = operations.filter((operation, index, list) => (
    index === list.findIndex((item) => item.type === operation.type && item.table === operation.table && String(item.payload?.id || '') === String(operation.payload?.id || ''))
  ));

  return {
    ok: true,
    eventId,
    workflow,
    validation,
    derived,
    businessEvent,
    operations: dedupedOperations,
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
    } else if (operation.type === 'stock.update' && handlers.onUpdateStock) {
      results.push({ operation, result: await handlers.onUpdateStock(payload.id, payload) });
    } else if (operation.type === 'stock_movement.create' && handlers.onCreateStockMovement) {
      results.push({ operation, result: await handlers.onCreateStockMovement(payload) });
    } else if ((operation.type === 'task.create' || operation.type === 'task.suggest') && handlers.onCreateTask) {
      results.push({ operation, result: await handlers.onCreateTask(payload) });
    } else if ((operation.type === 'task.update') && handlers.onUpdateTask) {
      results.push({ operation, result: await handlers.onUpdateTask(payload.id, payload) });
    } else if (operation.type === 'alert.create' && handlers.onCreateAlert) {
      results.push({ operation, result: await handlers.onCreateAlert(payload) });
    } else if (operation.type === 'finance.create' && handlers.onCreateFinanceTransaction) {
      results.push({ operation, result: await handlers.onCreateFinanceTransaction(payload) });
    } else if (operation.type === 'sales_order.create' && handlers.onCreateSaleOrder) {
      results.push({ operation, result: await handlers.onCreateSaleOrder(payload) });
    } else if (operation.type === 'sales_order_item.create' && handlers.onCreateSaleOrderItem) {
      results.push({ operation, result: await handlers.onCreateSaleOrderItem(payload) });
    } else if (operation.type === 'payment.create' && handlers.onCreatePayment) {
      results.push({ operation, result: await handlers.onCreatePayment(payload) });
    } else if (operation.type === 'document.create' && handlers.onCreateDocument) {
      results.push({ operation, result: await handlers.onCreateDocument(payload) });
    } else if (operation.type === 'report.create' && handlers.onCreateReport) {
      results.push({ operation, result: await handlers.onCreateReport(payload) });
    } else if (operation.type === 'equipment.create' && handlers.onCreateEquipment) {
      results.push({ operation, result: await handlers.onCreateEquipment(payload) });
    } else if (operation.type === 'equipment.update' && handlers.onUpdateEquipment) {
      results.push({ operation, result: await handlers.onUpdateEquipment(payload.id, payload) });
    } else if (operation.type === 'animal.update' && handlers.onUpdateAnimal) {
      results.push({ operation, result: await handlers.onUpdateAnimal(payload.id, payload) });
    } else if (operation.type === 'culture.update' && handlers.onUpdateCulture) {
      results.push({ operation, result: await handlers.onUpdateCulture(payload.id, payload) });
    } else {
      results.push({ operation, skipped: true });
    }
  }
  return results;
}
