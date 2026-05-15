import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const supplierId = (row = {}) => clean(row.fournisseur_id || row.supplier_id || row.vendor_id || row.related_id || row.source_record_id);
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.reste_a_payer);
const isSupplierPayment = (row = {}) => lower(`${row.type || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.categorie || ''} ${row.libelle || ''}`).includes('fournisseur') || lower(row.type) === 'sortie';
const stockSupplierId = (row = {}) => clean(row.fournisseur_id || row.supplier_id || row.vendor_id || row.source_supplier_id);
const hasPhone = (row = {}) => clean(row.telephone || row.phone || row.whatsapp || row.contact);

export function analyzeSupplierIntegrity({ suppliers = [], stocks = [], transactions = [], documents = [] } = {}) {
  const issues = [];
  const supplierIds = new Set(arr(suppliers).map((s) => clean(s.id)));
  const docsBySupplier = new Map();
  arr(documents).forEach((doc) => {
    const id = supplierId(doc);
    if (!id) return;
    docsBySupplier.set(id, (docsBySupplier.get(id) || 0) + 1);
  });

  arr(suppliers).forEach((supplier) => {
    const id = clean(supplier.id);
    const supplierStocks = arr(stocks).filter((stock) => stockSupplierId(stock) === id);
    const supplierTransactions = arr(transactions).filter((trx) => supplierId(trx) === id || lower(trx.libelle).includes(lower(supplier.nom || supplier.name)));
    const debt = toNumber(supplier.dette ?? supplier.solde_du ?? supplier.reste_a_payer) + supplierTransactions.filter((trx) => isSupplierPayment(trx) && ['impaye', 'partiel'].includes(lower(trx.statut || trx.status))).reduce((sum, trx) => sum + amount(trx), 0);
    if (!hasPhone(supplier)) issues.push({ id, supplier, type: 'Contact manquant' });
    if (debt > 0 && !docsBySupplier.get(id)) issues.push({ id, supplier, type: 'Dette sans justificatif', amount: debt });
    if (supplierStocks.length === 0 && lower(supplier.statut || supplier.status || 'actif').includes('actif')) issues.push({ id, supplier, type: 'Fournisseur actif sans stock lié' });
  });

  arr(stocks).forEach((stock) => {
    const id = stockSupplierId(stock);
    if (id && !supplierIds.has(id)) issues.push({ id: stock.id, stock, type: 'Stock lié à fournisseur introuvable' });
    if (!id && toNumber(stock.quantite) > 0 && /intrant|aliment|medicament|vaccin|semence|engrais|stock/.test(lower(`${stock.categorie || ''} ${stock.produit || ''}`))) issues.push({ id: stock.id, stock, type: 'Stock sans fournisseur' });
  });

  arr(transactions).filter(isSupplierPayment).forEach((trx) => {
    const id = supplierId(trx);
    if (id && !supplierIds.has(id)) issues.push({ id: trx.id, transaction: trx, type: 'Paiement fournisseur sans fournisseur valide' });
  });

  return { issues, issueCount: issues.length };
}
