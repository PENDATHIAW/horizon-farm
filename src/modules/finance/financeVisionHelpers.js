import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { fmtCurrency } from '../../utils/format.js';
import { formatFindingLabel, hasOpenTaskForHealthFinding, stripRepeatedPrefix } from '../../utils/healthFindingLabels.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total ?? r.valeur ?? r.value);
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);
const isUnpaid = (r = {}) => ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(low(r.statut || r.status || r.payment_status));
const remainingOf = (order = {}, payments = []) => Math.max(0, n(order.montant_total ?? order.total ?? order.amount) - n(order.montant_paye ?? order.paid_amount) - arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + amount(p), 0));

export function buildFinanceHealthSnapshot({ transactions = [], salesOrders = [], payments = [], investments = [], stocks = [] }) {
  const hasFinanceSignal = arr(transactions).some((row) => amount(row) > 0)
    || arr(salesOrders).some((row) => n(row.montant_total ?? row.total ?? row.amount) > 0)
    || arr(payments).some((row) => amount(row) > 0);

  if (!hasFinanceSignal) {
    return {
      score: null,
      insufficientData: true,
      findings: [],
      predictions: [],
      risks: [],
      message: 'Données insuffisantes',
    };
  }

  const data = { finances: transactions, transactions, sales_orders: salesOrders, payments, investissements: investments, stock: stocks };
  const health = runErpHealthEngine(data);
  return {
    score: health.score,
    insufficientData: false,
    findings: health.findings.filter((f) => f.module === 'finance_pilotage' || f.category === 'rentabilite'),
    predictions: health.predictions.filter((p) => p.module === 'finance_pilotage'),
    risks: health.risks.filter((r) => r.domain === 'financier' || r.module === 'finance_pilotage'),
  };
}

export function buildFinanceCoherenceRows(transactions = [], salesOrders = [], payments = [], tasks = []) {
  const rows = [];

  arr(transactions).forEach((trx) => {
    const val = amount(trx);
    if (val > 0 && !hasProof(trx)) {
      const finding = {
        id: `finance-no-proof-${trx.id}`,
        module: 'finance_pilotage',
        severity: val > 50000 ? 'haute' : 'moyenne',
        title: formatFindingLabel('Preuve manquante', trx.libelle || trx.title || trx.id),
        description: `Transaction de ${val} FCFA sans justificatif`,
        recommended_action: 'Attacher une preuve ou créer une tâche conformité',
        confidence_score: 0.92,
        auto_action: hasOpenTaskForHealthFinding(tasks, { id: `finance-no-proof-${trx.id}`, source_records: [{ id: trx.id }] }) ? null : 'create_task',
      };
      rows.push({
        id: `proof-${trx.id}`,
        trxId: trx.id,
        type: 'preuve',
        title: `Sans justificatif : ${stripRepeatedPrefix(trx.libelle || trx.title || trx.id, 'Preuve manquante')}`,
        detail: fmtCurrency(val),
        value: val,
        finding,
      });
    }
    if (isUnpaid(trx) && val > 0) {
      rows.push({
        id: `unpaid-${trx.id}`,
        trxId: trx.id,
        type: 'impaye',
        title: `Impayé : ${trx.libelle || trx.title || trx.id}`,
        detail: fmtCurrency(val),
        value: val,
        finding: {
          id: `finance-unpaid-${trx.id}`,
          module: 'finance_pilotage',
          severity: 'haute',
          auto_action: 'create_task',
          title: `Transaction impayée : ${trx.libelle || trx.id}`,
          description: `${val} FCFA en attente`,
          recommended_action: 'Encaisser ou planifier relance',
          confidence_score: 0.9,
        },
      });
    }
  });

  arr(salesOrders).forEach((order) => {
    const rest = remainingOf(order, payments);
    if (rest > 0) {
      const name = order.client_nom || order.customer_name || 'Client';
      rows.push({
        id: `sale-unpaid-${order.id}`,
        orderId: order.id,
        type: 'creance',
        title: `${name} - créance`,
        detail: fmtCurrency(rest),
        value: rest,
        finding: {
          id: `coh-sale-unpaid-${order.id}`,
          module: 'commercial',
          severity: 'haute',
          auto_action: 'create_task',
          title: `Vente sans paiement complet : ${name}`,
          description: `Reste ${rest} FCFA`,
          recommended_action: 'Encaisser ou créer tâche de relance',
          confidence_score: 0.92,
        },
      });
    }
  });

  return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
}

export function aggregateMissingProofTransactions(transactions = []) {
  return arr(transactions)
    .filter((trx) => amount(trx) > 0 && !hasProof(trx))
    .map((trx) => ({
      id: trx.id,
      title: trx.libelle || trx.title || trx.id,
      amount: amount(trx),
      date: trx.date || trx.created_at,
    }))
    .sort((a, b) => b.amount - a.amount);
}
