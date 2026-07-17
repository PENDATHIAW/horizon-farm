/**
 * Ventilation de la trésorerie par compte (espèces, Wave, Orange Money, banque…)
 * et rapprochement avec les soldes réels saisis par l'éleveur.
 *
 * Principe anti-incohérence : la somme des comptes est TOUJOURS égale au
 * `cashNet` officiel (`consolidateFinance`). Les mouvements réellement rattachés
 * à un moyen de paiement sont ventilés tels quels ; l'écart résiduel dû aux
 * plafonnements / dédoublonnages de la consolidation est isolé, explicite, dans
 * une ligne « Non ventilé ». Jamais deux chiffres de trésorerie qui se
 * contredisent.
 */

import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const methodOf = (row = {}) => lower(row.moyen_paiement ?? row.mode_paiement ?? row.payment_method ?? row.method ?? row.compte ?? row.account ?? '');
const isCancelled = (row = {}) => ['annule', 'annulee', 'annulé', 'annulée', 'cancelled', 'rejete', 'rejeté'].includes(lower(row.statut ?? row.status));
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in', 'recette'].includes(lower(row.type ?? row.nature ?? row.transaction_type));
const isOut = (row = {}) => ['sortie', 'expense', 'out', 'charge', 'depense', 'dépense', 'achat'].includes(lower(row.type ?? row.nature ?? row.transaction_type));
const isPaid = (row = {}) => !['impaye', 'impayé', 'partiel', 'en_retard', 'a_payer', 'à payer', 'due', 'unpaid'].includes(lower(row.statut ?? row.status ?? 'paye'));
const isSalesLike = (row = {}) => ['vente', 'ventes', 'client', 'clients', 'encaissement'].some((key) => lower(`${row.categorie || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.libelle || ''}`).includes(key));

/** Catalogue des comptes canoniques. Ordre = ordre d'affichage. */
export const TREASURY_ACCOUNTS = Object.freeze([
  { key: 'especes', label: 'Espèces' },
  { key: 'wave', label: 'Wave' },
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'banque', label: 'Banque' },
  { key: 'autre', label: 'Autre moyen' },
  { key: 'non_ventile', label: 'Non ventilé' },
]);

const ACCOUNT_LABELS = Object.fromEntries(TREASURY_ACCOUNTS.map((a) => [a.key, a.label]));

/** Normalise un moyen de paiement vers un compte canonique. */
export function normalizeAccount(method = '') {
  const value = lower(method);
  if (!value) return 'non_ventile';
  if (/(esp[eè]ce|cash|liquide|caisse)/.test(value)) return 'especes';
  if (/wave/.test(value)) return 'wave';
  if (/(orange|om\b|o\.m|orange.?money)/.test(value)) return 'orange_money';
  if (/(banque|bank|virement|cheque|chèque|compte.?bancaire|rib|transfer)/.test(value)) return 'banque';
  if (/(free|mtn|moov|mobile.?money|momo|kpay|maxit)/.test(value)) return 'autre';
  return 'autre';
}

function emptyBuckets() {
  const map = {};
  TREASURY_ACCOUNTS.forEach((a) => { map[a.key] = { key: a.key, label: a.label, inflow: 0, outflow: 0, net: 0 }; });
  return map;
}

/**
 * Ventile le cashNet consolidé par compte.
 * @param {object} args
 * @param {object} args.consolidated - sortie de consolidateFinance (au moins cashNet).
 * @param {Array} args.payments - paiements clients (encaissements).
 * @param {Array} args.transactions - lignes finance.
 * @returns {{ cashNet:number, ventile:number, residual:number, accounts:Array }}
 */
export function buildTreasuryByAccount({ consolidated = {}, payments = [], transactions = [] } = {}) {
  const cashNet = toNumber(consolidated.cashNet);
  const buckets = emptyBuckets();

  // Encaissements : paiements clients (source de vérité des entrées de vente).
  arr(payments).filter((p) => !isCancelled(p) && paymentAmount(p) > 0).forEach((p) => {
    const key = normalizeAccount(methodOf(p));
    buckets[key].inflow += paymentAmount(p);
  });

  // Autres entrées (non-vente) et dépenses payées, depuis les lignes finance.
  arr(transactions).filter((t) => !isCancelled(t) && Math.abs(amountOf(t)) > 0).forEach((t) => {
    const key = normalizeAccount(methodOf(t));
    if (isIn(t) && isPaid(t) && !isSalesLike(t)) buckets[key].inflow += amountOf(t);
    else if (isOut(t) && isPaid(t)) buckets[key].outflow += amountOf(t);
  });

  TREASURY_ACCOUNTS.forEach((a) => { buckets[a.key].net = buckets[a.key].inflow - buckets[a.key].outflow; });

  // Ventilé = somme des comptes rattachés à un moyen de paiement réel.
  const attributed = TREASURY_ACCOUNTS.filter((a) => a.key !== 'non_ventile');
  const ventile = attributed.reduce((sum, a) => sum + buckets[a.key].net, 0);

  // Résidu (plafonnement CA, dédoublonnage, charges dérivées non tracées en
  // finance…) : isolé pour que la somme = cashNet officiel, sans contradiction.
  const residual = cashNet - ventile;
  buckets.non_ventile.net += residual;

  return {
    cashNet,
    ventile,
    residual,
    accounts: TREASURY_ACCOUNTS.map((a) => ({ ...buckets[a.key] })),
  };
}

/**
 * Rapprochement ERP ↔ réel : compare chaque solde ERP au solde réel constaté
 * (relevé Wave/OM, comptage caisse). Écart = réel − ERP.
 * @param {object} treasury - sortie de buildTreasuryByAccount.
 * @param {object} realBalances - { [accountKey]: montant réel } (partiel autorisé).
 */
export function buildTreasuryReconciliation(treasury = {}, realBalances = {}) {
  const accounts = arr(treasury.accounts).map((account) => {
    const hasReal = realBalances != null && Object.prototype.hasOwnProperty.call(realBalances, account.key) && realBalances[account.key] !== '' && realBalances[account.key] != null;
    const reel = hasReal ? toNumber(realBalances[account.key]) : null;
    const ecart = hasReal ? reel - toNumber(account.net) : null;
    return {
      ...account,
      label: account.label || ACCOUNT_LABELS[account.key] || account.key,
      reel,
      ecart,
      reconcilie: hasReal ? Math.abs(ecart) < 1 : null,
    };
  });
  const controles = accounts.filter((a) => a.reel != null);
  const ecartTotal = controles.reduce((sum, a) => sum + (a.ecart || 0), 0);
  const totalReel = controles.length ? controles.reduce((sum, a) => sum + toNumber(a.reel), 0) : null;
  return {
    accounts,
    ecartTotal,
    totalReel,
    cashNet: toNumber(treasury.cashNet),
    comptesControles: controles.length,
    aligne: controles.length > 0 && Math.abs(ecartTotal) < 1,
  };
}
