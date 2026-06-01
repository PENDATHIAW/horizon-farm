import { fmtCurrency } from '../utils/format';
import { investmentAmount, investmentAssetKind, investmentLabel } from '../utils/investmentWorkflows';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function isPaidLine(line = {}) {
  if (line.linked_finance_transaction_id || line.realization_key) return true;
  const status = low(line.statut || line.status);
  return ['effectif', 'paye', 'payé', 'realise', 'réalisé', 'realized'].some((word) => status.includes(word));
}

export function findPaidLinesWithoutAsset(lines = []) {
  return arr(lines)
    .filter((line) => line?.id && !String(line.id).startsWith('off-'))
    .filter((line) => !line.asset_id && !line.asset_created_at)
    .filter((line) => isPaidLine(line))
    .filter((line) => Boolean(investmentAssetKind(line)))
    .map((line) => ({
      id: line.id,
      lineId: line.id,
      title: investmentLabel(line),
      detail: `${investmentAssetKind(line)} · ${fmtCurrency(investmentAmount(line))}`,
      amount: investmentAmount(line),
      assetKind: investmentAssetKind(line),
      line,
    }))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0));
}

export function summarizeInvestmentAssetGaps(lines = []) {
  const rows = findPaidLinesWithoutAsset(lines);
  return {
    count: rows.length,
    rows,
    total: rows.reduce((sum, row) => sum + (row.amount || 0), 0),
  };
}
