import { classifySaleActivity } from '../../services/growthDecisionEngine.js';
import { paymentsForOrder } from '../../utils/financeConsolidationEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const paid = (row = {}) => num(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? row.amount);

/**
 * Réaligne objectifs BP sur encaissements (Wave / Orange Money) plutôt que CA commandé seul.
 */
export function applyEncaissementsToGoals(goals = {}, dataMap = {}) {
  if (!goals?.activities?.length) return goals;

  const payments = arr(dataMap.payments || dataMap.paymentsAll);
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders || dataMap.sales_orders_all);
  const encByAct = {};

  sales.forEach((order) => {
    const key = classifySaleActivity(order, dataMap);
    const enc = paymentsForOrder(order, payments).reduce((sum, p) => sum + paid(p), 0);
    if (enc > 0) encByAct[key] = (encByAct[key] || 0) + enc;
  });

  payments.forEach((payment) => {
    const linked = payment.order_id || payment.sales_order_id || payment.related_id || payment.commande_id;
    if (linked) return;
    const enc = paid(payment);
    if (enc <= 0) return;
    const key = classifySaleActivity(payment, dataMap);
    encByAct[key] = (encByAct[key] || 0) + enc;
  });

  const activities = goals.activities.map((row) => {
    const encaisse = encByAct[row.activity] || 0;
    const realized = encaisse > 0 ? encaisse : row.realized;
    return {
      ...row,
      encaisse,
      realized,
      attainment: row.target ? Math.round((realized / row.target) * 100) : 0,
      remaining: Math.max(0, row.target - realized),
    };
  });

  const totalEncaisse = Object.values(encByAct).reduce((sum, v) => sum + v, 0);
  const globalRealized = totalEncaisse > 0 ? totalEncaisse : goals.global?.realized || 0;
  const monthTarget = goals.global?.monthTarget || 0;

  const global = goals.global
    ? {
      ...goals.global,
      encaisse: totalEncaisse || goals.global.encaisse,
      realized: globalRealized,
      attainment: monthTarget ? Math.round((globalRealized / monthTarget) * 100) : goals.global.attainment,
      remaining: Math.max(0, monthTarget - globalRealized),
    }
    : goals.global;

  return { ...goals, global, activities };
}
