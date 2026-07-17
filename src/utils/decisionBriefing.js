/**
 * Briefing décisionnel quotidien : les 3 décisions prioritaires CHIFFRÉES,
 * dérivées des chiffres consolidés fiables (trésorerie par compte, créances,
 * marge réelle, charges non tracées, ruptures de stock, alertes critiques).
 *
 * Lecture seule : n'écrit rien, ne crée rien. Il agrège et classe des signaux
 * déjà calculés pour proposer « quoi faire maintenant, et combien ça pèse ».
 */

import { toNumber } from './format.js';
import {
  buildConsolidationInput,
  consolidateFinance,
  calculateClientSettlement,
} from './financeConsolidationEngine.js';
import { buildTreasuryByAccount } from './treasuryByAccount.js';
import { buildChargesCompletenessAudit } from './chargesCompletenessAudit.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const clientName = (client = {}) => clean(client.nom || client.name || client.raison_sociale || client.id) || 'Client';

const SEVERITY_RANK = { critique: 3, warning: 2, info: 1 };
const isOpenAlert = (row = {}) => !['resolue', 'résolue', 'traitee', 'traitée', 'fermee', 'fermée', 'done', 'closed'].includes(lower(row.status || row.statut));
const isCriticalAlert = (row = {}) => ['critique', 'urgence', 'critical', 'urgent', 'haute', 'high'].includes(lower(row.severity || row.gravite || row.priority));
const isCriticalStock = (row = {}) => {
  const qty = toNumber(row.quantite ?? row.quantity ?? row.stock ?? row.quantite_actuelle);
  const seuil = toNumber(row.seuil_alerte ?? row.seuil ?? row.min_stock ?? row.seuil_critique);
  if (seuil > 0) return qty <= seuil;
  return ['rupture', 'critique', 'alerte'].includes(lower(row.statut_stock || row.status || row.statut));
};

/**
 * @param {object} dataMap - données ferme (alias tolérés : lots/avicole, sante/vaccins…).
 * @returns {{ decisions: Array, cashNet:number, margeReelle:number, generatedAt:string }}
 */
export function buildDecisionBriefing(dataMap = {}) {
  const input = buildConsolidationInput(dataMap);
  const finance = consolidateFinance(input);
  const payments = input.payments;
  const transactions = input.transactions;
  const decisions = [];

  // 1. Créance : le client à relancer qui pèse le plus.
  const clients = arr(dataMap.clients);
  const settlements = clients
    .map((client) => ({ client, settlement: calculateClientSettlement(client, input.salesOrders, payments) }))
    .filter((row) => toNumber(row.settlement.remaining) > 0)
    .sort((a, b) => b.settlement.remaining - a.settlement.remaining);
  if (settlements.length) {
    const top = settlements[0];
    decisions.push({
      key: 'relance_creance',
      severity: 'warning',
      impact: toNumber(top.settlement.remaining),
      title: `Relancer ${clientName(top.client)}`,
      detail: `${Math.round(top.settlement.remaining)} FCFA à encaisser${settlements.length > 1 ? ` · ${settlements.length} clients à relancer` : ''}.`,
      action: 'Relancer le client et encaisser',
      module: 'commercial',
      tab: 'Clients & créances',
    });
  }

  // 2. Trésorerie : négative globale ou compte dans le rouge.
  const treasury = buildTreasuryByAccount({ consolidated: finance, payments, transactions });
  const worstAccount = treasury.accounts
    .filter((account) => account.key !== 'non_ventile')
    .sort((a, b) => a.net - b.net)[0];
  if (toNumber(finance.cashNet) < 0) {
    decisions.push({
      key: 'tresorerie_negative',
      severity: 'critique',
      impact: Math.abs(toNumber(finance.cashNet)),
      title: 'Trésorerie négative',
      detail: `${Math.round(finance.cashNet)} FCFA : les sorties dépassent les entrées encaissées.`,
      action: 'Prioriser les encaissements, différer les dépenses non urgentes',
      module: 'finance_pilotage',
      tab: 'Trésorerie',
    });
  } else if (worstAccount && worstAccount.net < 0) {
    decisions.push({
      key: 'compte_negatif',
      severity: 'warning',
      impact: Math.abs(worstAccount.net),
      title: `Compte ${worstAccount.label} dans le rouge`,
      detail: `${Math.round(worstAccount.net)} FCFA sur ${worstAccount.label} : réapprovisionner ou rapprocher le solde réel.`,
      action: 'Rapprocher le solde réel et rééquilibrer',
      module: 'finance_pilotage',
      tab: 'Trésorerie',
    });
  }

  // 3. Marge réelle négative.
  if (toNumber(finance.margeReelle) < 0) {
    decisions.push({
      key: 'marge_negative',
      severity: 'warning',
      impact: Math.abs(toNumber(finance.margeReelle)),
      title: 'Marge réelle négative',
      detail: `${Math.round(finance.margeReelle)} FCFA : les charges dépassent le chiffre d'affaires.`,
      action: 'Revoir prix de vente et réduire les coûts',
      module: 'finance_pilotage',
      tab: 'Coûts & marges',
    });
  }

  // 4. Charges non tracées → marge faussée.
  const audit = buildChargesCompletenessAudit({
    transactions,
    payments,
    investissements: input.investissements,
    team: arr(dataMap.team || dataMap.farm_rh_directory),
  });
  if (audit.estimatedUntracked > 0) {
    decisions.push({
      key: 'charges_incompletes',
      severity: 'info',
      impact: toNumber(audit.estimatedUntracked),
      title: 'Compléter les charges',
      detail: `~${Math.round(audit.estimatedUntracked)} FCFA de coûts probablement non tracés faussent la marge.`,
      action: audit.gaps[0]?.action || 'Saisir les charges manquantes',
      module: 'finance_pilotage',
      tab: 'Résumé',
    });
  }

  // 5. Ruptures de stock.
  const ruptures = arr(dataMap.stock || dataMap.stocks).filter(isCriticalStock);
  if (ruptures.length) {
    decisions.push({
      key: 'stock_rupture',
      severity: 'critique',
      impact: ruptures.length * 1000, // proxy de priorité (pas un montant réel)
      impactIsCount: true,
      count: ruptures.length,
      title: `${ruptures.length} produit(s) sous seuil`,
      detail: 'Risque de rupture : production ou ventes bloquées.',
      action: 'Réapprovisionner en priorité',
      module: 'achats_stock',
      tab: 'Stock',
    });
  }

  // 6. Alertes critiques ouvertes non couvertes ci-dessus.
  const openCritical = arr(dataMap.alertes || dataMap.alertes_center).filter((row) => isOpenAlert(row) && isCriticalAlert(row));
  if (openCritical.length) {
    decisions.push({
      key: 'alertes_critiques',
      severity: 'critique',
      impact: openCritical.length * 900,
      impactIsCount: true,
      count: openCritical.length,
      title: `${openCritical.length} alerte(s) critique(s) ouverte(s)`,
      detail: 'Des situations urgentes attendent une action.',
      action: 'Traiter les alertes critiques',
      module: 'activite_suivi',
      tab: 'Alertes',
    });
  }

  const ranked = decisions
    .sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0) || (b.impact || 0) - (a.impact || 0))
    .slice(0, 3);

  return {
    decisions: ranked,
    cashNet: toNumber(finance.cashNet),
    margeReelle: toNumber(finance.margeReelle),
    generatedAt: new Date().toISOString(),
  };
}
