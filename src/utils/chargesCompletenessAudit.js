/**
 * Audit d'exhaustivité des charges : « ai-je pris en compte tous les coûts ? »
 *
 * Diagnostic en lecture seule. Il ne crée AUCUNE charge automatiquement (pour ne
 * pas fausser la trésorerie ni doubler des lignes), il signale les angles morts
 * probables et guide la saisie : main-d'œuvre/salaires, charges fixes
 * récurrentes, commissions mobile money, amortissement des investissements.
 */

import { toNumber } from './format.js';
import { rhPayrollOf } from './rhWorkflows.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const isExpense = (row = {}) => ['sortie', 'expense', 'out', 'charge', 'depense', 'dépense', 'achat'].includes(lower(row.type ?? row.transaction_type));
const isCancelled = (row = {}) => ['annule', 'annulee', 'annulé', 'annulée', 'cancelled', 'rejete', 'rejeté'].includes(lower(row.statut ?? row.status));
const txText = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.libelle || ''} ${row.label || ''} ${row.source_module || ''} ${row.module_lie || ''}`);
const dateOf = (row = {}) => String(row.date || row.date_transaction || row.created_at || row.payment_date || '').slice(0, 10);
const activeMember = (person = {}) => !['inactif', 'parti', 'sorti', 'archive', 'archivé', 'termine', 'terminé', 'inactive'].includes(lower(person.statut || person.status || 'actif'));

const MONTH = () => new Date().toISOString().slice(0, 7);
function daysSince(dateStr = '') {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86400000;
}

const isPayrollTx = (row = {}) => /paie|salaire|r[ée]mun[ée]ration|rh\b|employ|personnel|main.?d.?oeuvre|main.?oeuvre/.test(txText(row)) || lower(row.source_module) === 'rh';
const isFixedChargeTx = (row = {}) => /loyer|[ée]lectric|eau\b|facture eau|carburant|[ée]nergie|essence|gasoil|assurance|taxe|imp[oô]t|internet|t[ée]l[ée]phone|abonnement|exploitation/.test(txText(row));
const isCommissionTx = (row = {}) => /commission|frais.?(wave|om|orange|mobile|transfert)|frais bancaire|agios/.test(txText(row));
const isAmortTx = (row = {}) => /amortiss|dotation|d[ée]pr[ée]ciation/.test(txText(row));
const isMobileMoneyPayment = (row = {}) => /wave|orange|om\b|mobile.?money|momo/.test(lower(row.moyen_paiement ?? row.mode_paiement ?? row.payment_method ?? row.method ?? ''));

const SEVERITY_PENALTY = { critique: 30, warning: 18, info: 8 };

/**
 * @param {object} input
 * @param {Array} input.transactions - lignes finance.
 * @param {Array} input.payments - encaissements (pour estimer les commissions MM).
 * @param {Array} input.investissements
 * @param {Array} input.team - annuaire RH (personnes) pour la masse salariale.
 * @param {number} input.mobileMoneyFeeRate - taux indicatif de commission (défaut 1%).
 */
export function buildChargesCompletenessAudit({
  transactions = [],
  payments = [],
  investissements = [],
  team = [],
  mobileMoneyFeeRate = 0.01,
} = {}) {
  const expenses = arr(transactions).filter((t) => isExpense(t) && !isCancelled(t) && amountOf(t) > 0);
  const month = MONTH();
  const gaps = [];

  // 1. Main-d'œuvre / salaires.
  const activeTeam = arr(team).filter(activeMember);
  const expectedPayroll = activeTeam.reduce((sum, person) => sum + toNumber(rhPayrollOf(person).brut), 0);
  const recordedPayrollMonth = expenses.filter((t) => isPayrollTx(t) && dateOf(t).slice(0, 7) === month).reduce((sum, t) => sum + amountOf(t), 0);
  if (expectedPayroll > 0 && recordedPayrollMonth + 1 < expectedPayroll) {
    const shortfall = Math.max(0, expectedPayroll - recordedPayrollMonth);
    gaps.push({
      key: 'main_oeuvre',
      label: 'Main-d’œuvre / salaires',
      severity: recordedPayrollMonth <= 0 ? 'critique' : 'warning',
      detail: `${activeTeam.length} personne(s) active(s), masse salariale ~${Math.round(expectedPayroll)} FCFA/mois ; ${Math.round(recordedPayrollMonth)} FCFA enregistré ce mois.`,
      estimatedImpact: shortfall,
      action: 'Enregistrer les rémunérations du mois (module RH → Paie).',
    });
  }

  // 2. Charges fixes récurrentes (exploitation).
  const hasRecentFixed = expenses.some((t) => isFixedChargeTx(t) && daysSince(dateOf(t)) <= 62);
  const farmActive = expenses.length > 0 || arr(payments).length > 0;
  if (farmActive && !hasRecentFixed) {
    gaps.push({
      key: 'charges_fixes',
      label: 'Charges fixes (loyer, électricité, eau, carburant…)',
      severity: 'warning',
      detail: 'Aucune charge fixe d’exploitation saisie sur les 2 derniers mois alors que la ferme est active.',
      estimatedImpact: null,
      action: 'Saisir les charges récurrentes (loyer, électricité, eau, carburant, assurances, télécom).',
    });
  }

  // 3. Commissions mobile money (Wave / OM).
  const mmVolume = arr(payments).filter((p) => !isCancelled(p) && isMobileMoneyPayment(p)).reduce((sum, p) => sum + paymentAmount(p), 0);
  const hasCommission = expenses.some(isCommissionTx);
  if (mmVolume > 0 && !hasCommission) {
    gaps.push({
      key: 'commissions_mm',
      label: 'Commissions mobile money (Wave / OM)',
      severity: 'info',
      detail: `~${Math.round(mmVolume)} FCFA encaissés via mobile money sans frais de commission enregistrés.`,
      estimatedImpact: Math.round(mmVolume * mobileMoneyFeeRate),
      action: `Saisir les commissions de retrait/transfert (estimé ~${Math.round(mmVolume * mobileMoneyFeeRate)} FCFA à ${Math.round(mobileMoneyFeeRate * 100)}%).`,
    });
  }

  // 4. Amortissement des investissements.
  const investTotal = arr(investissements).reduce((sum, row) => sum + toNumber(row.montant ?? row.amount ?? row.total ?? row.cout ?? row.budget), 0);
  const hasAmort = expenses.some(isAmortTx);
  if (investTotal > 0 && !hasAmort) {
    gaps.push({
      key: 'amortissement',
      label: 'Amortissement des investissements',
      severity: 'info',
      detail: `~${Math.round(investTotal)} FCFA d’investissements comptés en bloc, sans amortissement étalé sur la durée d’usage.`,
      estimatedImpact: null,
      action: 'Étaler le coût des équipements durables (amortissement mensuel) pour un coût de revient réaliste.',
    });
  }

  const estimatedUntracked = gaps.reduce((sum, gap) => sum + (toNumber(gap.estimatedImpact) || 0), 0);
  const score = Math.max(0, 100 - gaps.reduce((sum, gap) => sum + (SEVERITY_PENALTY[gap.severity] || 10), 0));

  return {
    gaps,
    gapCount: gaps.length,
    estimatedUntracked,
    score,
    complete: gaps.length === 0,
    expectedPayroll,
    recordedPayrollMonth,
    mobileMoneyVolume: mmVolume,
  };
}
