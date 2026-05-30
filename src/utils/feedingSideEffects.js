import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import { financeIds } from './sideEffectIds';
import { applyStockMovement } from './stockWorkflows';
import { toNumber } from './format';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

export function buildFeedingFinanceRow({ log = {}, stock = {}, amount = 0, date = '' } = {}) {
  const value = num(amount);
  const logId = clean(log.id);
  if (value <= 0 || !logId) return null;
  const target = log.lot_id || log.animal_id || log.cible_id || log.stock_id || '';
  return {
    id: financeIds.feeding(logId),
    type: 'sortie',
    libelle: `Alimentation ${target || log.categorie || 'élevage'}`,
    montant: value,
    amount: value,
    date: date || log.date || today(),
    categorie: 'Alimentation',
    activite: log.lot_id ? 'avicole' : 'animaux',
    module_lie: 'alimentation',
    related_id: target || log.stock_id || '',
    source_module: 'alimentation',
    source_record_id: logId,
    stock_id: log.stock_id || '',
    statut: 'paye',
    side_effects_managed: true,
    created_from: 'feeding_side_effects',
  };
}

export async function runFeedingSideEffects({
  log = {},
  stock = {},
  stockMovement = null,
  amount = 0,
  transactions = [],
  handlers = {},
  skipFinance = false,
} = {}) {
  if (log?.id) {
    await handlers.onCreateAlimentation?.({
      ...log,
      side_effects_managed: true,
      created_from: log.created_from || 'feeding_side_effects',
    });
  }

  if (stockMovement && handlers.onUpdateStockMovement) {
    await handlers.onUpdateStockMovement(stockMovement);
  } else if (stock?.id && num(stockMovement?.qty ?? log.quantite) > 0) {
    const movement = applyStockMovement(stock, {
      type: 'sortie',
      qty: num(stockMovement?.qty ?? log.quantite),
      motif: log.notes || 'Alimentation',
      date: log.date || today(),
    });
    await handlers.onUpdateStock?.(stock.id, movement.stock);
    if (handlers.onCreateBusinessEvent && movement.event) await handlers.onCreateBusinessEvent(movement.event);
  }

  const financeAmount = num(amount || log.montant_total);
  if (!skipFinance && financeAmount > 0) {
    const financeRow = buildFeedingFinanceRow({ log, stock, amount: financeAmount, date: log.date });
    if (financeRow) {
      const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
      if (!exists) await handlers.onCreateFinanceTransaction?.(financeRow);
      await syncFinanceSideEffects(exists || financeRow, { handlers });
    }
  }

  return { logId: log.id, amount: financeAmount };
}
