import { formatFindingLabel, hasOpenTaskForHealthFinding } from '../../utils/healthFindingLabels.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

/** Encaissements ventes / flux liés - pas de justificatif séparé requis. */
function isSalesLinkedFinance(trx = {}) {
  const label = low(trx.libelle || trx.title || trx.description || '');
  const cat = low(trx.categorie || trx.category || '');
  const module = low(trx.module_source || trx.source_module || trx.module || '');
  if (label.includes('encaissement')) return true;
  if (label.includes('creance client') || label.includes('créance client')) return true;
  if (cat.includes('vente') || module === 'ventes') return true;
  if (trx.payment_id || trx.order_id || trx.sale_id) return true;
  const related = String(trx.related_id || trx.source_record_id || '');
  if (/CMD|VENTE|PAY|FAC/i.test(related)) return true;
  return false;
}

export function evaluateFinanceRules(transactions = [], tasks = []) {
  const findings = [];
  arr(transactions).forEach((trx) => {
    if (amount(trx) <= 0 || isSalesLinkedFinance(trx)) return;
    if (trx.document_id || trx.proof_url || trx.justificatif_id) return;

    const finding = {
      id: `finance-no-proof-${trx.id}`,
      module: 'finance_pilotage',
      severity: amount(trx) > 50000 ? 'haute' : 'moyenne',
      title: formatFindingLabel('Preuve manquante', trx.libelle || trx.title || trx.id),
      description: `Transaction de ${amount(trx)} FCFA sans justificatif`,
      recommended_action: 'Attacher une preuve ou créer une tâche conformité',
      confidence_score: 0.92,
      auto_action: 'create_task',
      source_records: [{ type: 'finance', id: trx.id }],
    };
    if (hasOpenTaskForHealthFinding(tasks, finding)) return;
    findings.push(finding);
  });
  return findings;
}
