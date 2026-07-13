import { makeId } from './ids.js';
import { applyStockMovement } from './stockWorkflows.js';
import { getFinanceActivityFromSale, getFinanceCategoryFromSale } from '../services/financeSyncService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const toNumber = (value) => Number(value || 0) || 0;
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.cout ?? row.coût ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const saleIdOf = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
const isOut = (row = {}) => ['sortie', 'expense', 'out', 'charge', 'depense', 'dépense'].includes(lower(row.type));


export const GUIDED_REPAIR_SCENARIOS = {
  STOCKABLE_EXPENSE_NO_STOCK: 'stockable_expense_no_stock',
  PAID_SALE_NO_FINANCE: 'paid_sale_no_finance',
  ORPHAN_DOCUMENT: 'orphan_document',
  FEEDING_NO_STOCK_EXIT: 'feeding_no_stock_exit',
  ALERT_COMPLETED_TASK: 'alert_completed_task',
  ORPHAN_TELEMETRY: 'orphan_telemetry',
};

const ACTION_CATALOG = {
  [GUIDED_REPAIR_SCENARIOS.STOCKABLE_EXPENSE_NO_STOCK]: [
    { id: 'create_stock_entry', label: 'Créer entrée stock' },
    { id: 'link_stock_entry', label: 'Lier entrée existante' },
    { id: 'mark_non_stockable', label: 'Marquer non stockable' },
  ],
  [GUIDED_REPAIR_SCENARIOS.PAID_SALE_NO_FINANCE]: [
    { id: 'create_finance_receipt', label: 'Créer recette finance' },
    { id: 'link_finance_transaction', label: 'Lier transaction existante' },
    { id: 'mark_outside_erp', label: 'Marquer hors ERP' },
  ],
  [GUIDED_REPAIR_SCENARIOS.ORPHAN_DOCUMENT]: [
    { id: 'link_expense', label: 'Lier à dépense' },
    { id: 'link_sale_payment', label: 'Lier à vente/paiement' },
    { id: 'mark_administrative', label: 'Marquer administratif' },
  ],
  [GUIDED_REPAIR_SCENARIOS.FEEDING_NO_STOCK_EXIT]: [
    { id: 'create_stock_exit', label: 'Créer sortie stock' },
    { id: 'link_stock_exit', label: 'Lier sortie existante' },
    { id: 'mark_external_stock', label: 'Marquer stock externe' },
  ],
  [GUIDED_REPAIR_SCENARIOS.ALERT_COMPLETED_TASK]: [
    { id: 'resolve_alert', label: 'Résoudre alerte' },
    { id: 'reopen_task', label: 'Rouvrir tâche' },
    { id: 'mark_manual_followup', label: 'Marquer suivi manuel' },
  ],
  [GUIDED_REPAIR_SCENARIOS.ORPHAN_TELEMETRY]: [
    { id: 'link_existing_device', label: 'Lier objet existant' },
    { id: 'create_device_from_event', label: 'Créer objet depuis événement' },
    { id: 'mark_gateway_event', label: 'Marquer passerelle externe' },
  ],
};

export function classifySyncIssue(issue = {}) {
  if (issue.scenario && ACTION_CATALOG[issue.scenario]) return issue.scenario;
  const module = issue.module || '';
  const message = lower(issue.message || '');
  if (module === 'finances' && (message.includes('entrée stock') || message.includes('entree stock') || message.includes('stockable'))) {
    return GUIDED_REPAIR_SCENARIOS.STOCKABLE_EXPENSE_NO_STOCK;
  }
  if (module === 'payments' && (message.includes('finances') || message.includes('encaissement'))) {
    return GUIDED_REPAIR_SCENARIOS.PAID_SALE_NO_FINANCE;
  }
  if (module === 'documents' && (message.includes('orphelin') || message.includes('introuvable') || message.includes('n’existe plus') || message.includes("n'existe plus") || message.includes('aucune dépense') || message.includes('aucune depense'))) {
    return GUIDED_REPAIR_SCENARIOS.ORPHAN_DOCUMENT;
  }
  if (module === 'alimentation_logs' && message.includes('sortie stock')) {
    return GUIDED_REPAIR_SCENARIOS.FEEDING_NO_STOCK_EXIT;
  }
  if (module === 'alertes_center' && (message.includes('tâche terminée') || message.includes('tache terminee') || (message.includes('tâche') && message.includes('terminée')) || (message.includes('tache') && message.includes('terminee')))) {
    return GUIDED_REPAIR_SCENARIOS.ALERT_COMPLETED_TASK;
  }
  if (module === 'smartfarm_events' && (message.includes('introuvable') || message.includes('aucun objet') || message.includes('aucune objet'))) {
    return GUIDED_REPAIR_SCENARIOS.ORPHAN_TELEMETRY;
  }
  return null;
}

function actionAvailable(actionId, issue, props = {}) {
  const dataMap = props.dataMap || {};
  switch (actionId) {
    case 'create_stock_entry':
      return Boolean(props.onCreateStock || props.onUpdateStock);
    case 'link_stock_entry':
      return Boolean(props.onUpdateFinanceTransaction) && arr(dataMap.stock).length > 0;
    case 'mark_non_stockable':
      return Boolean(props.onUpdateFinanceTransaction);
    case 'create_finance_receipt':
      return Boolean(props.onCreateFinanceTransaction);
    case 'link_finance_transaction':
      return Boolean(props.onUpdateFinanceTransaction) && arr(dataMap.finances).length > 0;
    case 'mark_outside_erp':
      return Boolean(props.onUpdatePayment || props.onCreateBusinessEvent);
    case 'link_expense':
      return Boolean(props.onUpdateDocument) && arr(dataMap.finances).some(isOut);
    case 'link_sale_payment':
      return Boolean(props.onUpdateDocument) && (arr(dataMap.payments).length > 0 || arr(dataMap.sales_orders).length > 0);
    case 'mark_administrative':
      return Boolean(props.onUpdateDocument);
    case 'create_stock_exit':
      return Boolean(props.onUpdateStock);
    case 'link_stock_exit':
      return Boolean(props.onUpdateAlimentation) && arr(dataMap.business_events).length > 0;
    case 'mark_external_stock':
      return Boolean(props.onUpdateAlimentation);
    case 'resolve_alert':
      return Boolean(props.onUpdateAlert);
    case 'reopen_task':
      return Boolean(props.onUpdateTask);
    case 'mark_manual_followup':
      return Boolean(props.onUpdateAlert);
    case 'link_existing_device':
      return Boolean(props.onUpdateSmartfarmEvent) && (arr(dataMap.sensor_devices).length > 0 || arr(dataMap.camera_devices).length > 0);
    case 'create_device_from_event':
      return Boolean(props.onCreateSensor || props.onCreateCamera) && Boolean(props.onUpdateSmartfarmEvent);
    case 'mark_gateway_event':
      return Boolean(props.onUpdateSmartfarmEvent);
    default:
      return false;
  }
}

export function getGuidedRepairActions(issue = {}, props = {}) {
  const scenario = classifySyncIssue(issue);
  if (!scenario) return [];
  return arr(ACTION_CATALOG[scenario])
    .slice(0, 3)
    .map((action) => ({ ...action, available: actionAvailable(action.id, issue, props) }))
    .filter((action) => action.available);
}

function findFinance(dataMap, id) {
  return arr(dataMap.finances).find((row) => clean(row.id) === clean(id));
}

function findPayment(dataMap, id) {
  return arr(dataMap.payments).find((row) => clean(row.id) === clean(id));
}

function findOrder(dataMap, id) {
  return arr(dataMap.sales_orders).find((row) => clean(row.id) === clean(id));
}

function findDocument(dataMap, id) {
  return arr(dataMap.documents).find((row) => clean(row.id) === clean(id));
}

function findAlimentation(dataMap, id) {
  return arr(dataMap.alimentation_logs).find((row) => clean(row.id) === clean(id));
}

function findAlert(dataMap, id) {
  return arr(dataMap.alertes_center).find((row) => clean(row.id) === clean(id));
}

function findTask(dataMap, id) {
  return arr(dataMap.taches).find((row) => clean(row.id) === clean(id));
}

function findSmartfarmEvent(dataMap, id) {
  return arr(dataMap.smartfarm_events).find((row) => clean(row.id) === clean(id));
}

function buildFinanceFromPayment(payment, order) {
  const amount = paymentAmount(payment);
  const date = payment.date_paiement || payment.date || today();
  return {
    id: makeId('TRX'),
    type: 'entree',
    libelle: `Encaissement ${order?.product_name || order?.libelle || order?.id || payment.order_id || 'vente'}`,
    montant: amount,
    amount,
    date,
    categorie: getFinanceCategoryFromSale(order || {}),
    activite: getFinanceActivityFromSale(order || {}),
    module_lie: 'ventes',
    source_module: 'ventes',
    related_id: order?.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    source_record_id: order?.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    order_id: order?.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    sale_id: order?.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    payment_id: payment.id,
    client_id: order?.client_id || payment.client_id || '',
    statut: 'paye',
    moyen_paiement: payment.moyen_paiement || payment.mode_paiement || '',
    notes: `Recette créée depuis réparation guidée · paiement ${payment.id}`,
    created_at: now(),
  };
}

export async function executeGuidedRepairAction(issue = {}, actionId = '', props = {}) {
  const dataMap = props.dataMap || {};
  const scenario = classifySyncIssue(issue);
  if (!scenario) throw new Error('Aucune réparation guidée disponible');

  if (scenario === GUIDED_REPAIR_SCENARIOS.PAID_SALE_NO_FINANCE) {
    const payment = findPayment(dataMap, issue.row_id);
    if (!payment) throw new Error('Paiement introuvable');
    const order = findOrder(dataMap, issue.linked_id || saleIdOf(payment)) || {};
    if (actionId === 'create_finance_receipt') {
      await props.onCreateFinanceTransaction?.(buildFinanceFromPayment(payment, order));
      await props.onRefreshFinances?.();
      return 'Recette finance créée';
    }
    if (actionId === 'link_finance_transaction') {
      const candidate = arr(dataMap.finances).find((trx) => isOut(trx) === false
        && clean(trx.order_id || trx.sale_id || trx.related_id) === clean(order.id || saleIdOf(payment))
        && Math.abs(amountOf(trx) - paymentAmount(payment)) < 1);
      const trx = candidate || arr(dataMap.finances).find((trx) => Math.abs(amountOf(trx) - paymentAmount(payment)) < 1);
      if (!trx?.id) throw new Error('Aucune transaction compatible trouvée');
      await props.onUpdateFinanceTransaction?.(trx.id, {
        payment_id: payment.id,
        order_id: order.id || saleIdOf(payment),
        sale_id: order.id || saleIdOf(payment),
        related_id: order.id || saleIdOf(payment),
        source_record_id: order.id || saleIdOf(payment),
        module_lie: trx.module_lie || 'ventes',
        notes: `${trx.notes || ''} · Lié au paiement ${payment.id}`.trim(),
      });
      await props.onRefreshFinances?.();
      return 'Transaction liée au paiement';
    }
    if (actionId === 'mark_outside_erp') {
      if (props.onUpdatePayment) {
        await props.onUpdatePayment(payment.id, {
          hors_erp: true,
          sync_excluded: true,
          notes: `${payment.notes || ''} · Paiement hors ERP (réparation guidée)`.trim(),
        });
        await props.onRefreshPayments?.();
      } else {
        await props.onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'paiement_hors_erp',
          module_source: 'sync_activity',
          entity_type: 'payment',
          entity_id: payment.id,
          title: 'Paiement marqué hors ERP',
          description: `Paiement ${payment.id} exclu de la synchronisation finance.`,
          event_date: today(),
          severity: 'info',
        });
      }
      return 'Paiement marqué hors ERP';
    }
  }

  if (scenario === GUIDED_REPAIR_SCENARIOS.ORPHAN_DOCUMENT) {
    const document = findDocument(dataMap, issue.row_id);
    if (!document) throw new Error('Document introuvable');
    if (actionId === 'link_expense') {
      const expense = arr(dataMap.finances).find(isOut);
      if (!expense?.id) throw new Error('Aucune dépense disponible');
      await props.onUpdateDocument?.(document.id, {
        entity_type: 'transaction',
        entity_id: expense.id,
        transaction_id: expense.id,
        finance_id: expense.id,
        related_id: expense.id,
        module_lie: 'finances',
        notes: `${document.notes || ''} · Lié à la dépense ${expense.id}`.trim(),
      });
      await props.onRefreshDocuments?.();
      return 'Document lié à une dépense';
    }
    if (actionId === 'link_sale_payment') {
      const payment = arr(dataMap.payments)[0];
      const order = payment ? findOrder(dataMap, saleIdOf(payment)) : arr(dataMap.sales_orders)[0];
      const target = payment || order;
      if (!target?.id) throw new Error('Aucune vente ou paiement disponible');
      await props.onUpdateDocument?.(document.id, {
        entity_type: payment ? 'payment' : 'sales_order',
        entity_id: target.id,
        order_id: order?.id || (payment ? saleIdOf(payment) : target.id),
        payment_id: payment?.id || '',
        related_id: target.id,
        module_lie: 'ventes',
        notes: `${document.notes || ''} · Lié à ${payment ? 'paiement' : 'vente'} ${target.id}`.trim(),
      });
      await props.onRefreshDocuments?.();
      return 'Document lié à une vente/paiement';
    }
    if (actionId === 'mark_administrative') {
      await props.onUpdateDocument?.(document.id, {
        document_category: 'administratif',
        administrative_only: true,
        entity_type: 'administratif',
        entity_id: document.id,
        module_lie: 'documents',
        notes: `${document.notes || ''} · Document administratif`.trim(),
      });
      await props.onRefreshDocuments?.();
      return 'Document marqué administratif';
    }
  }

  if (scenario === GUIDED_REPAIR_SCENARIOS.STOCKABLE_EXPENSE_NO_STOCK) {
    const expense = findFinance(dataMap, issue.row_id);
    if (!expense) throw new Error('Dépense introuvable');
    if (actionId === 'create_stock_entry') {
      const qty = toNumber(expense.quantite || expense.quantity) || 1;
      const unitPrice = qty > 0 ? amountOf(expense) / qty : amountOf(expense);
      const productName = expense.libelle || expense.categorie || 'Produit stock';
      const existing = arr(dataMap.stock).find((row) => lower(row.produit || row.nom || '') === lower(productName));
      if (existing?.id && props.onUpdateStock) {
        const movement = applyStockMovement(existing, { type: 'entree', qty, motif: `Achat ${expense.id}`, date: expense.date || today() });
        await props.onUpdateStock(existing.id, { ...movement.stock, source_finance_id: expense.id, linked_finance_id: expense.id });
        await props.onUpdateFinanceTransaction?.(expense.id, { stock_id: existing.id, linked_stock_id: existing.id });
        await props.onRefreshStock?.();
        await props.onRefreshFinances?.();
        return 'Entrée stock enregistrée';
      }
      const stockId = makeId('STK');
      await props.onCreateStock?.({
        id: stockId,
        produit: productName,
        nom: productName,
        quantite: qty,
        quantity: qty,
        unite: expense.unite || 'unité',
        prixUnit: unitPrice,
        prixunit: unitPrice,
        source_finance_id: expense.id,
        linked_finance_id: expense.id,
        last_movement_type: 'entree',
        last_movement_label: `Achat ${expense.id}`,
        last_movement_qty: qty,
        date_entree: expense.date || today(),
        notes: `Entrée créée depuis dépense ${expense.id}`,
      });
      await props.onUpdateFinanceTransaction?.(expense.id, { stock_id: stockId, linked_stock_id: stockId });
      await props.onRefreshStock?.();
      await props.onRefreshFinances?.();
      return 'Entrée stock créée';
    }
    if (actionId === 'link_stock_entry') {
      const stock = arr(dataMap.stock)[0];
      if (!stock?.id) throw new Error('Aucune entrée stock disponible');
      await props.onUpdateFinanceTransaction?.(expense.id, { stock_id: stock.id, linked_stock_id: stock.id, notes: `${expense.notes || ''} · Lié au stock ${stock.id}`.trim() });
      await props.onRefreshFinances?.();
      return 'Dépense liée à une entrée stock';
    }
    if (actionId === 'mark_non_stockable') {
      await props.onUpdateFinanceTransaction?.(expense.id, {
        stockable: false,
        charge_type: 'non_stockable',
        hors_stock: true,
        notes: `${expense.notes || ''} · Charge non stockable`.trim(),
      });
      await props.onRefreshFinances?.();
      return 'Dépense marquée non stockable';
    }
  }

  if (scenario === GUIDED_REPAIR_SCENARIOS.FEEDING_NO_STOCK_EXIT) {
    const log = findAlimentation(dataMap, issue.row_id);
    if (!log) throw new Error('Alimentation introuvable');
    const stockId = clean(issue.linked_id || log.stock_id || log.produit_stock_id);
    const stock = arr(dataMap.stock).find((row) => clean(row.id) === stockId);
    const qty = toNumber(log.quantite ?? log.quantity ?? log.qty) || 1;
    if (actionId === 'create_stock_exit') {
      if (!stock?.id) throw new Error('Stock introuvable');
      const movement = applyStockMovement(stock, { type: 'sortie', qty, motif: `Alimentation ${log.id}`, date: log.date || today() });
      await props.onUpdateStock?.(stock.id, { ...movement.stock, last_movement_label: `Alimentation ${log.id}` });
      await props.onUpdateAlimentation?.(log.id, { stock_movement_done: true, linked_stock_exit_id: stock.id });
      await props.onCreateBusinessEvent?.({
        id: makeId('EVT'),
        event_type: 'sortie_stock',
        module_source: 'alimentation',
        entity_type: 'stock',
        entity_id: stock.id,
        related_id: log.id,
        source_record_id: log.id,
        linked_stock_id: stock.id,
        title: `Sortie stock alimentation ${log.id}`,
        description: `${qty} ${stock.unite || ''}`.trim(),
        event_date: log.date || today(),
        severity: 'info',
        quantity: qty,
      });
      await props.onRefreshStock?.();
      await props.onRefreshAlimentation?.();
      await props.onRefreshBusinessEvents?.();
      return 'Sortie stock enregistrée';
    }
    if (actionId === 'link_stock_exit') {
      const event = arr(dataMap.business_events).find((row) => lower(row.event_type) === 'sortie_stock' && clean(row.linked_stock_id || row.entity_id) === stockId);
      if (!event?.id) throw new Error('Aucune sortie stock compatible');
      await props.onUpdateAlimentation?.(log.id, {
        linked_stock_exit_id: event.id,
        stock_movement_done: true,
        notes: `${log.notes || ''} · Lié à sortie ${event.id}`.trim(),
      });
      await props.onRefreshAlimentation?.();
      return 'Alimentation liée à une sortie existante';
    }
    if (actionId === 'mark_external_stock') {
      await props.onUpdateAlimentation?.(log.id, {
        stock_externe: true,
        external_stock: true,
        notes: `${log.notes || ''} · Stock externe`.trim(),
      });
      await props.onRefreshAlimentation?.();
      return 'Alimentation marquée stock externe';
    }
  }

  if (scenario === GUIDED_REPAIR_SCENARIOS.ALERT_COMPLETED_TASK) {
    const alert = findAlert(dataMap, issue.row_id);
    if (!alert) throw new Error('Alerte introuvable');
    const task = findTask(dataMap, issue.linked_id) || arr(dataMap.taches).find((row) => clean(row.alert_id) === clean(alert.id));
    if (actionId === 'resolve_alert') {
      await props.onUpdateAlert?.(alert.id, {
        status: 'traitee',
        statut: 'traitee',
        resolved_at: now(),
        action_recommandee: 'Alerte résolue depuis réparation guidée.',
      });
      await props.onRefreshAlertes?.();
      return 'Alerte résolue';
    }
    if (actionId === 'reopen_task') {
      if (!task?.id) throw new Error('Tâche introuvable');
      await props.onUpdateTask?.(task.id, {
        status: 'a_faire',
        statut: 'a_faire',
        completed_at: '',
        notes: `${task.notes || ''} · Rouverte depuis alerte ${alert.id}`.trim(),
      });
      await props.onRefreshTasks?.();
      return 'Tâche rouverte';
    }
    if (actionId === 'mark_manual_followup') {
      await props.onUpdateAlert?.(alert.id, {
        suivi_manuel: true,
        manual_followup: true,
        action_recommandee: 'Suivi manuel confirmé - ne pas recréer automatiquement de tâche.',
        notes: `${alert.notes || alert.message || ''} · Suivi manuel`.trim(),
      });
      await props.onRefreshAlertes?.();
      return 'Suivi manuel enregistré';
    }
  }

  if (scenario === GUIDED_REPAIR_SCENARIOS.ORPHAN_TELEMETRY) {
    const event = findSmartfarmEvent(dataMap, issue.row_id);
    if (!event) throw new Error('Événement IoT introuvable');
    const sensors = arr(dataMap.sensor_devices);
    const cameras = arr(dataMap.camera_devices);
    if (actionId === 'link_existing_device') {
      const device = sensors[0] || cameras[0];
      if (!device?.id) throw new Error('Aucun objet connecté disponible');
      await props.onUpdateSmartfarmEvent?.(event.id, {
        device_id: device.id,
        device_type: sensors[0] ? 'sensor' : 'camera',
        notes: `${event.notes || ''} · Lié à ${device.id}`.trim(),
      });
      await props.onRefreshSmartfarmEvents?.();
      return 'Événement lié à un objet existant';
    }
    if (actionId === 'create_device_from_event') {
      const deviceId = clean(event.device_id || issue.linked_id) || makeId('SENS');
      const isCamera = lower(event.device_type || '').includes('cam') || lower(event.event_type || '').includes('intrusion');
      if (isCamera && props.onCreateCamera) {
        await props.onCreateCamera?.({
          id: deviceId,
          name: event.message || `Caméra ${deviceId}`,
          zone: event.zone || 'terrain',
          type: event.event_type || 'IP',
          status: 'online',
          source_type: 'reel',
          module_lie: 'smartfarm',
          notes: `Créée depuis événement ${event.id}`,
        });
        await props.onRefreshCameras?.();
      } else {
        await props.onCreateSensor?.({
          id: deviceId,
          name: event.message || `Capteur ${deviceId}`,
          type: event.event_type || 'temperature',
          zone: event.zone || 'terrain',
          status: 'online',
          source_type: 'reel',
          module_lie: 'smartfarm',
          value: event.event_value,
          notes: `Créé depuis événement ${event.id}`,
        });
        await props.onRefreshSensors?.();
      }
      await props.onUpdateSmartfarmEvent?.(event.id, {
        device_id: deviceId,
        device_type: isCamera ? 'camera' : 'sensor',
        handled: true,
        handled_at: now(),
      });
      await props.onRefreshSmartfarmEvents?.();
      return 'Objet créé depuis l’événement IoT';
    }
    if (actionId === 'mark_gateway_event') {
      await props.onUpdateSmartfarmEvent?.(event.id, {
        handled: true,
        handled_at: now(),
        external_gateway: true,
        notes: `${event.notes || event.message || ''} · Passerelle externe (sans device local)`.trim(),
      });
      await props.onRefreshSmartfarmEvents?.();
      return 'Événement marqué passerelle externe';
    }
  }

  throw new Error('Action de réparation inconnue');
}
