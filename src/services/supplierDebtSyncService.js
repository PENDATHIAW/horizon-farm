import { makeId } from '../utils/ids.js';
import { toNumber } from '../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);

function supplierDebt(row = {}) {
  return num(row.dettes ?? row.dette ?? row.solde_du ?? row.montant_du ?? row.reste_a_payer);
}

function supplierName(row = {}) {
  return row.nom || row.name || row.raison_sociale || row.id || 'Fournisseur';
}

function financeCoversSupplierDebt(transactions = [], supplier = {}, amount = 0) {
  if (amount <= 0) return true;
  const supplierId = String(supplier.id || '').trim();
  const dedupeKey = `supplier-debt-sync:${supplierId || clean(supplierName(supplier))}`;
  const covered = arr(transactions)
    .filter((row) => clean(row.type) === 'sortie' || clean(row.type) === 'expense')
    .filter((row) => {
      const text = clean(`${row.categorie || ''} ${row.libelle || ''} ${row.module_lie || ''} ${row.source_module || ''}`);
      if (clean(row.source_record_id || row.related_id) === clean(dedupeKey)) return true;
      if (supplierId && String(row.supplier_id || row.fournisseur_id || row.related_id || '') === supplierId) return true;
      return text.includes('fournisseur') || text.includes('dette') || text.includes('achat');
    })
    .reduce((sum, row) => sum + num(row.montant ?? row.amount), 0);
  return covered >= amount * 0.85;
}

export function auditSupplierDebtGaps(data = {}) {
  const suppliers = arr(data.fournisseurs);
  const transactions = arr(data.finances || data.transactions);
  const gaps = suppliers
    .map((supplier) => {
      const amount = supplierDebt(supplier);
      if (amount <= 0) return null;
      const missing = !financeCoversSupplierDebt(transactions, supplier, amount);
      return missing ? {
        supplier,
        amount,
        dedupeKey: `supplier-debt-sync:${String(supplier.id || clean(supplierName(supplier)))}`,
        label: supplierName(supplier),
      } : null;
    })
    .filter(Boolean);
  return { gaps, totalMissing: gaps.reduce((sum, row) => sum + row.amount, 0) };
}

export function buildSupplierDebtFinanceRow(gap = {}, date = today()) {
  const value = num(gap.amount);
  if (value <= 0) return null;
  return {
    id: makeId('TRX'),
    type: 'sortie',
    libelle: `Dette fournisseur · ${gap.label}`,
    montant: value,
    amount: value,
    date,
    categorie: 'Fournisseur',
    activite: 'achats',
    module_lie: 'fournisseurs',
    source_module: 'fournisseurs',
    source_record_id: gap.dedupeKey,
    related_id: gap.supplier?.id,
    supplier_id: gap.supplier?.id,
    fournisseur_id: gap.supplier?.id,
    statut: 'impaye',
    transaction_origin: 'supplier_debt_sync',
    side_effects_managed: true,
    created_from: 'supplier_debt_sync',
    notes: `Reste à payer fournisseur consolidé depuis Achats/Fournisseurs. Clé ${gap.dedupeKey}.`,
  };
}

export async function syncSupplierDebtsToFinance({ data = {}, handlers = {} } = {}) {
  const audit = auditSupplierDebtGaps(data);
  const transactions = arr(data.finances || data.transactions);
  let created = 0;
  for (const gap of audit.gaps) {
    const exists = transactions.some((row) => clean(row.source_record_id || row.related_id) === clean(gap.dedupeKey));
    if (exists) continue;
    const row = buildSupplierDebtFinanceRow(gap);
    if (!row || !handlers.onCreateFinanceTransaction) continue;
    await handlers.onCreateFinanceTransaction(row);
    created += 1;
  }
  if (created > 0) await handlers.onRefreshFinances?.();
  return { ...audit, created };
}
