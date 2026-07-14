import { fmtCurrency } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export function buildFinanceSummaryTodos({ receivables = [], payables = [], missingProofItems = [] }) {
  const todos = [];

  arr(receivables).slice(0, 2).forEach((row) => {
    todos.push({
      id: `rec-${row.id}`,
      title: row.title,
      detail: `${row.detail || 'Créance'} · ${fmtCurrency(row.amount)}`,
      tab: 'Créances',
      actionTab: 'commercial',
      commercialTab: 'Ventes',
    });
  });

  arr(payables).slice(0, 2).forEach((row) => {
    todos.push({
      id: `pay-${row.id}`,
      title: row.title,
      detail: `${row.detail || 'Dette'} · ${fmtCurrency(row.amount)}`,
      tab: 'Dettes',
      actionTab: 'achats_stock',
      achatsTab: 'Fournisseurs',
    });
  });

  arr(missingProofItems).slice(0, 2).forEach((row) => {
    todos.push({
      id: `proof-${row.id}`,
      title: `Sans justificatif : ${row.title}`,
      detail: `${String(row.date || '-').slice(0, 10)} · ${fmtCurrency(row.amount)}`,
      tab: 'Trésorerie',
    });
  });

  return todos;
}

export function coherenceRowTab(row = {}) {
  if (row.type === 'creance') return 'Créances';
  if (row.type === 'preuve' || row.type === 'impaye') return 'Trésorerie';
  return 'Dettes';
}

export function uniqueTodoCount(todos = []) {
  return new Set(arr(todos).map((row) => row.id)).size;
}
