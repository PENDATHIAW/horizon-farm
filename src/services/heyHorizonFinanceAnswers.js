/**
 * Hey Horizon Finance - réponses rule-based alignées au system prompt officiel.
 * Vérités canoniques via buildOfficialTreasuryView (cashNet, creancesReelles, payablesTotal, margeReelle).
 */

import {
  buildCashFlowForecast,
  buildExecutiveFinancialSituation,
  buildFinanceReconciliationView,
  buildFinancingView,
  buildPayablesAging,
  buildReceivablesAging,
} from '../utils/financePilotageV2.js';
import {
  buildFinancePilotageInput,
  buildFinanceSchedule,
  buildOfficialTreasuryView,
  buildProfitabilityView,
} from '../utils/financePilotageCore.js';
import {
  buildEnhancedRepaymentCapacity,
  buildFinancingSimulator,
} from '../utils/financePilotageV3.js';
import { aggregateMissingProofTransactions } from '../modules/finance/financeVisionHelpers.js';
import { EMPTY_STATE_FINANCE_QA, hasMinimumFinanceData } from '../utils/financeEmptyState.js';
import { fmtCurrency } from '../utils/format.js';
import { remainingForOrder } from '../utils/salesStatuses.js';
import {
  buildFinanceAnswerPayload,
  CANONICAL_FINANCE_SOURCES,
} from './heyHorizonFinancePrompt.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

const SRC = CANONICAL_FINANCE_SOURCES;

export function detectFinancePilotageQuery(text = '') {
  const q = low(text);
  if (!q) return null;

  if (/generer.*relance|genere.*relance|message.*relance|relance.*sms|relance.*whatsapp|relance.*email/.test(q)) return 'recovery';
  if (/collision|cash projete|tresorerie.*negative|rupture.*tresorerie/.test(q)) return 'collision';
  if (/roi|payback|retour.*investissement|amortissement.*invest/.test(q)) return 'roi_investments';
  if (/rapprochement|reconciliation|lier.*paiement|paiement.*sans.*finance/.test(q)) return 'reconciliation';
  if (/arbitre|reporter.*paiement|paiements.*prioritaires|tresorerie.*faible/.test(q)) return 'treasury_arbitrator';
  if (/emprunter|emprunt|pret|capacite.*remboursement|combien.*emprunter|endettement/.test(q)) return 'borrow';
  if (/tresorerie.*30|tiendra.*30|30 jours|tenir.*30/.test(q)) return 'treasury_30';
  if (/creance|relancer|encaisser/.test(q) && !/client.*doit/.test(q)) return 'receivables';
  if (/dettes?.*(payer|semaine)|quelles dettes|payer.*cette/.test(q)) return 'debts_pay';
  if (/document.*banque|banque|dossier.*financ|preparation.*dossier/.test(q)) return 'bank_docs';
  if (/aujourd.*financ|faire.*financ|que dois.*faire/.test(q)) return 'today_finance';
  if (/situation financiere|resume.*financ|resumer.*financ/.test(q)) return 'summary';
  if (/ferme.*fragile|fragile.*ferme|fragile.*financ/.test(q)) return 'fragile_farm';
  if (/financement|remboursement|dscr/.test(q)) return 'financing';
  if (/risque.*tresorerie|tension.*tresorerie|cash.?flow/.test(q)) return 'treasury_risk';
  if (/rentabilite|marge.*reelle|resultat operationnel/.test(q)) return 'profitability';
  return null;
}

function buildEmptyAnswer(title = 'Hey Horizon Finance') {
  return buildFinanceAnswerPayload({
    type: 'finance_empty',
    title,
    situation: 'Aucune donnée financière exploitable dans l\'ERP.',
    cause: 'Pas encore de dépense, vente ou paiement enregistré.',
    action: 'Enregistrez une première dépense, vente ou paiement depuis Commercial ou Trésorerie.',
    sources: [],
    rows: [],
    confidence: 95,
    insufficientData: true,
    extra: { summary: EMPTY_STATE_FINANCE_QA },
  });
}

function financePropsFromDataMap(dataMap = {}) {
  return {
    transactions: arr(dataMap.finances || dataMap.transactions),
    salesOrders: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    payments: arr(dataMap.paymentsAll || dataMap.payments),
    fournisseurs: arr(dataMap.fournisseurs),
    stocks: arr(dataMap.stock || dataMap.stocks),
    investissements: arr(dataMap.investissements),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    bpInvestmentLines: arr(dataMap.bpInvestmentLines),
    bpRecurringCosts: arr(dataMap.bpRecurringCosts),
    bpFundingSources: arr(dataMap.bpFundingSources),
    documents: arr(dataMap.documents),
    tasks: arr(dataMap.taches || dataMap.tasks),
    accessibleFarms: arr(dataMap.accessibleFarms),
    farmScope: dataMap.farmScope,
  };
}

function buildContext(props = {}) {
  const options = {
    accessibleFarms: props.accessibleFarms,
    farmScope: props.farmScope,
    bpRecurringCosts: props.bpRecurringCosts,
    bpFundingSources: props.bpFundingSources,
    tasks: props.tasks,
    referenceDate: today(),
  };
  const treasury = buildOfficialTreasuryView(props);
  const profitability = buildProfitabilityView(props);
  const forecast = buildCashFlowForecast(props, options);
  const schedule = buildFinanceSchedule(props, options);
  const executive = buildExecutiveFinancialSituation(props, options);
  const receivablesAging = buildReceivablesAging(props, options);
  const payablesAging = buildPayablesAging(props, options);
  const financing = buildFinancingView(props, options);
  const reconciliation = buildFinanceReconciliationView(props, options);
  const input = buildFinancePilotageInput(props);
  const missingProof = aggregateMissingProofTransactions(input.transactions);
  const capacity = buildEnhancedRepaymentCapacity(props, options);
  return {
    treasury,
    profitability,
    forecast,
    schedule,
    executive,
    receivablesAging,
    payablesAging,
    financing,
    reconciliation,
    input,
    missingProof,
    capacity,
    options,
  };
}

function collectReceivableRows(input = {}) {
  const ref = today();
  return arr(input.salesOrders).map((order) => {
    const rest = remainingForOrder(order, input.payments);
    const due = order.date_echeance || order.due_date || order.date || order.created_at || '';
    const dueStr = String(due).slice(0, 10);
    const delayDays = dueStr ? Math.max(0, Math.round((new Date(ref) - new Date(dueStr)) / 86400000)) : 0;
    return {
      name: order.client_nom || order.customer_name || 'Client',
      rest,
      id: order.id,
      dueStr,
      delayDays,
    };
  }).filter((r) => r.rest > 0);
}

function sortReceivables(rows = []) {
  return [...rows].sort((a, b) => {
    if (b.rest !== a.rest) return b.rest - a.rest;
    if (b.delayDays !== a.delayDays) return b.delayDays - a.delayDays;
    return String(a.dueStr).localeCompare(String(b.dueStr));
  });
}

function debtPriorityScore(item = {}) {
  const text = low(`${item.title || ''} ${item.detail || ''}`);
  if (/aliment|provende|feed/.test(text)) return 0;
  if (/sant|vaccin|veto|medicament/.test(text)) return 1;
  if (/intrant|semence|engrais|culture/.test(text)) return 2;
  if (/fournisseur/.test(text)) return 3;
  return 4;
}

function collectPayableItems(payablesAging = {}) {
  const items = [];
  Object.values(payablesAging.buckets || {}).forEach((bucket) => {
    arr(bucket.items).forEach((item) => items.push(item));
  });
  return items.sort((a, b) => {
    const pa = debtPriorityScore(a);
    const pb = debtPriorityScore(b);
    if (pa !== pb) return pa - pb;
    return n(b.amount) - n(a.amount);
  });
}

function weekOutflows(schedule = {}) {
  const buckets = schedule.buckets || {};
  return [
    ...arr(buckets.overdue?.outflows),
    ...arr(buckets.today?.outflows),
    ...arr(buckets.week?.outflows),
  ];
}

function buildRecoveryTemplates(clientName = 'Client', amount = 0, orderId = '') {
  const amt = fmtCurrency(amount);
  return {
    sms: `Bonjour ${clientName}, rappel amical : reste ${amt} sur commande ${orderId}. Merci de confirmer le paiement. - Horizon Farm`,
    whatsapp: `Bonjour ${clientName},\n\nJe vous contacte concernant le solde de ${amt} (commande ${orderId}).\nMerci de nous indiquer la date d'encaissement prévue.\n\nCordialement,\nHorizon Farm`,
    email: `Objet : Rappel de paiement - ${orderId}\n\nBonjour ${clientName},\n\nNous constatons un solde de ${amt} sur la commande ${orderId}.\nMerci de procéder au règlement ou de nous confirmer votre échéance.\n\nCordialement,\nL'équipe Horizon Farm`,
  };
}

export function buildFinancePilotageAnswer(type = '', dataMap = {}) {
  const props = financePropsFromDataMap(dataMap);

  if (!hasMinimumFinanceData(props)) {
    return buildEmptyAnswer();
  }

  const ctx = buildContext(props, dataMap);
  const { treasury, profitability, forecast, schedule, executive, reconciliation, financing, input, missingProof, capacity } = ctx;

  switch (type) {
    case 'treasury_30': {
      if (!forecast.ready) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Trésorerie 30 jours',
          situation: 'Prévision impossible : aucun historique financier exploitable.',
          cause: 'Pas assez d\'échéances ou de flux datés pour projeter 30 jours.',
          action: 'Complétez l\'échéancier (dates de paiement et encaissement) puis réessayez.',
          sources: [SRC.treasuryAvailable],
          confidence: 92,
        });
      }
      const holds = forecast.projection30 >= 0;
      return buildFinanceAnswerPayload({
        type,
        title: 'Trésorerie 30 jours',
        situation: `Trésorerie disponible ${fmtCurrency(treasury.treasuryAvailable)} · projection 30j ${fmtCurrency(forecast.projection30)} · risque ${forecast.riskLabel}.`,
        cause: holds
          ? `Encaissements prévus (${fmtCurrency(schedule.totals.inflows)}) couvrent les sorties planifiées (${fmtCurrency(schedule.totals.outflows)}).`
          : 'Les paiements prévus et charges récurrentes dépassent la trésorerie et encaissements attendus.',
        action: holds
          ? 'Poursuivre le suivi hebdomadaire de l\'échéancier.'
          : 'Ouvrez l\'Échéancier : reporter des paiements non critiques ou relancer les créances prioritaires.',
        sources: [SRC.treasuryAvailable, 'buildCashFlowForecast'],
        rows: [
          { title: 'Projection 30j', value: fmtCurrency(forecast.projection30), module: 'finance_pilotage' },
          { title: 'Risque', value: forecast.riskLabel, module: 'finance_pilotage' },
        ],
        confidence: 92,
      });
    }

    case 'receivables': {
      const sorted = sortReceivables(collectReceivableRows(input));
      const total = sorted.reduce((s, r) => s + r.rest, 0);
      const top = sorted[0];
      const detailLines = sorted.slice(0, 5).map((r) => `${r.name} · ${fmtCurrency(r.rest)} · retard ${r.delayDays}j`);
      return buildFinanceAnswerPayload({
        type,
        title: 'Créances à relancer',
        situation: sorted.length
          ? `${sorted.length} créance(s) ouverte(s) - total ${fmtCurrency(total)}.`
          : 'Aucune créance client ouverte.',
        cause: sorted.length
          ? 'Ventes non totalement encaissées (creancesReelles ERP).'
          : 'Toutes les ventes suivies sont encaissées ou sans reste à payer.',
        action: top
          ? `Relance prioritaire : ${top.name} - ${fmtCurrency(top.rest)} (commande ${top.id}).`
          : 'Aucune relance nécessaire aujourd\'hui.',
        sources: [SRC.receivables],
        rows: sorted.slice(0, 6).map((r) => ({
          title: r.name,
          detail: `Retard ${r.delayDays}j · ${r.dueStr || '-'}`,
          value: fmtCurrency(r.rest),
          module: 'commercial',
          orderId: r.id,
        })),
        route: sorted.length ? 'commercial' : 'finance_pilotage',
        confidence: 91,
        extra: { detailLines },
      });
    }

    case 'debts_pay': {
      const items = collectPayableItems(ctx.payablesAging);
      const weekPay = weekOutflows(schedule);
      const weekTotal = weekPay.reduce((s, r) => s + n(r.amount), 0);
      const top = items[0];
      return buildFinanceAnswerPayload({
        type,
        title: 'Dettes à payer',
        situation: `Dettes consolidées ${fmtCurrency(treasury.payables)} · échéances 7 jours ${fmtCurrency(weekTotal)}.`,
        cause: weekTotal > treasury.treasuryAvailable
          ? 'Les paiements de la semaine dépassent la trésorerie disponible (cashNet).'
          : 'Dettes fournisseurs et charges impayées suivies dans payablesTotal.',
        action: top
          ? `Priorité : ${top.title} - ${fmtCurrency(top.amount)} (${top.detail || top.source}).`
          : 'Consultez l\'onglet Dettes pour la liste complète.',
        sources: [SRC.payables, SRC.treasuryAvailable],
        rows: items.slice(0, 6).map((item) => ({
          title: item.title,
          detail: item.detail || item.source,
          value: fmtCurrency(item.amount),
          module: 'finance_pilotage',
        })),
        confidence: 88,
      });
    }

    case 'borrow': {
      const sim = buildFinancingSimulator(props, ctx.options);
      if (!profitability.ready && treasury.realMargin <= 0 && !capacity.preciseEstimateAvailable) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Capacité d\'emprunt',
          situation: 'Capacité d\'endettement non calculable.',
          cause: 'Marge réelle et résultat opérationnel insuffisants ou non consolidés.',
          action: 'Enregistrez ventes et charges, puis complétez le simulateur Financement.',
          sources: [SRC.realMargin, SRC.operatingResult],
          confidence: 85,
        });
      }
      if (!sim.ready) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Capacité d\'emprunt',
          situation: 'Capacité d\'endettement non calculable sans paramètres de financement.',
          cause: sim.message || 'Montant ou durée de prêt non renseignés.',
          action: 'Onglet Financement : montant, durée, taux, puis relancer la question.',
          sources: [SRC.treasuryAvailable, SRC.realMargin],
          confidence: 82,
        });
      }
      return buildFinanceAnswerPayload({
        type,
        title: 'Emprunt prudent',
        situation: `Mensualité estimée ${fmtCurrency(sim.monthlyPayment)} · prudence ${sim.prudenceLabel} · DSCR ${sim.dscr ?? '-'}.`,
        cause: `Basé sur trésorerie ${fmtCurrency(treasury.treasuryAvailable)}, marge réelle ${fmtCurrency(treasury.realMargin)}, dettes ${fmtCurrency(treasury.payables)}.`,
        action: sim.prudence === 'low'
          ? 'Reporter l\'emprunt ou réduire le montant - simulation indicative à confirmer avec la banque.'
          : 'Préparer le dossier bancaire (onglet Financement) avec les exports PDF.',
        sources: [SRC.treasuryAvailable, SRC.realMargin, SRC.payables, 'buildFinancingSimulator'],
        confidence: 88,
        extra: { disclaimer: sim.disclaimer },
      });
    }

    case 'today_finance': {
      const actions = [];
      const recv = sortReceivables(collectReceivableRows(input));
      if (recv[0]) actions.push(`Relancer ${recv[0].name} (${fmtCurrency(recv[0].rest)})`);
      const payItems = collectPayableItems(ctx.payablesAging);
      if (payItems[0]) actions.push(`Payer ${payItems[0].title} (${fmtCurrency(payItems[0].amount)})`);
      if (missingProof.length) actions.push(`${missingProof.length} justificatif(s) à attacher`);
      if (reconciliation.anomalies?.length) actions.push(`${reconciliation.anomalies.length} rapprochement(s) en attente`);
      if (forecast.ready && forecast.risk === 'high') actions.push('Sécuriser la trésorerie 30 jours');
      const top3 = actions.slice(0, 3);
      return buildFinanceAnswerPayload({
        type,
        title: 'Priorités du jour',
        situation: top3.length ? top3.join(' · ') : 'Aucune urgence financière détectée.',
        cause: 'Synthèse créances, dettes, preuves et rapprochements ERP.',
        action: executive.priorityAction?.label || 'Poursuivre le suivi hebdomadaire.',
        sources: [SRC.treasuryAvailable, SRC.receivables, SRC.payables],
        route: executive.priorityAction?.tab ? 'finance_pilotage' : 'finance_pilotage',
        confidence: 90,
      });
    }

    case 'summary': {
      const riskLabel = forecast.ready ? forecast.riskLabel : 'Non calculable';
      const opResult = profitability.ready ? fmtCurrency(profitability.profit.operatingResult) : 'Non calculable';
      return buildFinanceAnswerPayload({
        type,
        title: 'Situation financière',
        situation: `TRÉSORERIE ${fmtCurrency(treasury.treasuryAvailable)} · CRÉANCES ${fmtCurrency(treasury.receivables)} · DETTES ${fmtCurrency(treasury.payables)} · MARGE RÉELLE ${fmtCurrency(treasury.realMargin)}.`,
        cause: `Résultat opérationnel ${opResult} · risque trésorerie ${riskLabel}.`,
        action: executive.priorityAction?.label || 'Consulter le Résumé Finance.',
        sources: [SRC.treasuryAvailable, SRC.receivables, SRC.payables, SRC.realMargin, SRC.operatingResult],
        rows: [
          { title: 'Position nette', value: fmtCurrency(treasury.netPosition), module: 'finance_pilotage' },
        ],
        confidence: 93,
      });
    }

    case 'bank_docs': {
      const docs = arr(financing.documents);
      const required = ['business plan', 'bp', 'releve', 'facture', 'bilan', 'plan'];
      const present = docs.map((d) => low(d.title || d.nom || ''));
      const missing = ['Business plan actif', 'Relevé / historique CA', 'Justificatifs investissements']
        .filter((label, i) => {
          const key = required[i] || low(label);
          return !present.some((p) => p.includes(key.split(' ')[0]));
        });
      const prepPct = Math.round(((3 - missing.length) / 3) * 100);
      return buildFinanceAnswerPayload({
        type,
        title: 'Dossier bancaire',
        situation: `Documents présents : ${docs.length}. Manquants estimés : ${missing.length}.`,
        cause: missing.length
          ? `Pièces absentes : ${missing.join(', ')}.`
          : 'Base documentaire financière renseignée.',
        action: `Niveau de préparation du dossier bancaire : ${prepPct} %. Complétez Annexe / Financement.`,
        sources: ['buildFinancingView', 'documents'],
        route: 'finance_pilotage',
        confidence: 84,
        extra: { preparationPct: prepPct, missing },
      });
    }

    case 'recovery': {
      const sorted = sortReceivables(collectReceivableRows(input));
      const top = sorted[0];
      if (!top) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Relance client',
          situation: 'Aucune créance à relancer.',
          cause: 'creancesReelles = 0.',
          action: 'Aucune relance à envoyer.',
          sources: [SRC.receivables],
          confidence: 90,
        });
      }
      const templates = buildRecoveryTemplates(top.name, top.rest, top.id);
      return buildFinanceAnswerPayload({
        type,
        title: 'Relance client',
        situation: `Relance prioritaire : ${top.name} - ${fmtCurrency(top.rest)}.`,
        cause: `Créance ouverte commande ${top.id}, retard ${top.delayDays} jour(s).`,
        action: 'Copiez le message adapté (SMS, WhatsApp ou email) ci-dessous.',
        sources: [SRC.receivables],
        route: 'commercial',
        confidence: 91,
        extra: { templates },
      });
    }

    case 'treasury_arbitrator': {
      const weekPay = weekOutflows(schedule);
      const lowTreasury = treasury.treasuryAvailable < weekPay.reduce((s, r) => s + n(r.amount), 0);
      const defer = weekPay.filter((r) => !/aliment|sant|vaccin|intrant/.test(low(r.label || r.title || '')));
      const priority = weekPay.filter((r) => /aliment|sant|vaccin|intrant/.test(low(r.label || r.title || '')));
      return buildFinanceAnswerPayload({
        type,
        title: 'Arbitre trésorerie',
        situation: `Trésorerie ${fmtCurrency(treasury.treasuryAvailable)} · paiements 7j ${fmtCurrency(weekPay.reduce((s, r) => s + n(r.amount), 0))}.`,
        cause: lowTreasury
          ? 'Trésorerie insuffisante pour couvrir tous les paiements de la semaine.'
          : 'Trésorerie couvre les échéances court terme.',
        action: lowTreasury
          ? `Reporter : ${defer.slice(0, 2).map((r) => r.label || r.title).join(', ') || 'charges non critiques'}. Priorité : ${priority.slice(0, 2).map((r) => r.label || r.title).join(', ') || 'aliment / santé / intrants'}.`
          : 'Maintenir les paiements planifiés ; surveiller l\'échéancier.',
        sources: [SRC.treasuryAvailable, SRC.payables],
        confidence: 87,
      });
    }

    case 'collision': {
      if (!forecast.ready) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Collision financière',
          situation: 'Détection impossible sans prévision cash-flow.',
          cause: 'Historique de flux insuffisant.',
          action: 'Complétez l\'échéancier puis demandez une analyse 30/60/90 jours.',
          sources: [SRC.treasuryAvailable],
          confidence: 88,
        });
      }
      const collisions = [];
      if (forecast.projection30 < 0) collisions.push({ horizon: '30 jours', amount: forecast.projection30, date: 'J+30' });
      if (forecast.projection60 < 0) collisions.push({ horizon: '60 jours', amount: forecast.projection60, date: 'J+60' });
      if (forecast.projection90 < 0) collisions.push({ horizon: '90 jours', amount: forecast.projection90, date: 'J+90' });
      if (!collisions.length) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Collision financière',
          situation: 'Aucune rupture de trésorerie projetée sur 30/60/90 jours.',
          cause: `Projections : 30j ${fmtCurrency(forecast.projection30)}, 60j ${fmtCurrency(forecast.projection60)}, 90j ${fmtCurrency(forecast.projection90)}.`,
          action: 'Continuer le suivi mensuel.',
          sources: ['buildCashFlowForecast', SRC.treasuryAvailable],
          confidence: 90,
        });
      }
      const first = collisions[0];
      return buildFinanceAnswerPayload({
        type,
        title: 'Collision financière',
        situation: `Cash projeté négatif - ${first.horizon} : ${fmtCurrency(first.amount)} (date estimée ${first.date}).`,
        cause: 'Sorties prévues supérieures aux encaissements sur l\'horizon.',
        action: 'Reporter paiements non critiques, relancer créances, ou ajuster l\'échéancier crédit.',
        sources: ['buildCashFlowForecast'],
        confidence: 91,
        extra: { collisions },
      });
    }

    case 'roi_investments': {
      const invs = arr(props.investissements).filter((row) => n(row.montant ?? row.amount ?? row.valeur) > 0);
      if (!invs.length) {
        return buildFinanceAnswerPayload({
          type,
          title: 'ROI investissements',
          situation: 'Aucun investissement avec montant suivi.',
          cause: 'Pas de données investissements exploitables.',
          action: 'Enregistrez les investissements dans l\'onglet Investissements.',
          sources: ['investissements'],
          confidence: 85,
        });
      }
      const rows = invs.slice(0, 5).map((inv) => {
        const cost = n(inv.montant ?? inv.amount ?? inv.valeur);
        const revenue = n(inv.revenu_annuel ?? inv.ca_annuel ?? inv.retour_annuel);
        const roi = revenue > 0 && cost > 0 ? `${((revenue / cost) * 100).toFixed(0)} %` : '-';
        const payback = revenue > 0 ? `${Math.ceil(cost / revenue)} an(s)` : '-';
        return {
          title: inv.nom || inv.name || inv.id,
          detail: `ROI ${roi} · payback ${payback}`,
          value: fmtCurrency(cost),
          module: 'finance_pilotage',
        };
      });
      return buildFinanceAnswerPayload({
        type,
        title: 'ROI investissements',
        situation: `${invs.length} investissement(s) analysé(s) (données partielles).`,
        cause: 'ROI / payback uniquement si revenu annuel estimé présent sur la fiche.',
        action: 'Complétez revenu annuel estimé sur chaque investissement pour un calcul fiable.',
        sources: ['investissements'],
        rows,
        confidence: 80,
      });
    }

    case 'reconciliation': {
      const anomalies = arr(reconciliation.anomalies);
      const confidenceLabel = anomalies.length === 0 ? 'Élevé' : anomalies.length <= 3 ? 'Moyen' : 'Faible';
      return buildFinanceAnswerPayload({
        type,
        title: 'Rapprochement',
        situation: `${anomalies.length} écart(s) à traiter entre paiements, ventes et finance.`,
        cause: anomalies.slice(0, 3).map((a) => a.title).join(' · ') || 'Flux alignés.',
        action: anomalies[0]?.recommendedAction || 'Onglet Réconciliation : appliquer les rapprochements proposés.',
        sources: ['buildFinanceReconciliationView'],
        route: 'finance_pilotage',
        confidence: anomalies.length ? 75 : 95,
        extra: { confidenceLabel, anomalies: anomalies.slice(0, 5) },
      });
    }

    case 'treasury_risk': {
      if (!forecast.ready) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Risque trésorerie',
          situation: 'Non calculable sans historique de flux.',
          cause: 'Échéancier ou flux insuffisants.',
          action: 'Complétez les dates d\'échéance créances et dettes.',
          sources: [SRC.treasuryAvailable],
          confidence: 90,
        });
      }
      return buildFinanceAnswerPayload({
        type,
        title: 'Risque trésorerie',
        situation: `Risque ${forecast.riskLabel} · projection 30j ${fmtCurrency(forecast.projection30)}.`,
        cause: `Trésorerie actuelle ${fmtCurrency(treasury.treasuryAvailable)} vs dettes ${fmtCurrency(treasury.payables)}.`,
        action: forecast.risk === 'high'
          ? 'Ouvrir Échéancier et Créances en priorité.'
          : 'Surveillance hebdomadaire suffisante.',
        sources: [SRC.treasuryAvailable, 'buildCashFlowForecast'],
        confidence: 90,
      });
    }

    case 'profitability': {
      if (!profitability.ready) {
        return buildFinanceAnswerPayload({
          type,
          title: 'Rentabilité',
          situation: profitability.message || 'Non calculable pour l\'instant.',
          cause: 'CA ou charges insuffisants dans l\'ERP.',
          action: 'Enregistrez ventes et charges métier.',
          sources: [SRC.operatingResult],
          confidence: 88,
        });
      }
      return buildFinanceAnswerPayload({
        type,
        title: 'Rentabilité',
        situation: `Résultat opérationnel ${fmtCurrency(profitability.profit.operatingResult)} · CA ${fmtCurrency(profitability.profit.caTotal)}.`,
        cause: `Marge réelle consolidée ${fmtCurrency(treasury.realMargin)}.`,
        action: profitability.profit.operatingResult >= 0
          ? 'Consolider les marges par activité (onglet Rentabilité).'
          : 'Analyser charges directes et structure (onglet Rentabilité).',
        sources: [SRC.operatingResult, SRC.realMargin],
        confidence: 90,
      });
    }

    default:
      return buildFinanceAnswerPayload({
        type,
        title: 'Hey Horizon Finance',
        situation: `Trésorerie ${fmtCurrency(treasury.treasuryAvailable)} · créances ${fmtCurrency(treasury.receivables)}.`,
        cause: 'Lecture consolidateFinance officielle.',
        action: 'Posez une question précise (trésorerie 30j, créances, dettes, emprunt).',
        sources: [SRC.treasuryAvailable, SRC.receivables],
        confidence: 85,
      });
  }
}
