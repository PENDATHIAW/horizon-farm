import { toNumber } from './format';
import { makeId } from './ids';

const today = () => new Date().toISOString().slice(0, 10);
const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);

export function calculateStockLossImpact(stock = {}, quantity = 0) {
  const qty = toNumber(quantity);
  const amount = qty * unitPrice(stock);
  return {
    quantity: qty,
    unitPrice: unitPrice(stock),
    amount,
    label: `Perte stock ${stock.produit || stock.nom || stock.id}`,
  };
}

export function buildStockLossFinanceTransaction(stock = {}, quantity = 0) {
  const impact = calculateStockLossImpact(stock, quantity);
  if (impact.amount <= 0) return null;
  return {
    id: makeId('TRX'),
    type: 'sortie',
    libelle: impact.label,
    montant: impact.amount,
    date: today(),
    categorie: 'Perte stock',
    module_lie: 'stock',
    related_id: stock.id,
    source_module: 'stock',
    source_record_id: stock.id,
    statut: 'paye',
    notes: `${impact.quantity} ${stock.unite || ''} perdu(s)`,
  };
}

export function buildStockLossBusinessEvent(stock = {}, quantity = 0) {
  const impact = calculateStockLossImpact(stock, quantity);
  return {
    id: makeId('EVT'),
    event_type: 'perte_stock',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: stock.id,
    title: impact.label,
    description: `${impact.quantity} ${stock.unite || ''} · impact ${impact.amount}`,
    event_date: today(),
    severity: 'warning',
    amount: impact.amount,
  };
}
