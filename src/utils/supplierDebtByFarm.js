import { isAllFarmsScope, normalizeFarmScope, rowFarmId } from './farmScope.js';
import { fmtCurrency } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const clean = (value) => String(value || '').trim();
const lower = (value) => String(value || '').toLowerCase();

export function defaultFarmIdForLegacy(accessibleFarms = []) {
  const farms = arr(accessibleFarms);
  const horizon = farms.find((f) => /horizon/i.test(f.name || ''));
  return horizon?.id || farms[0]?.id || null;
}

export function resolveDebtFarmId(row = {}, defaultFarmId = null) {
  return rowFarmId(row) || defaultFarmId || null;
}

function supplierName(sup = {}) {
  return sup.nom || sup.name || sup.raison_sociale || sup.id || 'Fournisseur';
}

function globalSupplierDebt(sup = {}) {
  return n(sup.dettes ?? sup.dette ?? sup.solde ?? sup.reste_a_payer);
}

function debtByFarmMap(supplier = {}) {
  const raw = supplier.debt_by_farm || supplier.debts_by_farm || {};
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return { ...raw };
  return {};
}

/** Dettes ouvertes issues des transactions finance (reste à payer). */
export function computeOpenPayablesFromTransactions(transactions = [], defaultFarmId = null) {
  const buckets = new Map();

  arr(transactions).forEach((tx) => {
    const supplierId = clean(tx.fournisseur_id || tx.supplier_id);
    if (!supplierId) return;
    const remaining = n(tx.reste_a_payer ?? tx.remaining);
    const amount = remaining > 0 ? remaining : (['a_payer', 'impaye', 'impayé', 'partiel', 'unpaid'].includes(lower(tx.statut || tx.status)) ? n(tx.montant ?? tx.amount) : 0);
    if (amount <= 0) return;
    const farmId = resolveDebtFarmId(tx, defaultFarmId) || '__legacy__';
    const key = `${supplierId}::${farmId}`;
    const prev = buckets.get(key) || { supplierId, farmId, amount: 0, transactions: [] };
    prev.amount += amount;
    prev.transactions.push(tx.id);
    buckets.set(key, prev);
  });

  return [...buckets.values()];
}

/** Fusionne dettes globales fournisseur + ventilation par ferme. */
export function computeSupplierDebtByFarm(suppliers = [], transactions = [], options = {}) {
  const defaultFarmId = options.defaultFarmId || defaultFarmIdForLegacy(options.accessibleFarms);
  const payables = computeOpenPayablesFromTransactions(transactions, defaultFarmId);
  const bySupplier = new Map();

  arr(suppliers).forEach((sup) => {
    const id = clean(sup.id);
    if (!id) return;
    const farmMap = debtByFarmMap(sup);
    Object.entries(farmMap).forEach(([farmId, amount]) => {
      if (n(amount) <= 0) return;
      const key = `${id}::${farmId}`;
      const prev = bySupplier.get(key) || { supplierId: id, farmId, amount: 0, name: supplierName(sup) };
      prev.amount += n(amount);
      bySupplier.set(key, prev);
    });
    const globalDebt = globalSupplierDebt(sup);
    const allocated = Object.values(farmMap).reduce((s, v) => s + n(v), 0);
    const unallocated = Math.max(0, globalDebt - allocated);
    if (unallocated > 0) {
      const farmId = resolveDebtFarmId(sup, defaultFarmId) || '__legacy__';
      const key = `${id}::${farmId}`;
      const prev = bySupplier.get(key) || { supplierId: id, farmId, amount: 0, name: supplierName(sup) };
      prev.amount += unallocated;
      prev.legacy = farmId === '__legacy__';
      bySupplier.set(key, prev);
    }
  });

  payables.forEach((row) => {
    const key = `${row.supplierId}::${row.farmId}`;
    const sup = arr(suppliers).find((s) => clean(s.id) === row.supplierId);
    const prev = bySupplier.get(key) || { supplierId: row.supplierId, farmId: row.farmId, amount: 0, name: supplierName(sup || {}) };
    prev.amount = Math.max(prev.amount, row.amount);
    bySupplier.set(key, prev);
  });

  return [...bySupplier.values()].filter((row) => row.amount > 0);
}

export function aggregateSupplierDebtsForScope(suppliers = [], transactions = [], farmScope = {}, accessibleFarms = []) {
  const scope = normalizeFarmScope(farmScope, accessibleFarms);
  const defaultFarmId = defaultFarmIdForLegacy(accessibleFarms);
  const rows = computeSupplierDebtByFarm(suppliers, transactions, { defaultFarmId, accessibleFarms });

  if (isAllFarmsScope(scope)) {
    const consolidated = new Map();
    rows.forEach((row) => {
      const prev = consolidated.get(row.supplierId) || {
        id: row.supplierId,
        name: row.name,
        total: 0,
        byFarm: [],
      };
      prev.total += row.amount;
      prev.byFarm.push({
        farmId: row.farmId,
        amount: row.amount,
        legacy: row.legacy || row.farmId === '__legacy__',
      });
      consolidated.set(row.supplierId, prev);
    });
    return [...consolidated.values()].sort((a, b) => b.total - a.total);
  }

  const farmId = scope.farmId || scope.farm_id;
  const filtered = rows.filter((row) => row.farmId === farmId || (row.farmId === '__legacy__' && !farmId));
  const bySupplier = new Map();
  filtered.forEach((row) => {
    const prev = bySupplier.get(row.supplierId) || { id: row.supplierId, name: row.name, total: 0 };
    prev.total += row.amount;
    bySupplier.set(row.supplierId, prev);
  });
  return [...bySupplier.values()].sort((a, b) => b.total - a.total);
}

export function buildSupplierDebtPatchWithFarm(supplier = {}, remaining = 0, farmId = null, defaultFarmId = null) {
  const resolvedFarm = farmId || resolveDebtFarmId(supplier, defaultFarmId) || defaultFarmId || '__legacy__';
  const currentGlobal = globalSupplierDebt(supplier);
  const farmMap = debtByFarmMap(supplier);
  const nextFarmDebt = n(farmMap[resolvedFarm]) + n(remaining);
  return {
    dettes: currentGlobal + n(remaining),
    dette: currentGlobal + n(remaining),
    debt_by_farm: {
      ...farmMap,
      [resolvedFarm]: nextFarmDebt,
    },
    last_purchase_at: new Date().toISOString(),
  };
}

export function formatSupplierDebtDetail(supplierRow = {}) {
  if (!supplierRow.byFarm?.length) return fmtCurrency(supplierRow.total);
  if (supplierRow.byFarm.length === 1) return fmtCurrency(supplierRow.total);
  return `${fmtCurrency(supplierRow.total)} · ${supplierRow.byFarm.length} ferme(s)`;
}
