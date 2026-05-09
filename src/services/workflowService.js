import { makeId } from '../utils/ids';
import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const getAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const getPaid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const fieldAuto = ({ value, source, previousAuto }) => ({
  auto_value: value,
  final_value: value,
  manual_override: false,
  auto_source: source,
  last_auto_value: previousAuto ?? value,
  calculated_at: now(),
});
const finalValue = (field) => field?.manual_override ? field.final_value : field?.auto_value;
const safeId = (prefix, existing) => {
  let id = makeId(prefix);
  const used = new Set(arr(existing).map((r) => String(r.id)));
  while (used.has(id)) id = makeId(prefix);
  return id;
};

export function applyManualOverride(preview, path, value) {
  const next = structuredClone(preview);
  const parts = path.split('.');
  let cursor = next;
  parts.slice(0, -1).forEach((part) => { cursor = cursor[part]; });
  const key = parts.at(-1);
  if (cursor?.[key] && typeof cursor[key] === 'object' && 'auto_value' in cursor[key]) {
    cursor[key] = { ...cursor[key], final_value: value, manual_override: true };
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
    cursor[key] = { ...cursor[key], final_value: cursor[key].auto_value, manual_override: false };
  }
  return next;
}

function saleActivity(order = {}) {
  const sourceType = String(order.source_type || order.type_vente || '').toLowerCase();
  if (sourceType.includes('animal')) return 'animaux';
  if (sourceType.includes('avicole') || sourceType.includes('lot')) return 'avicole';
  if (sourceType.includes('culture')) return 'cultures';
  if (sourceType.includes('stock')) return 'stock';
  return order.activite || 'ventes';
}

export function prepareSaleWorkflow(payload = {}, context = {}) {
  const order = payload.order || payload;
  const amount = getAmount(order);
  const alreadyPaid = getPaid(order);
  const due = Math.max(0, amount - alreadyPaid);
  const activity = saleActivity(order);
  const invoiceId = order.invoice_id || safeId('FAC', context.invoices);
  const paymentId = order.payment_id || safeId('PAI', context.payments);
  const transactionId = order.transaction_id || safeId('TRX', context.transactions);
  const eventId = safeId('EVT', context.events);
  const documentId = safeId('DOC', context.documents);
  const client = arr(context.clients).find((c) => c.id === order.client_id);
  const source = `vente.${order.id || 'nouvelle'}`;
  const actions = [
    { id: 'update_order', module: 'ventes', type: 'update', label: 'Mettre à jour la commande' },
    { id: 'create_invoice', module: 'documents', type: 'create', label: 'Créer facture/reçu' },
    due > 0 ? { id: 'create_payment', module: 'paiements', type: 'create', label: 'Créer paiement' } : null,
    due > 0 ? { id: 'create_finance', module: 'finances', type: 'create', label: 'Créer transaction finance' } : null,
    { id: 'update_client', module: 'clients', type: 'update', label: 'Mettre à jour client' },
    { id: 'update_source_asset', module: activity, type: 'update', label: 'Mettre à jour stock/animal/lot/culture' },
    { id: 'create_trace', module: 'tracabilite', type: 'create', label: 'Créer événement traçabilité' },
    due > 0 ? { id: 'create_alert', module: 'alertes', type: 'create', label: 'Créer alerte créance' } : null,
  ].filter(Boolean);
  return {
    workflow_type: 'sale',
    workflow_id: safeId('WF', context.workflows),
    workflow_meta: { prepared_at: now(), source, saisies_utilisateur: 1, actions_erp: actions.length, saisies_evitees: Math.max(0, actions.length - 1) },
    badges: { price: order.prix_vente_manual_override ? 'Modifié' : 'Auto', amount: order.montant_manual_override ? 'Modifié' : 'Auto' },
    source_order: order,
    fields: {
      amount: fieldAuto({ value: amount, source: 'vente.montant_total', previousAuto: order.montant_last_auto_value }),
      paid: fieldAuto({ value: Math.max(alreadyPaid, due), source: 'vente.montant_paye' }),
      due: fieldAuto({ value: due, source: 'amount - paid' }),
      activity: fieldAuto({ value: activity, source: 'vente.source_type' }),
    },
    records: {
      order_patch: { statut_commande: order.statut_commande === 'brouillon' ? 'confirme' : (order.statut_commande || 'confirme'), statut_paiement: due > 0 ? 'paye' : (order.statut_paiement || 'paye'), montant_paye: amount, invoice_id: invoiceId, payment_id: paymentId, transaction_id: transactionId, workflow_id: null, secured_at: now() },
      invoice: { id: invoiceId, order_id: order.id, client_id: order.client_id || '', date: today(), total_amount: amount, montant_total: amount, status: due > 0 ? 'payee' : 'payee', source_module: 'ventes', source_record_id: order.id },
      payment: { id: paymentId, order_id: order.id, invoice_id: invoiceId, client_id: order.client_id || '', date: today(), montant: due || amount, amount: due || amount, statut: 'paye', moyen_paiement: order.moyen_paiement || '', source_module: 'ventes', source_record_id: order.id },
      finance: { id: transactionId, type: 'entree', libelle: `Encaissement ${order.product_name || order.libelle || order.id}`, montant: due || amount, date: today(), categorie: 'Ventes', module_lie: 'ventes', related_id: order.id, activite: activity, client_id: order.client_id || '', statut: 'paye', source_module: 'ventes', source_record_id: order.id, invoice_id: invoiceId, payment_id: paymentId },
      client_patch: client ? { dernier_achat: today(), total_achats: toNumber(client.total_achats) + amount, creances: Math.max(0, toNumber(client.creances) - due) } : null,
      trace: { id: eventId, event_type: 'vente_complete', module_source: 'ventes', entity_type: 'sales_order', entity_id: order.id, title: 'Vente complète', description: `${order.product_name || order.id} - ${amount}`, event_date: today(), severity: 'success', saisies_evitees: Math.max(0, actions.length - 1) },
      document: { id: documentId, title: `Facture ${order.product_name || order.id}`, document_category: 'facture', module_source: 'ventes', entity_type: 'sales_order', entity_id: order.id, notes: `Généré par workflow vente ${order.id}` },
      alert: due > 0 ? { id: safeId('ALT', context.alerts), title: 'Créance client à suivre', message: `${order.product_name || order.id}: ${due}`, module_source: 'ventes', entity_id: order.id, severity: 'warning', status: 'nouvelle' } : null,
    },
    actions,
  };
}

export async function commitSaleWorkflow(preview, handlers = {}) {
  const p = structuredClone(preview);
  const amount = toNumber(finalValue(p.fields.amount));
  const paidAmount = toNumber(finalValue(p.fields.paid));
  const activity = finalValue(p.fields.activity);
  const records = p.records;
  records.order_patch = { ...records.order_patch, montant_paye: paidAmount, workflow_id: p.workflow_id };
  records.invoice = { ...records.invoice, total_amount: amount, montant_total: amount };
  records.payment = { ...records.payment, montant: paidAmount, amount: paidAmount };
  records.finance = { ...records.finance, montant: paidAmount, activite: activity };
  await handlers.onCreateInvoice?.(records.invoice);
  if (paidAmount > 0) await handlers.onCreatePayment?.(records.payment);
  if (paidAmount > 0) await handlers.onCreateFinanceTransaction?.(records.finance);
  if (records.source_order?.id || p.source_order?.id) await handlers.onUpdateOrder?.(p.source_order.id, records.order_patch);
  if (p.source_order?.client_id && records.client_patch) await handlers.onUpdateClient?.(p.source_order.client_id, records.client_patch);
  await handlers.onCreateDocument?.(records.document);
  await handlers.onCreateBusinessEvent?.(records.trace);
  if (records.alert) await handlers.onCreateAlert?.(records.alert);
  return { ok: true, saisies_evitees: p.workflow_meta?.saisies_evitees || 0, workflow_id: p.workflow_id };
}

export function preparePurchaseWorkflow(payload = {}, context = {}) {
  const amount = toNumber(payload.montant ?? payload.amount ?? (toNumber(payload.quantite) * toNumber(payload.prix_unitaire)));
  return { workflow_type: 'purchase', workflow_id: safeId('WF', context.workflows), fields: { amount: fieldAuto({ value: amount, source: 'achat.quantite*prix' }) }, records: { stock_patch: payload, finance: { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Achat ${payload.produit || payload.libelle || ''}`.trim(), montant: amount, date: today(), categorie: 'Stock', module_lie: 'stock', fournisseur_id: payload.fournisseur_id || '', source_module: 'stock' }, document: { id: safeId('DOC', context.documents), title: `Justificatif achat ${payload.produit || ''}`, document_category: 'facture', module_source: 'stock' }, trace: { id: safeId('EVT', context.events), event_type: 'achat_stock', module_source: 'stock', event_date: today() } }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: 4, saisies_evitees: 3 } };
}
export async function commitPurchaseWorkflow(preview, handlers = {}) { await handlers.onCreateOrUpdateStock?.(preview.records.stock_patch); await handlers.onCreateFinanceTransaction?.(preview.records.finance); await handlers.onCreateDocument?.(preview.records.document); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareFeedingWorkflow(payload = {}, context = {}) { const amount = toNumber(payload.montant_total ?? toNumber(payload.quantite) * toNumber(payload.prix_unitaire)); return { workflow_type: 'feeding', workflow_id: safeId('WF', context.workflows), fields: { cost: fieldAuto({ value: amount, source: 'stock.prix_unitaire*quantite' }) }, records: { alimentation: payload, stock_movement: { stock_id: payload.stock_id, qty: toNumber(payload.quantite), type: 'sortie' }, finance_cost_shadow: { montant: amount, module_lie: 'alimentation' }, trace: { id: safeId('EVT', context.events), event_type: 'alimentation', module_source: 'stock', event_date: today() } }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: 3, saisies_evitees: 2 } }; }
export async function commitFeedingWorkflow(preview, handlers = {}) { await handlers.onCreateAlimentation?.(preview.records.alimentation); await handlers.onUpdateStockMovement?.(preview.records.stock_movement); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareHealthWorkflow(payload = {}, context = {}) { const cost = toNumber(payload.cout); return { workflow_type: 'health', workflow_id: safeId('WF', context.workflows), fields: { cost: fieldAuto({ value: cost, source: 'sante.cout' }) }, records: { health_patch: { ...payload, statut: 'fait', effectuee: payload.effectuee || today() }, stock_movement: payload.stock_id ? { stock_id: payload.stock_id, qty: toNumber(payload.quantite_stock || 1), type: 'sortie' } : null, finance: cost > 0 ? { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Soin/Vaccin ${payload.nom || payload.id}`, montant: cost, date: today(), categorie: 'Sante', source_module: 'sante', source_record_id: payload.id } : null, task: { id: safeId('TSK', context.tasks), title: `Suivi santé ${payload.nom || payload.id}`, module_lie: 'sante', due_date: today(), status: 'a_faire' }, trace: { id: safeId('EVT', context.events), event_type: 'sante', module_source: 'sante', event_date: today() } }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: cost > 0 ? 5 : 4, saisies_evitees: cost > 0 ? 4 : 3 } }; }
export async function commitHealthWorkflow(preview, handlers = {}) { await handlers.onUpdateHealth?.(preview.records.health_patch.id, preview.records.health_patch); if (preview.records.stock_movement) await handlers.onUpdateStockMovement?.(preview.records.stock_movement); if (preview.records.finance) await handlers.onCreateFinanceTransaction?.(preview.records.finance); await handlers.onCreateTask?.(preview.records.task); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareHarvestWorkflow(payload = {}, context = {}) { return { workflow_type: 'harvest', workflow_id: safeId('WF', context.workflows), records: { culture_patch: payload, stock: { id: safeId('STK', context.stocks), produit: payload.produit || payload.culture || 'Récolte', categorie: 'recolte', quantite: toNumber(payload.quantite), unite: payload.unite || 'kg', activite_liee: 'cultures' }, trace: { id: safeId('EVT', context.events), event_type: 'recolte', module_source: 'cultures', event_date: today() } }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: 3, saisies_evitees: 2 } }; }
export async function commitHarvestWorkflow(preview, handlers = {}) { await handlers.onUpdateCulture?.(preview.records.culture_patch.id, preview.records.culture_patch); await handlers.onCreateStock?.(preview.records.stock); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareInvestmentExecutionWorkflow(payload = {}, context = {}) { return { workflow_type: 'investment_execution', workflow_id: safeId('WF', context.workflows), records: { investment_patch: { ...payload, statut: 'effectif' }, finance: { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Investissement ${payload.designation || payload.nom || payload.id}`, montant: toNumber(payload.total ?? payload.montant), date: today(), categorie: 'Investissements', source_module: 'investissements', source_record_id: payload.id }, document: { id: safeId('DOC', context.documents), title: `Preuve investissement ${payload.designation || payload.id}`, document_category: 'facture', module_source: 'investissements', entity_id: payload.id }, trace: { id: safeId('EVT', context.events), event_type: 'investissement_effectif', module_source: 'investissements', event_date: today() } }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: 4, saisies_evitees: 3 } }; }
export async function commitInvestmentExecutionWorkflow(preview, handlers = {}) { await handlers.onUpdateInvestment?.(preview.records.investment_patch.id, preview.records.investment_patch); await handlers.onCreateFinanceTransaction?.(preview.records.finance); await handlers.onCreateDocument?.(preview.records.document); await handlers.onCreateBusinessEvent?.(preview.records.trace); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareEquipmentWorkflow(payload = {}, context = {}) { const repairCost = toNumber(payload.cout_reparation); return { workflow_type: 'equipment', workflow_id: safeId('WF', context.workflows), records: { equipment_patch: payload, task: { id: safeId('TSK', context.tasks), title: `Intervention équipement ${payload.nom || payload.id}`, module_lie: 'equipements', related_id: payload.id, due_date: today(), priority: 'haute', status: 'a_faire' }, alert: { id: safeId('ALT', context.alerts), title: 'Panne équipement', message: payload.nom || payload.id, module_source: 'equipements', entity_id: payload.id, severity: 'warning', status: 'nouvelle' }, finance: repairCost > 0 ? { id: safeId('TRX', context.transactions), type: 'sortie', libelle: `Réparation ${payload.nom || payload.id}`, montant: repairCost, date: today(), categorie: 'Equipements' } : null }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: repairCost > 0 ? 4 : 3, saisies_evitees: repairCost > 0 ? 3 : 2 } }; }
export async function commitEquipmentWorkflow(preview, handlers = {}) { await handlers.onUpdateEquipment?.(preview.records.equipment_patch.id, preview.records.equipment_patch); await handlers.onCreateTask?.(preview.records.task); await handlers.onCreateAlert?.(preview.records.alert); if (preview.records.finance) await handlers.onCreateFinanceTransaction?.(preview.records.finance); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function prepareAlertActionWorkflow(payload = {}, context = {}) { return { workflow_type: 'alert_action', workflow_id: safeId('WF', context.workflows), records: { task: { id: safeId('TSK', context.tasks), title: payload.title || payload.message || 'Action alerte', module_lie: payload.module_source || payload.module || 'alertes', related_id: payload.entity_id || payload.id, due_date: today(), priority: payload.severity === 'critical' || payload.severity === 'critique' ? 'critique' : 'haute', status: 'a_faire', source_module: 'alertes', source_record_id: payload.id }, alert_patch: { status: 'prise_en_charge', task_created_at: now() } }, workflow_meta: { prepared_at: now(), saisies_utilisateur: 1, actions_erp: 2, saisies_evitees: 1 } }; }
export async function commitAlertActionWorkflow(preview, handlers = {}) { await handlers.onCreateTask?.(preview.records.task); await handlers.onUpdateAlert?.(preview.records.task.source_record_id, preview.records.alert_patch); return { ok: true, saisies_evitees: preview.workflow_meta?.saisies_evitees || 0 }; }

export function calculateAvoidedInputs(events = []) {
  return arr(events).reduce((sum, event) => sum + toNumber(event.saisies_evitees), 0);
}
