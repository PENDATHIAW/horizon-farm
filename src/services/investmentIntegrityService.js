import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const bpId = (row = {}) => clean(row.business_plan_id || row.bp_id || row.investment_id || row.related_id || row.source_record_id);
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.cout ?? row.cost ?? row.montant_total);
const isInvestmentTransaction = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.libelle || ''}`).includes('invest');

export function analyzeInvestmentIntegrity({ investments = [], businessPlans = [], investmentLines = [], fundingSources = [], transactions = [], lots = [], animaux = [], cultures = [] } = {}) {
  const issues = [];
  const bpIds = new Set(arr(businessPlans).map((bp) => clean(bp.id)));
  arr(businessPlans).forEach((bp) => {
    const id = clean(bp.id);
    const lines = arr(investmentLines).filter((line) => bpId(line) === id);
    const funding = arr(fundingSources).filter((source) => bpId(source) === id);
    const trx = arr(transactions).filter((t) => bpId(t) === id || lower(t.libelle).includes(lower(bp.nom || bp.name || bp.title)));
    const planned = lines.reduce((sum, line) => sum + amount(line), 0) || toNumber(bp.montant_prevu ?? bp.budget ?? bp.investissement_initial);
    const real = trx.reduce((sum, t) => sum + amount(t), 0);
    const funded = funding.reduce((sum, s) => sum + amount(s), 0);
    const linkedActivity = arr(lots).some((x) => bpId(x) === id) || arr(animaux).some((x) => bpId(x) === id) || arr(cultures).some((x) => bpId(x) === id);
    if (!funding.length && planned > 0) issues.push({ id, bp, type: 'BP sans financement', amount: planned });
    if (planned > 0 && real <= 0) issues.push({ id, bp, type: 'Investissement prévu sans sortie Finance', amount: planned });
    if (funded > 0 && planned > 0 && funded < planned) issues.push({ id, bp, type: 'Financement incomplet', amount: planned - funded });
    if (['actif', 'en_cours', 'lance', 'lancé'].includes(lower(bp.statut || bp.status)) && !linkedActivity) issues.push({ id, bp, type: 'BP actif sans activité liée' });
    if (planned > 0 && real > planned * 1.15) issues.push({ id, bp, type: 'Dépassement budget', amount: real - planned });
  });
  arr(investments).forEach((inv) => {
    const id = clean(inv.id);
    const relatedBp = bpId(inv);
    if (relatedBp && !bpIds.has(relatedBp)) issues.push({ id, investment: inv, type: 'Investissement lié à BP introuvable' });
    if (toNumber(inv.montant ?? inv.amount) > 0 && !arr(transactions).some((t) => bpId(t) === id || bpId(t) === relatedBp || lower(t.libelle).includes(lower(inv.nom || inv.name || inv.title)))) issues.push({ id, investment: inv, type: 'Investissement sans transaction Finance', amount: toNumber(inv.montant ?? inv.amount) });
  });
  arr(transactions).filter(isInvestmentTransaction).forEach((trx) => {
    const id = bpId(trx);
    if (id && !bpIds.has(id) && !arr(investments).some((inv) => clean(inv.id) === id)) issues.push({ id: trx.id, transaction: trx, type: 'Transaction investissement non liée' });
  });
  return { issues, issueCount: issues.length };
}
