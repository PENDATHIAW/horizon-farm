import { financesService } from './financesService';
import { makeId } from '../utils/ids';

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

const createFinanceEntry = async ({ id, libelle, montant, date, related_id, client_id, paiement, statut }) => {
  const amount = Number(montant || 0);
  if (!amount || amount <= 0) return null;

  try {
    return await financesService.create({
      id,
      type: 'entree',
      libelle,
      montant: amount,
      date: date || new Date().toISOString().slice(0, 10),
      categorie: 'Vente animaux',
      module_lie: 'ventes',
      related_id: related_id || null,
      client_id: client_id || null,
      paiement: normalizeFinancePaymentMethod(paiement),
      statut: statut || 'paye',
    });
  } catch (error) {
    console.warn('Transaction finance non creee depuis ventes', error.message);
    return null;
  }
};

export const syncPaymentToFinance = async (payment = {}) => createFinanceEntry({
  id: `TRX-PAY-${payment.id || makeId('TRX')}`,
  libelle: `Paiement vente ${payment.order_id || payment.sale_id || payment.id || ''}`.trim(),
  montant: payment.montant || payment.amount || payment.montant_paye || payment.paid_amount,
  date: payment.date || payment.paid_at,
  related_id: payment.order_id || payment.sale_id || payment.id,
  client_id: payment.client_id,
  paiement: payment.moyen_paiement || payment.paiement || payment.payment_method,
  statut: payment.statut === 'annule' ? 'annule' : 'paye',
});

export const syncSalesOrderToFinance = async (order = {}) => {
  const total = Number(order.montant_total || order.total || order.amount_total || 0);
  const paid = order.statut_paiement === 'paye'
    ? total || Number(order.montant_paye || 0)
    : Number(order.montant_paye || order.amount_paid || order.paid_amount || 0);

  if (!paid || paid <= 0) return null;

  return createFinanceEntry({
    id: `TRX-SALE-${order.id || makeId('TRX')}`,
    libelle: `Vente ${order.product_name || order.numero_commande || order.id || ''}`.trim(),
    montant: paid,
    date: order.date || order.date_commande,
    related_id: order.id,
    client_id: order.client_id,
    paiement: order.moyen_paiement || order.paiement || order.payment_method,
    statut: paid >= total ? 'paye' : 'partiel',
  });
};
