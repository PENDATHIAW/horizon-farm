import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { getFinanceActivityFromSale, getFinanceCategoryFromSale } from './financeSyncService';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const amountOf = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const totalOf = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? 0);

export function isOpportunityClosed(opp = {}) {
  return /converti|convertie|ferme|fermée|cloture|clôture|commande/.test(clean(opp.status || opp.statut || opp.etat));
}

export function findOrderForOpportunity(opp = {}, orders = []) {
  const oppId = String(opp.id || '');
  const sourceId = String(opp.source_id || opp.related_id || opp.entity_id || '');
  const sourceModule = clean(opp.source_module || opp.created_from || opp.module_source || '');
  return arr(orders).find((order) => {
    const orderSourceId = String(order.source_id || order.related_id || order.entity_id || '');
    const orderSourceModule = clean(order.source_module || order.created_from || order.module_source || '');
    return String(order.opportunity_id || '') === oppId
      || String(order.source_opportunity_id || '') === oppId
      || String(order.converted_opportunity_id || '') === oppId
      || (sourceId && orderSourceId === sourceId && (!sourceModule || !orderSourceModule || sourceModule === orderSourceModule));
  });
}

export function buildOpportunityClosedPatch(opp = {}, order = {}) {
  return {
    status: 'convertie',
    statut: 'convertie',
    etat: 'convertie',
    converted_order_id: order.id || opp.converted_order_id || '',
    source_order_id: order.id || opp.source_order_id || '',
    converted_at: opp.converted_at || now(),
    updated_at: now(),
  };
}

export function findOrderForPayment(payment = {}, orders = []) {
  const orderId = String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
  return arr(orders).find((order) => String(order.id) === orderId) || {};
}

export function financeExistsForPayment(payment = {}, order = {}, finances = []) {
  const paymentId = String(payment.id || '');
  const orderId = String(order.id || payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
  const amount = amountOf(payment);
  return arr(finances).some((trx) => {
    const trxPaymentId = String(trx.payment_id || '');
    const trxOrderId = String(trx.order_id || trx.sale_id || trx.related_id || trx.source_record_id || '');
    const trxAmount = amountOf(trx);
    return (paymentId && trxPaymentId === paymentId)
      || (orderId && trxOrderId === orderId && Math.abs(trxAmount - amount) < 1);
  });
}

export function buildFinanceFromPayment(payment = {}, order = {}) {
  const amount = amountOf(payment);
  return {
    id: makeId('TRX'),
    type: 'entree',
    libelle: `Encaissement ${order.product_name || order.libelle || order.id || payment.order_id || 'vente'}`,
    montant: amount,
    amount,
    date: payment.date_paiement || payment.date || today(),
    categorie: getFinanceCategoryFromSale(order),
    activite: getFinanceActivityFromSale(order),
    module_lie: 'ventes',
    source_module: 'ventes',
    related_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    source_record_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    order_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    sale_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    payment_id: payment.id,
    client_id: order.client_id || payment.client_id || '',
    invoice_id: order.invoice_id || payment.invoice_id || '',
    source_type: order.source_type || order.type_vente || order.product_type || '',
    source_id: order.source_id || order.product_id || order.entity_id || '',
    statut: 'paye',
    moyen_paiement: payment.moyen_paiement || payment.mode_paiement || '',
    notes: `Transaction créée automatiquement depuis paiement ${payment.id}`,
    created_at: now(),
  };
}

export function documentExistsForInvoice(invoice = {}, documents = []) {
  const invoiceId = String(invoice.id || '');
  const orderId = String(invoice.order_id || invoice.sale_id || invoice.related_id || '');
  return arr(documents).some((doc) => String(doc.invoice_id || '') === invoiceId
    || String(doc.related_id || doc.entity_id || doc.order_id || '') === invoiceId
    || (orderId && String(doc.order_id || doc.sale_id || doc.related_id || '') === orderId));
}

export function buildDocumentFromInvoice(invoice = {}, order = {}) {
  return {
    id: makeId('DOC'),
    title: `Facture ${invoice.numero || invoice.id || order.id || ''}`,
    titre: `Facture ${invoice.numero || invoice.id || order.id || ''}`,
    type: 'facture_vente',
    document_category: 'facture',
    module_lie: 'ventes',
    module_source: 'ventes',
    entity_type: 'invoice',
    entity_id: invoice.id,
    invoice_id: invoice.id,
    order_id: invoice.order_id || invoice.sale_id || order.id || '',
    sale_id: invoice.order_id || invoice.sale_id || order.id || '',
    related_id: invoice.id,
    montant: toNumber(invoice.montant_total ?? invoice.total ?? totalOf(order)),
    date: invoice.date || invoice.date_facture || today(),
    statut: 'genere',
    status: 'genere',
    description: `Document facture lié à la vente ${invoice.order_id || invoice.sale_id || order.id || ''}`,
    created_at: now(),
  };
}

export function buildStructuredFarmImpact(payload = {}) {
  const raw = `${payload.impact_ferme || payload.impact_business || payload.notes || payload.description || ''}`;
  const cost = toNumber(payload.cout || payload.montant || payload.amount || 0);
  const type = clean(payload.type_intervention || payload.type || payload.intervention_type || 'sante');
  const category = payload.impact_category || payload.impact_business_category || (
    /vaccin|vaccination/.test(type) ? 'prevention_sanitaire'
      : /soin|traitement|urgence/.test(type) ? 'risque_sanitaire'
        : /parasite|deparas/.test(type) ? 'prevention_parasitaire'
          : 'sante_exploitation'
  );
  const level = payload.impact_level || payload.niveau_impact || (
    /urgence|critique|mort/.test(clean(raw + type)) ? 'critique'
      : cost > 0 ? 'moyen'
        : 'faible'
  );

  return {
    impact_ferme: raw || 'Impact santé à suivre',
    impact_business_category: category,
    impact_category: category,
    impact_level: level,
    niveau_impact: level,
    impact_amount: cost,
    montant_impact: cost,
    impact_module: payload.impact_module || payload.module_lie || 'sante',
    impact_action_recommandee: payload.impact_action_recommandee || 'Suivre l’animal/lot et vérifier coût santé dans la rentabilité.',
    impact_structured: true,
    impact_structured_at: now(),
  };
}

export function buildInterconnectionAudit({ orders = [], payments = [], finances = [], invoices = [], documents = [], opportunities = [], sante = [] } = {}) {
  const paymentsWithoutFinance = arr(payments).map((payment) => ({ payment, order: findOrderForPayment(payment, orders) })).filter(({ payment, order }) => amountOf(payment) > 0 && !financeExistsForPayment(payment, order, finances));
  const opportunitiesToClose = arr(opportunities).map((opp) => ({ opp, order: findOrderForOpportunity(opp, orders) })).filter(({ opp, order }) => order && !isOpportunityClosed(opp));
  const invoicesWithoutDocument = arr(invoices).map((invoice) => ({ invoice, order: arr(orders).find((order) => String(order.id) === String(invoice.order_id || invoice.sale_id || invoice.related_id || '')) || {} })).filter(({ invoice }) => !documentExistsForInvoice(invoice, documents));
  const healthWithoutStructuredImpact = arr(sante).filter((row) => !row.impact_structured && !row.impact_business_category && !row.impact_category);
  return { paymentsWithoutFinance, opportunitiesToClose, invoicesWithoutDocument, healthWithoutStructuredImpact };
}
