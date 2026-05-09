import { makeId } from '../utils/ids';
import { financesService } from './financesService';

const paymentMethodMap = {
  especes: 'Cash',
  espece: 'Cash',
  'espèces': 'Cash',
  'espèce': 'Cash',
  cash: 'Cash',
  wave: 'Wave',
  orange_money: 'Orange Money',
  'orange money': 'Orange Money',
  orange: 'Orange Money',
  om: 'Orange Money',
  virement: 'Banque',
  banque: 'Banque',
  cheque: 'Banque',
  'chèque': 'Banque',
  carte: 'Carte bancaire',
  carte_bancaire: 'Carte bancaire',
  'carte bancaire': 'Carte bancaire',
  free_money: 'Free Money',
  'free money': 'Free Money',
};

export const normalizeFinancePaymentMethod = (method) => {
  const key = String(method || '').trim().toLowerCase();
  return paymentMethodMap[key] || method || 'Cash';
};

const amountOf = (...values) => values.map((value) => Number(value || 0)).find((value) => value > 0) || 0;
const textOf = (...values) => values.map((value) => String(value || '').trim()).find(Boolean) || '';

const normalizeSourceType = (row = {}) => String(
  row.source_type
  || row.type_vente
  || row.product_type
  || row.entity_type
  || row.activite
  || ''
).trim().toLowerCase();

export const getFinanceActivityFromSale = (row = {}) => {
  const sourceType = normalizeSourceType(row);
  const product = `${row.product_name || ''} ${row.libelle || ''} ${row.description || ''}`.toLowerCase();
  const haystack = `${sourceType} ${product}`;

  if (haystack.includes('oeuf') || haystack.includes('œuf') || haystack.includes('egg')) return 'avicole_oeufs';
  if (haystack.includes('chair') || haystack.includes('poulet')) return 'avicole_chair';
  if (haystack.includes('reforme') || haystack.includes('réforme')) return 'avicole_reformes';
  if (haystack.includes('avicole') || haystack.includes('lot')) return 'avicole';
  if (haystack.includes('animal') || haystack.includes('bovin') || haystack.includes('ovin') || haystack.includes('caprin')) return 'animaux';
  if (haystack.includes('culture') || haystack.includes('recolte') || haystack.includes('récolte') || haystack.includes('maraichage')) return 'cultures';
  if (haystack.includes('stock') || haystack.includes('intrant') || haystack.includes('aliment')) return 'stock';

  return row.activite || 'ventes';
};

export const getFinanceCategoryFromSale = (row = {}) => {
  const activity = getFinanceActivityFromSale(row);
  const categories = {
    animaux: 'Vente animaux',
    avicole: 'Vente avicole',
    avicole_chair: 'Vente poulets chair',
    avicole_oeufs: 'Vente oeufs',
    avicole_reformes: 'Vente pondeuses reformees',
    cultures: 'Vente cultures',
    stock: 'Vente stock',
    ventes: 'Ventes',
  };
  return categories[activity] || 'Ventes';
};

const findExistingTransaction = async (id, relatedId, paymentId) => {
  try {
    const rows = await financesService.getAll();
    return rows.find((tx) => String(tx.id) === String(id))
      || rows.find((tx) => paymentId && String(tx.payment_id || tx.source_payment_id || '') === String(paymentId))
      || rows.find((tx) => relatedId && String(tx.related_id || tx.source_record_id || '') === String(relatedId) && String(tx.module_lie || tx.source_module || '') === 'ventes')
      || null;
  } catch (error) {
    console.warn('Verification doublon finance impossible', error.message);
    return null;
  }
};

const upsertFinanceEntry = async ({
  id,
  libelle,
  montant,
  date,
  related_id,
  client_id,
  paiement,
  statut,
  categorie,
  activite,
  source_type,
  source_id,
  source_module = 'ventes',
  payment_id,
  invoice_id,
  business_plan_id,
  investment_id,
}) => {
  const amount = Number(montant || 0);
  if (!amount || amount <= 0) return null;

  const payload = {
    id,
    type: 'entree',
    libelle,
    montant: amount,
    date: date || new Date().toISOString().slice(0, 10),
    categorie: categorie || 'Ventes',
    module_lie: 'ventes',
    related_id: related_id || null,
    client_id: client_id || null,
    paiement: normalizeFinancePaymentMethod(paiement),
    statut: statut || 'paye',
    activite: activite || 'ventes',
    source_module,
    source_record_id: related_id || source_id || null,
    source_type: source_type || null,
    source_id: source_id || null,
    payment_id: payment_id || null,
    invoice_id: invoice_id || null,
    business_plan_id: business_plan_id || null,
    investment_id: investment_id || null,
  };

  try {
    const existing = await findExistingTransaction(id, related_id, payment_id);
    if (existing?.id) return await financesService.update(existing.id, payload);
    return await financesService.create(payload);
  } catch (error) {
    console.warn('Transaction finance non synchronisee depuis ventes', error.message);
    return null;
  }
};

export const syncPaymentToFinance = async (payment = {}) => {
  const activity = getFinanceActivityFromSale(payment);
  return upsertFinanceEntry({
    id: `TRX-PAY-${payment.id || makeId('TRX')}`,
    libelle: `Paiement vente ${payment.order_id || payment.sale_id || payment.id || ''}`.trim(),
    montant: amountOf(payment.montant, payment.amount, payment.montant_paye, payment.paid_amount),
    date: payment.date || payment.paid_at,
    related_id: payment.order_id || payment.sale_id || payment.source_record_id || payment.id,
    client_id: payment.client_id,
    paiement: payment.moyen_paiement || payment.paiement || payment.payment_method,
    statut: payment.statut === 'annule' ? 'annule' : 'paye',
    categorie: getFinanceCategoryFromSale(payment),
    activite: activity,
    source_type: payment.source_type || payment.type_vente || payment.product_type,
    source_id: payment.source_id || payment.product_id || payment.entity_id,
    payment_id: payment.id,
    invoice_id: payment.invoice_id,
    business_plan_id: payment.business_plan_id,
    investment_id: payment.investment_id,
  });
};

export const syncSalesOrderToFinance = async (order = {}) => {
  const total = amountOf(order.montant_total, order.total, order.amount_total);
  const paid = order.statut_paiement === 'paye'
    ? (total || amountOf(order.montant_paye, order.amount_paid, order.paid_amount))
    : amountOf(order.montant_paye, order.amount_paid, order.paid_amount);

  if (!paid || paid <= 0) return null;

  const activity = getFinanceActivityFromSale(order);
  const productLabel = textOf(order.product_name, order.libelle, order.numero_commande, order.id);

  return upsertFinanceEntry({
    id: `TRX-SALE-${order.id || makeId('TRX')}`,
    libelle: `Vente ${productLabel}`.trim(),
    montant: paid,
    date: order.date || order.date_commande,
    related_id: order.id,
    client_id: order.client_id,
    paiement: order.moyen_paiement || order.paiement || order.payment_method,
    statut: total > 0 && paid < total ? 'partiel' : 'paye',
    categorie: getFinanceCategoryFromSale(order),
    activite: activity,
    source_type: order.source_type || order.type_vente || order.product_type,
    source_id: order.source_id || order.product_id || order.entity_id,
    payment_id: order.payment_id,
    invoice_id: order.invoice_id,
    business_plan_id: order.business_plan_id,
    investment_id: order.investment_id,
  });
};
