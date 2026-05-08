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

export const syncPaymentToFinance = async (payment = {}) => {
  const amount = Number(payment.montant || payment.amount || payment.montant_paye || payment.paid_amount || 0);
  if (!amount || amount <= 0) return null;

  try {
    return await financesService.create({
      id: `TRX-PAY-${payment.id || makeId('TRX')}`,
      type: 'entree',
      libelle: `Paiement vente ${payment.order_id || payment.sale_id || payment.id || ''}`.trim(),
      montant: amount,
      date: payment.date || payment.paid_at || new Date().toISOString().slice(0, 10),
      categorie: 'Vente animaux',
      module_lie: 'ventes',
      related_id: payment.order_id || payment.sale_id || payment.id || null,
      client_id: payment.client_id || null,
      paiement: normalizeFinancePaymentMethod(payment.moyen_paiement || payment.paiement || payment.payment_method),
      statut: payment.statut === 'annule' ? 'annule' : 'paye',
    });
  } catch (error) {
    console.warn('Transaction finance non creee depuis paiement', error.message);
    return null;
  }
};
