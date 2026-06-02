import { fmtCurrency, fmtNumber } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const label = (r = {}) => r.produit || r.name || r.nom || r.libelle || r.title || 'Produit';

export function buildAchatsStockSummaryTodos({ lowStock = [], purchasesWithoutStock = [], supplierDebts = [] }) {
  const todos = [];

  arr(lowStock).slice(0, 3).forEach((row) => {
    todos.push({
      id: `low-${row.id || label(row)}`,
      title: `${label(row)} sous seuil`,
      detail: `${fmtNumber(qty(row))} u. · seuil ${fmtNumber(threshold(row))}`,
      tab: 'Stock',
    });
  });

  arr(purchasesWithoutStock).slice(0, 2).forEach((trx) => {
    todos.push({
      id: `pws-${trx.id}`,
      title: `Achat sans entrée stock`,
      detail: `${trx.libelle || trx.title || trx.id} · ${fmtCurrency(n(trx.montant ?? trx.amount))}`,
      tab: 'Achats',
    });
  });

  arr(supplierDebts).slice(0, 2).forEach((sup) => {
    todos.push({
      id: `debt-${sup.id || sup.name}`,
      title: `${sup.name} — dette fournisseur`,
      detail: fmtCurrency(sup.total),
      tab: 'Fournisseurs',
      actionType: 'relance',
      supplier: sup,
    });
  });

  return todos;
}

export function coherenceRowTab(row = {}) {
  if (row.type === 'dette') return 'Fournisseurs';
  if (row.type === 'achat_stock') return 'Achats';
  return 'Stock';
}

export function uniqueTodoCount(todos = []) {
  return new Set(arr(todos).map((row) => row.id)).size;
}
