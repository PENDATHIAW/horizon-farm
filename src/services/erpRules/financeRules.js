const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

export function evaluateFinanceRules(transactions = []) {
  const findings = [];
  arr(transactions).forEach((trx) => {
    if (amount(trx) > 0 && !trx.document_id && !trx.proof_url && !trx.justificatif_id) {
      findings.push({
        id: `finance-no-proof-${trx.id}`,
        module: 'finance_pilotage',
        severity: amount(trx) > 50000 ? 'haute' : 'moyenne',
        title: `Preuve manquante : ${trx.libelle || trx.title || trx.id}`,
        description: `Transaction de ${amount(trx)} FCFA sans justificatif`,
        recommended_action: 'Attacher une preuve ou créer une tâche conformité',
        confidence_score: 0.92,
        auto_action: 'create_task',
        source_records: [{ type: 'finance', id: trx.id }],
      });
    }
  });
  return findings;
}
