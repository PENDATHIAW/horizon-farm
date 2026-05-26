import { toNumber } from './format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim().toLowerCase();
const nameOf = (supplier = {}) => supplier.nom || supplier.name || supplier.id || '';
const stockSupplierId = (row = {}) => row.fournisseur_id || row.supplier_id || row.fournisseur || row.supplier || '';
const financeSupplierId = (row = {}) => row.fournisseur_id || row.supplier_id || row.related_id || row.entity_id || '';
const isLinked = (value, supplier) => clean(value) === clean(supplier.id) || clean(value) === clean(nameOf(supplier));
const isSupplierExpense = (tx = {}) => clean(tx.type) === 'sortie'
  && tx.cash_effect !== false
  && !tx.is_supplier_accrual
  && !tx.settlement_transaction_id
  && ['fournisseur', 'fournisseurs', 'stock', 'approvisionnement'].some((key) => clean(tx.categorie || tx.module_lie || tx.source_module).includes(key));
const isSupplierDebt = (tx = {}) => clean(tx.type) === 'sortie'
  && !tx.settlement_transaction_id
  && tx.cash_effect !== true
  && ['impaye', 'partiel', 'en_attente', 'a_payer', 'à payer'].includes(clean(tx.statut || tx.status));

export function calculateSupplierSettlement(supplier = {}, { stocks = [], transactions = [], documents = [] } = {}) {
  const stockRows = arr(stocks).filter((row) => isLinked(stockSupplierId(row), supplier));
  const txRows = arr(transactions).filter((row) => isLinked(financeSupplierId(row), supplier) || (clean(row.module_lie).includes('fournisseur') && isLinked(row.related_id, supplier)));
  const docs = arr(documents).filter((doc) => isLinked(doc.fournisseur_id || doc.supplier_id || doc.entity_id || doc.related_id, supplier));
  const achatsStock = stockRows.reduce((sum, row) => sum + toNumber(row.quantite ?? row.quantity) * toNumber(row.prixunit ?? row.prixUnit ?? row.prix_unitaire ?? row.unit_price), 0);
  const paiements = txRows.filter(isSupplierExpense).filter((tx) => !isSupplierDebt(tx)).reduce((sum, tx) => sum + toNumber(tx.montant ?? tx.amount), 0);
  const dettesTransactions = txRows.filter(isSupplierDebt).reduce((sum, tx) => sum + toNumber(tx.reste_a_payer ?? tx.montant ?? tx.amount), 0);
  const dettesDeclarees = toNumber(supplier.dettes);
  const dettes = Math.max(dettesDeclarees, dettesTransactions, Math.max(0, achatsStock - paiements));
  return {
    supplierId: supplier.id,
    stock: stockRows,
    finances: txRows,
    docs,
    achatsStock,
    paiements,
    dettesDeclarees,
    dettesTransactions,
    dettes,
    livraisons: toNumber(supplier.livraisons) || stockRows.length,
    derniersProduits: stockRows.slice(-3).map((row) => row.produit || row.nom || row.id).filter(Boolean).join(', '),
  };
}

export function summarizeSuppliers(suppliers = [], context = {}) {
  const details = arr(suppliers).map((supplier) => ({ supplier, ...calculateSupplierSettlement(supplier, context) }));
  return {
    details,
    totalAchats: details.reduce((sum, item) => sum + item.achatsStock, 0),
    totalPaiements: details.reduce((sum, item) => sum + item.paiements, 0),
    totalDettes: details.reduce((sum, item) => sum + item.dettes, 0),
    suppliersInDebt: details.filter((item) => item.dettes > 0),
  };
}
