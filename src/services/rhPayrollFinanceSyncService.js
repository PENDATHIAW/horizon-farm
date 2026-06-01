import { makeId } from '../utils/ids.js';
import { toNumber } from '../utils/format.js';
import { buildRhSalaryWorkflow, rhPayrollOf } from '../utils/rhWorkflows.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (date = today()) => String(date).slice(0, 7);

function activePerson(row = {}) {
  return !['inactif', 'inactive', 'suspendu', 'suspended'].includes(clean(row.statut || row.status));
}

function financeCoversPayroll(transactions = [], person = {}, period = monthKey()) {
  const personId = clean(person.id);
  const dedupeKey = `rh-payroll-sync:${personId}:${period}`;
  const covered = arr(transactions)
    .filter((row) => clean(row.module_lie || row.source_module) === 'rh' || clean(row.categorie).includes('remuneration') || clean(row.categorie).includes('salaire'))
    .filter((row) => {
      if (clean(row.source_record_id || row.related_id) === dedupeKey) return true;
      if (personId && clean(row.related_id || row.source_record_id || row.entity_id) === personId) {
        return String(row.payroll_period || row.date || '').slice(0, 7) === period;
      }
      return false;
    })
    .reduce((sum, row) => sum + num(row.montant ?? row.amount), 0);
  return covered >= rhPayrollOf(person).net * 0.85;
}

export function auditRhPayrollFinanceGaps(data = {}) {
  const team = arr(data.rh || data.equipe || data.team);
  const transactions = arr(data.finances || data.transactions);
  const period = monthKey();
  const gaps = team
    .filter(activePerson)
    .map((person) => {
      const payroll = rhPayrollOf(person);
      if (payroll.net <= 0) return null;
      if (financeCoversPayroll(transactions, person, period)) return null;
      return {
        person,
        amount: payroll.net,
        period,
        dedupeKey: `rh-payroll-sync:${person.id}:${period}`,
        label: person.nom || person.id,
      };
    })
    .filter(Boolean);
  return { gaps, totalMissing: gaps.reduce((sum, row) => sum + row.amount, 0), period };
}

export async function syncRhPayrollToFinance({ data = {}, handlers = {}, teams = [] } = {}) {
  const audit = auditRhPayrollFinanceGaps(data);
  const transactions = arr(data.finances || data.transactions);
  let created = 0;
  for (const gap of audit.gaps) {
    const exists = transactions.some((row) => clean(row.source_record_id || row.related_id) === clean(gap.dedupeKey));
    if (exists) continue;
    const workflow = buildRhSalaryWorkflow({
      person: gap.person,
      teams,
      amount: gap.amount,
      date: today(),
      transactionId: makeId('TRX'),
    });
    if (!workflow?.financeTransaction || !handlers.onCreateFinanceTransaction) continue;
    await handlers.onCreateFinanceTransaction({
      ...workflow.financeTransaction,
      source_record_id: gap.dedupeKey,
      payroll_period: gap.period,
      transaction_origin: 'rh_payroll_sync',
      created_from: 'rh_payroll_sync',
    });
    if (handlers.onCreateDocument && workflow.document) await handlers.onCreateDocument(workflow.document);
    if (handlers.onCreateBusinessEvent && workflow.event) await handlers.onCreateBusinessEvent(workflow.event);
    created += 1;
  }
  if (created > 0) {
    await Promise.allSettled([
      handlers.onRefreshFinances?.(),
      handlers.onRefreshDocuments?.(),
      handlers.onRefreshBusinessEvents?.(),
    ]);
  }
  return { ...audit, created };
}
