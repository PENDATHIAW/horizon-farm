/** Réception stock → fournisseur → finance → document. */
export function validatePurchaseWorkflowLinks({ reception = {}, supplier = null, finance = null, document = null } = {}) {
  const checks = [];
  if (!reception?.id) checks.push({ ok: false, code: 'missing_reception' });
  if (reception && !supplier) checks.push({ ok: false, code: 'missing_supplier' });
  if (reception?.purchase_cost > 0 && !finance) checks.push({ ok: false, code: 'missing_finance' });
  if (finance && !document) checks.push({ ok: false, code: 'missing_proof', severity: 'warn' });
  return { ok: checks.every((c) => c.ok !== false), checks };
}
