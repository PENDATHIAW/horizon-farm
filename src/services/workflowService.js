import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { getFinanceActivityFromSale, getFinanceCategoryFromSale } from './financeSyncService';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const getAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const getPaid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const paymentStatusOf = (amount, paid) => {
  if (amount > 0 && paid >= amount) return 'paye';
  if (paid > 0) return 'partiel';
  return 'non_paye';
};
const orderStatusAfterPayment = (order = {}, amount = 0, paid = 0) => {
  const current = String(order.statut_commande || order.status || '').toLowerCase();
  const delivery = String(order.statut_livraison || order.delivery_status || '').toLowerCase();
  if (current === 'annule') return 'annule';
  if (delivery === 'livre' || current === 'livre') return 'livre';
  if (paid > 0) return 'confirme';
  if (amount > 0) return current && current !== 'brouillon' ? current : 'enregistree';
  return current || 'brouillon';
};

export const fieldAuto = ({ value, source, previousAuto, confidence = 0.8 }) => ({
  auto_value: value,
  final_value: value,
  manual_override: false,
  auto_source: source,
  auto_confidence: confidence,
  last_auto_value: previousAuto ?? value,
  calculated_at: now(),
});

export const finalValue = (field) => field?.manual_override ? field.final_value : field?.final_value ?? field?.auto_value;

const safeId = (prefix, existing) => {
  let id = makeId(prefix);
  const used = new Set(arr(existing).map((r) => String(r.id)));
  while (used.has(id)) id = makeId(prefix);
  return id;
};

const workflowMeta = ({ type, actions = [], saisiesUtilisateur = 1, extra = {} }) => ({
  prepared_at: now(),
  workflow_type: type,
  saisies_utilisateur: saisiesUtilisateur,
  actions_erp: actions.length,
  saisies_evitees: Math.max(0, actions.length - saisiesUtilisateur),
  ...extra,
});

export function applyManualOverride(preview, path, value) {
  const next = structuredClone(preview);
  const parts = path.split('.');
  let cursor = next;
  parts.slice(0, -1).forEach((part) => { cursor = cursor[part]; });
  const key = parts.at(-1);
  if (cursor?.[key] && typeof cursor[key] === 'object' && 'auto_value' in cursor[key]) {
    cursor[key] = { ...cursor[key], final_value: value, manual_override: true, manual_override_at: now() };
  } else {
    cursor[key] = value;
  }
  next.workflow_meta = { ...(next.workflow_meta || {}), last_manual_edit_at: now() };
  return next;
}

export function useSuggestion(preview, path) {
  const next = structuredClone(preview);
  const parts = path.split('.');
  let cursor = next;
  parts.slice(0, -1).forEach((part) => { cursor = cursor[part]; });
  const key = parts.at(-1);
  if (cursor?.[key] && typeof cursor[key] === 'object' && 'auto_value' in cursor[key]) {
    cursor[key] = { ...cursor[key], final_value: cursor[key].auto_value, manual_override: false, suggestion_used_at: now() };
  }
  return next;
}

function saleActivity(order = {}) {
  return getFinanceActivityFromSale(order);
}

function stockPatchAfterSale(order = {}, quantitySold) {
  const quantity = toNumber(order.quantite_disponible ?? order.stock_quantity ?? order.quantite_stock ?? order.current_count ?? order.quantite);
  if (!order.source_id && !order.product_id && !order.entity_id) return null;
  if (quantity <= 0) return null;
  return {
    id: order.source_id || order.product_id || order.entity_id,
    quantite: Math.max(0, quantity - quantitySold),
    last_movement_type: 'sortie',
    last_movement_label: 'vente',
    last_movement_qty: quantitySold,
    last_movement_at: now(),
  };
}

export function prepareSaleWorkflow(payload = {}, context = {}) {
  const order = payload.order || payload;
  const amount = getAmount(order);
  const alreadyPaid = getPaid(order);
  const remainingBeforePayment = Math.max(0, amount - alreadyPaid);
  const suggestedPayment = toNumber(order.nouveau_paiement ?? order.payment_amount ?? order.montant_a_encaisser) || remainingBeforePayment || amount;
  const nextPaid = Math.min(amount || alreadyPaid + suggestedPayment, alreadyPaid + suggestedPayment);
  const nextRemaining = Math.max(0, amount - nextPaid);
  const nextPaymentStatus = paymentStatusOf(amount, nextPaid);
  const nextOrderStatus = orderStatusAfterPayment(order, amount, nextPaid);
  const activity = saleActivity(order);
  const invoiceId = order.invoice_id || safeId('FAC', context.invoices);
  const paymentId = order.payment_id || safeId('PAI', context.payments);
  const transactionId = order.transaction_id || safeId('TRX', context.transactions);
  const eventId = safeId('EVT', context.events);
  const documentId = safeId('DOC', context.documents);
  const client = arr(context.clients).find((c) => c.id === order.client_id);
  const source = `vente.${order.id || 'nouvelle'}`;
  const quantitySold = toNumber(order.quantite ?? order.quantity ?? 1) || 1;
  const actions = [
    { id: 'update_order', module: 'ventes', type: 'update', label: 'Mettre à jour la commande' },
    { id: 'create_invoice', module: 'documents', type: 'create', label: 'Créer facture/reçu' },
    suggestedPayment > 0 ? { id: 'create_payment', module: 'paiements', type: 'create', label: 'Créer paiement' } : null,
    suggestedPayment > 0 ? { id: 'create_finance', module: 'finances', type: 'create', label: 'Créer transaction finance' } : null,
    client ? { id: 'update_client', module: 'clients', type: 'update', label: 'Mettre à jour client' } : null,
    { id: 'update_source_asset', module: activity, type: 'update', label: 'Mettre à jour stock/animal/lot/culture' },
    { id: 'create_trace', module: 'tracabilite', type: 'create', label: 'Créer événement traçabilité' },
    nextRemaining > 0 ? { id: 'create_alert', module: 'alertes', type: 'create', label: 'Créer alerte créance' } : null,
  ].filter(Boolean);

  return {
    workflow_type: 'sale',
    workflow_id: safeId('WF', context.workflows),
    workflow_meta: workflowMeta({ type: 'sale', actions, extra: { source } }),
    badges: { price: order.prix_vente_manual_override ? 'Modifié' : 'Auto', amount: order.montant_manual_override ? 'Modifié' : 'Auto' },
    source_order: order,
    fields: {
      amount: fieldAuto({ value: amount, source: 'vente.montant_total', previousAuto: order.montant_last_auto_value }),
      already_paid: fieldAuto({ value: alreadyPaid, source: 'vente.montant_paye' }),
      payment_to_record: fieldAuto({ value: suggestedPayment, source: 'reste_a_payer', confidence: 0.9 }),
      remaining_after_payment: fieldAuto({ value: nextRemaining, source: 'amount - already_paid - payment' }),
      activity: fieldAuto({ value: activity, source: 'vente.source_type' }),
      category: fieldAuto({ value: getFinanceCategoryFromSale(order), source: 'financeSyncService.category' }),
    },
    records: {
      order_patch: {
        statut_commande: nextOrderStatus,
        statut_paiement: nextPaymentStatus,
        montant_paye: nextPaid,
        reste_a_payer: nextRemaining,
        invoice_id: invoiceId,
        payment_id: paymentId,
        transaction_id: transactionId,
        workflow_id: null,
        secured_at: now(),
      },
      invoice: { id: invoiceId, order_id: order.id, client_id: order.client_id || '', date: today(), date_emission: today(), total_amount: amount, montant_total: amount, statut_facture: 'emise', invoice_status: 'emise', statut: 'emise', statut_paiement: nextPaymentStatus, source_module: 'ventes', source_record_id: order.id },
      payment: { id: paymentId, order_id: order.id, sale_id: order.id, invoice_id: invoiceId, client_id: order.client_id || '', date: today(), date_paiement: today(), montant: suggestedPayment, montant_paye: suggestedPayment, amount: suggestedPayment, statut: 'paye', moyen_paiement: order.moyen_paiement || order.mode_paiement || 'Cash', mode_paiement: order.mode_paiement || order.moyen_paiement || 'Cash', source_module: 'ventes', source_record_id: order.id, source_type: order.source_type || order.type_vente || order.product_type, source_id: order.source_id || order.product_id || order.entity_id },
      finance: { id: transactionId, type: 'entree', libelle: `Encaissement ${order.product_name || order.libelle || order.id}`, montant: suggestedPayment, date: today(), categorie: getFinanceCategoryFromSale(order), module_lie: 'ventes', related_id: order.id, activite: activity, client_id: order.client_id || '', statut: 'paye', source_module: 'ventes', source_record_id: order.id, source_type: order.source_type || order.type_vente || order.product_type, source_id: order.source_id || order.product_id || order.entity_id, invoice_id: invoiceId, payment_id: paymentId, business_plan_id: order.business_plan_id || null, investment_id: order.investment_id || null },
      source_patch: stockPatchAfterSale(order, quantitySold),
      client_patch: client ? { dernier_achat: today(), total_achats: toNumber(client.total_achats) + amount, creances: Math.max(0, toNumber(client.creances) + nextRemaining) } : null,
      trace: { id: eventId, event_type: 'vente_complete', module_source: 'ventes', entity_type: 'sales_order', entity_id: order.id, title: 'Vente complète', description: `${order.product_name || order.id} - ${amount}`, event_date: today(), severity: 'info', linked_transaction_id: transactionId, linked_sale_id: order.id, linked_document_id: documentId, saisies_evitees: Math.max(0, actions.length - 1) },
      document: { id: documentId, title: `Facture ${order.product_name || order.id}`, document_category: 'facture', module_source: 'ventes', entity_type: 'sales_order', entity_id: order.id, related_id: order.id, transaction_id: transactionId, notes: `Généré par workflow vente ${order.id}` },
      alert: nextRemaining > 0 ? { id: safeId('ALT', context.alerts), title: 'Créance client à suivre', message: `${order.product_name || order.id}: ${nextRemaining}`, module_source: 'ventes', entity_id: order.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Relancer le client ou enregistrer un nouveau paiement' } : null,
    },
    actions,
  };
}

export async function commitSaleWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const amount = toNumber(finalValue(p.fields.amount));
  const alreadyPaid = toNumber(finalValue(p.fields.already_paid));
  const paymentToRecord = toNumber(finalValue(p.fields.payment_to_record));
  const nextPaid = Math.min(amount || alreadyPaid + paymentToRecord, alreadyPaid + paymentToRecord);
  const remaining = Math.max(0, amount - nextPaid);
  const activity = finalValue(p.fields.activity);
  const category = finalValue(p.fields.category);
  const records = p.records;
  records.order_patch = { ...records.order_patch, montant_paye: nextPaid, reste_a_payer: remaining, statut_paiement: paymentStatusOf(amount, nextPaid), statut_commande: orderStatusAfterPayment(p.source_order, amount, nextPaid), workflow_id: p.workflow_id };
  records.invoice = { ...records.invoice, total_amount: amount, montant_total: amount, statut_facture: 'emise', invoice_status: 'emise', statut: 'emise', statut_paiement: records.order_patch.statut_paiement };
  records.payment = { ...records.payment, montant: paymentToRecord, montant_paye: paymentToRecord, amount: paymentToRecord, date_paiement: records.payment.date_paiement || today() };
  records.finance = { ...records.finance, montant: paymentToRecord, activite: activity, categorie: category };
  await handlers.onCreateInvoice?.(records.invoice);
  if (paymentToRecord > 0) await handlers.onCreatePayment?.(records.payment);
  if (paymentToRecord > 0) await handlers.onCreateFinanceTransaction?.(records.finance);
  if (p.source_order?.id) await handlers.onUpdateOrder?.(p.source_order.id, records.order_patch);
  if (p.source_order?.client_id && records.client_patch) await handlers.onUpdateClient?.(p.source_order.client_id, records.client_patch);
  if (records.source_patch) await handlers.onUpdateSourceAsset?.(activity, records.source_patch.id, records.source_patch);
  await handlers.onCreateDocument?.(records.document);
  await handlers.onCreateBusinessEvent?.(records.trace);
  if (records.alert) await handlers.onCreateAlert?.(records.alert);
  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function preparePurchaseWorkflow(payload = {}, context = {}) {
  const amount = toNumber(payload.montant ?? payload.amount ?? (toNumber(payload.quantite) * toNumber(payload.prix_unitaire)));
  const actions = ['stock', 'finance', 'document', 'trace'];
  return { workflow_type: 'purchase', workflow_id: safeId('WF', context.workflows), fields: { amount: fieldAuto({ value: amount, source: 'achat.quantite*prix' }) }, records: { stock_patch: payload, finance: { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Achat ${payload.produit || payload.libelle || ''}`.trim(), montant: amount, date: today(), categorie: 'Stock', module_lie: 'stock', fournisseur_id: payload.fournisseur_id || '', source_module: 'stock' }, document: { id: safeId('DOC', context.documents), title: `Justificatif achat ${payload.produit || ''}`, document_category: 'facture', module_source: 'stock' }, trace: { id: safeId('EVT', context.events), event_type: 'achat_stock', module_source: 'stock', event_date: today() } }, workflow_meta: workflowMeta({ type: 'purchase', actions }) };
}
export async function commitPurchaseWorkflow(preview, handlers = {}) { await handlers.onCreateOrUpdateStock?.(preview.records.stock_patch); await handlers.onCreateFinanceTransaction?.(preview.records.finance); await handlers.onCreateDocument?.(preview.records.document); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareFeedingWorkflow(payload = {}, context = {}) { const amount = toNumber(payload.montant_total ?? toNumber(payload.quantite) * toNumber(payload.prix_unitaire)); return { workflow_type: 'feeding', workflow_id: safeId('WF', context.workflows), fields: { cost: fieldAuto({ value: amount, source: 'stock.prix_unitaire*quantite' }) }, records: { alimentation: payload, stock_movement: { stock_id: payload.stock_id, qty: toNumber(payload.quantite), type: 'sortie' }, finance_cost_shadow: { montant: amount, module_lie: 'alimentation' }, trace: { id: safeId('EVT', context.events), event_type: 'alimentation', module_source: 'stock', event_date: today() } }, workflow_meta: workflowMeta({ type: 'feeding', actions: ['alimentation', 'stock', 'trace'] }) }; }
export async function commitFeedingWorkflow(preview, handlers = {}) { await handlers.onCreateAlimentation?.(preview.records.alimentation); await handlers.onUpdateStockMovement?.(preview.records.stock_movement); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareHealthWorkflow(payload = {}, context = {}) { const cost = toNumber(payload.cout); const actions = ['health', payload.stock_id ? 'stock' : null, cost > 0 ? 'finance' : null, 'task', 'trace'].filter(Boolean); return { workflow_type: 'health', workflow_id: safeId('WF', context.workflows), fields: { cost: fieldAuto({ value: cost, source: 'sante.cout' }) }, records: { health_patch: { ...payload, statut: 'fait', effectuee: payload.effectuee || today() }, stock_movement: payload.stock_id ? { stock_id: payload.stock_id, qty: toNumber(payload.quantite_stock || 1), type: 'sortie' } : null, finance: cost > 0 ? { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Soin/Vaccin ${payload.nom || payload.id}`, montant: cost, date: today(), categorie: 'Sante', source_module: 'sante', source_record_id: payload.id } : null, task: { id: safeId('TSK', context.tasks), title: `Suivi santé ${payload.nom || payload.id}`, module_lie: 'sante', due_date: today(), status: 'a_faire' }, trace: { id: safeId('EVT', context.events), event_type: 'sante', module_source: 'sante', event_date: today() } }, workflow_meta: workflowMeta({ type: 'health', actions }) }; }
export async function commitHealthWorkflow(preview, handlers = {}) { await handlers.onUpdateHealth?.(preview.records.health_patch.id, preview.records.health_patch); if (preview.records.stock_movement) await handlers.onUpdateStockMovement?.(preview.records.stock_movement); if (preview.records.finance) await handlers.onCreateFinanceTransaction?.(preview.records.finance); await handlers.onCreateTask?.(preview.records.task); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareBiosecurityWorkflow(payload = {}, context = {}) {
  const risk = String(payload.risk_level || payload.severity || payload.sanitary_risk_level || 'warning').toLowerCase();
  const eventType = payload.event_type || payload.trigger || 'biosécurité';
  const entityId = payload.entity_id || payload.related_id || payload.id;
  const taskId = safeId('TSK', context.tasks);
  const alertId = safeId('ALT', context.alerts);
  const eventId = safeId('EVT', context.events);
  const documentId = payload.document_url || payload.proof_url ? safeId('DOC', context.documents) : null;
  const stockQty = toNumber(payload.desinfectant_qty || payload.quantite_desinfectant || payload.stock_qty);
  const actions = ['alert', 'task', stockQty > 0 && payload.stock_id ? 'stock' : null, documentId ? 'document' : null, 'trace'].filter(Boolean);

  return {
    workflow_type: 'biosecurity',
    workflow_id: safeId('WF', context.workflows),
    fields: {
      risk_level: fieldAuto({ value: risk === 'urgence' || risk === 'critique' ? risk : 'warning', source: 'biosafety.risk' }),
      protocol: fieldAuto({ value: payload.protocol || payload.cleaning_protocol || 'Nettoyage, désinfection et contrôle sanitaire', source: 'biosafety.protocol' }),
      next_control_date: fieldAuto({ value: payload.next_control_date || today(), source: 'biosafety.next_control' }),
    },
    records: {
      alert: { id: alertId, title: payload.title || 'Risque biosécurité à traiter', message: payload.message || payload.description || 'Action biosécurité recommandée par Horizon Farm.', module_source: payload.module_source || 'biosécurité', entity_type: payload.entity_type || 'sanitary_event', entity_id: entityId, severity: risk === 'urgence' || risk === 'critique' ? risk : 'warning', status: 'nouvelle', action_recommandee: payload.action_recommandee || 'Appliquer le protocole biosécurité et documenter le résultat.', workflow_id: null },
      task: { id: taskId, title: payload.task_title || `Biosécurité — ${eventType}`, module_lie: payload.module_source || 'biosécurité', related_id: entityId, due_date: payload.due_date || today(), priority: risk === 'urgence' || risk === 'critique' ? 'critique' : 'haute', status: 'a_faire', checklist: payload.checklist || 'Isoler si nécessaire; Nettoyer; Désinfecter; Contrôler eau/aliment; Documenter', source_module: 'biosécurité', source_record_id: entityId, linked_alert_id: alertId },
      stock_movement: stockQty > 0 && payload.stock_id ? { stock_id: payload.stock_id, qty: stockQty, type: 'sortie', reason: 'désinfection / biosécurité' } : null,
      document: documentId ? { id: documentId, title: payload.document_title || `Preuve biosécurité ${entityId || ''}`.trim(), document_category: 'sanitaire', module_source: 'biosécurité', entity_type: payload.entity_type || 'sanitary_event', entity_id: entityId, file_url: payload.document_url || payload.proof_url } : null,
      trace: { id: eventId, event_type: 'biosécurité', module_source: payload.module_source || 'biosécurité', entity_type: payload.entity_type || 'sanitary_event', entity_id: entityId, title: payload.title || 'Action biosécurité générée', description: payload.message || payload.description || 'Workflow biosécurité préparé.', event_date: today(), severity: risk === 'urgence' || risk === 'critique' ? risk : 'warning', linked_document_id: documentId, linked_alert_id: alertId, linked_task_id: taskId },
    },
    workflow_meta: workflowMeta({ type: 'biosecurity', actions, extra: { trigger: eventType } }),
    actions,
  };
}

export async function commitBiosecurityWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const riskLevel = finalValue(p.fields.risk_level);
  const protocol = finalValue(p.fields.protocol);
  const nextControlDate = finalValue(p.fields.next_control_date);
  p.records.alert = { ...p.records.alert, severity: riskLevel, workflow_id: p.workflow_id };
  p.records.task = { ...p.records.task, checklist: protocol, due_date: nextControlDate };
  await handlers.onCreateAlert?.(p.records.alert);
  await handlers.onCreateTask?.(p.records.task);
  if (p.records.stock_movement) await handlers.onUpdateStockMovement?.(p.records.stock_movement);
  if (p.records.document) await handlers.onCreateDocument?.(p.records.document);
  await handlers.onCreateBusinessEvent?.(p.records.trace);
  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function prepareHarvestWorkflow(payload = {}, context = {}) { return { workflow_type: 'harvest', workflow_id: safeId('WF', context.workflows), records: { culture_patch: payload, stock: { id: safeId('STK', context.stocks), produit: payload.produit || payload.culture || 'Récolte', categorie: 'recolte', quantite: toNumber(payload.quantite), unite: payload.unite || 'kg', activite_liee: 'cultures' }, trace: { id: safeId('EVT', context.events), event_type: 'recolte', module_source: 'cultures', event_date: today() } }, workflow_meta: workflowMeta({ type: 'harvest', actions: ['culture', 'stock', 'trace'] }) }; }
export async function commitHarvestWorkflow(preview, handlers = {}) { await handlers.onUpdateCulture?.(preview.records.culture_patch.id, preview.records.culture_patch); await handlers.onCreateStock?.(preview.records.stock); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareInvestmentExecutionWorkflow(payload = {}, context = {}) { return { workflow_type: 'investment_execution', workflow_id: safeId('WF', context.workflows), records: { investment_patch: { ...payload, statut: 'effectif' }, finance: { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Investissement ${payload.designation || payload.nom || payload.id}`, montant: toNumber(payload.total ?? payload.montant), date: today(), categorie: 'Investissements', source_module: 'investissements', source_record_id: payload.id }, document: { id: safeId('DOC', context.documents), title: `Preuve investissement ${payload.designation || payload.id}`, document_category: 'facture', module_source: 'investissements', entity_id: payload.id }, trace: { id: safeId('EVT', context.events), event_type: 'investissement_effectif', module_source: 'investissements', event_date: today() } }, workflow_meta: workflowMeta({ type: 'investment_execution', actions: ['investment', 'finance', 'document', 'trace'] }) }; }
export async function commitInvestmentExecutionWorkflow(preview, handlers = {}) { await handlers.onUpdateInvestment?.(preview.records.investment_patch.id, preview.records.investment_patch); await handlers.onCreateFinanceTransaction?.(preview.records.finance); await handlers.onCreateDocument?.(preview.records.document); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareEquipmentWorkflow(payload = {}, context = {}) { const repairCost = toNumber(payload.cout_reparation); const actions = ['equipment', 'task', 'alert', repairCost > 0 ? 'finance' : null].filter(Boolean); return { workflow_type: 'equipment', workflow_id: safeId('WF', context.workflows), records: { equipment_patch: payload, task: { id: safeId('TSK', context.tasks), title: `Intervention équipement ${payload.nom || payload.id}`, module_lie: 'equipements', related_id: payload.id, due_date: today(), priority: 'haute', status: 'a_faire' }, alert: { id: safeId('ALT', context.alerts), title: 'Panne équipement', message: payload.nom || payload.id, module_source: 'equipements', entity_id: payload.id, severity: 'warning', status: 'nouvelle' }, finance: repairCost > 0 ? { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Réparation ${payload.nom || payload.id}`, montant: repairCost, date: today(), categorie: 'Equipements' } : null }, workflow_meta: workflowMeta({ type: 'equipment', actions }) }; }
export async function commitEquipmentWorkflow(preview, handlers = {}) { await handlers.onUpdateEquipment?.(preview.records.equipment_patch.id, preview.records.equipment_patch); await handlers.onCreateTask?.(preview.records.task); await handlers.onCreateAlert?.(preview.records.alert); if (preview.records.finance) await handlers.onCreateFinanceTransaction?.(preview.records.finance); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareAlertActionWorkflow(payload = {}, context = {}) { return { workflow_type: 'alert_action', workflow_id: safeId('WF', context.workflows), records: { task: { id: safeId('TSK', context.tasks), title: payload.title || payload.message || 'Action alerte', module_lie: payload.module_source || payload.module || 'alertes', related_id: payload.entity_id || payload.id, due_date: today(), priority: payload.severity === 'critical' || payload.severity === 'critique' ? 'critique' : 'haute', status: 'a_faire', source_module: 'alertes', source_record_id: payload.id }, alert_patch: { status: 'prise_en_charge', task_created_at: now() } }, workflow_meta: workflowMeta({ type: 'alert_action', actions: ['task', 'alert'] }) }; }
export async function commitAlertActionWorkflow(preview, handlers = {}) { await handlers.onCreateTask?.(preview.records.task); await handlers.onUpdateAlert?.(preview.records.task.source_record_id, preview.records.alert_patch); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function calculateAvoidedInputs(events = []) {
  return arr(events).reduce((sum, event) => sum + toNumber(event.saisies_evitees), 0);
}
