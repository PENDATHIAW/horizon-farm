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

const textOf = (value) => String(value || '').trim().toLowerCase();

export const detectSaleFinanceCategory = (sale = {}) => {
  const source = textOf(sale.source_type || sale.type_vente || sale.activite || sale.activity);
  const product = textOf(sale.product_name || sale.libelle || sale.description || sale.categorie || sale.category);
  const text = `${source} ${product}`;

  if (text.includes('oeuf') || text.includes('œuf')) return { categorie: 'Vente œufs', activite: 'avicole_oeufs' };
  if (text.includes('reforme') || text.includes('réforme')) return { categorie: 'Vente pondeuses réformées', activite: 'avicole_reformes' };
  if (text.includes('chair') || text.includes('poulet') || text.includes('avicole') || text.includes('lot')) return { categorie: 'Vente poulets', activite: 'avicole_chair' };
  if (text.includes('culture') || text.includes('recolte') || text.includes('récolte') || source.includes('culture')) return { categorie: 'Vente récolte', activite: 'cultures' };
  if (text.includes('stock') || source.includes('stock')) return { categorie: 'Vente stock', activite: 'stock' };
  if (text.includes('animal') || text.includes('bovin') || text.includes('ovin') || text.includes('caprin')) return { categorie: 'Vente animaux', activite: 'animaux' };
  return { categorie: 'Autres revenus', activite: sale.activite || 'ventes' };
};

const createFinanceEntry = async ({ id, libelle, montant, date, related_id, client_id, paiement, statut, sale }) => {
  const amount = Number(montant || 0);
  if (!amount || amount <= 0) return null;

  const detected = detectSaleFinanceCategory(sale || {});

  try {
    return await financesService.create({
      id,
      type: 'entree',
      libelle,
      montant: amount,
      date: date || new Date().toISOString().slice(0, 10),
      categorie: detected.categorie,
      activite: detected.activite,
      module_lie: 'ventes',
      related_id: related_id || null,
      client_id: client_id || null,
      paiement: normalizeFinancePaymentMethod(paiement),
      statut: statut || 'paye',
      source_module: 'ventes',
      source_record_id: related_id || null,
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
  sale: payment,
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
    sale: order,
  });
};
