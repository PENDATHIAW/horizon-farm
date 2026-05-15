const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amount = (row = {}) => num(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.prix_total);

export const decisionStatuses = {
  recommended: 'Recommandée',
  draft_created: 'BP brouillon créé',
  accepted: 'Retenue',
  modified: 'Modifiée',
  rejected: 'Refusée',
  executed: 'Exécutée',
  monitoring: 'En suivi',
  profitable: 'Rentable',
  not_profitable: 'Non rentable',
};

export function nextDecisionId(existing = []) {
  const max = arr(existing).reduce((acc, row) => {
    const match = String(row.id || row.recommendation_id || '').match(/RECO-(\d+)/i);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `RECO-${String(max + 1).padStart(4, '0')}`;
}

export function buildDecisionRecord(recommendation = {}, context = {}) {
  const existing = arr(context.existingDecisions);
  const id = recommendation.recommendation_id || recommendation.id || nextDecisionId(existing);
  const date = new Date().toISOString();
  return {
    id: String(id).startsWith('RECO-') ? id : nextDecisionId(existing),
    recommendation_id: String(id).startsWith('RECO-') ? id : nextDecisionId(existing),
    title: recommendation.title || recommendation.businessPlanTitle || 'Recommandation Centre décisionnel',
    activity: recommendation.activity || 'global',
    source_module: 'centre_decisionnel',
    recommendation_date: recommendation.recommendation_date || date,
    status: recommendation.status || 'recommended',
    status_label: decisionStatuses[recommendation.status || 'recommended'],
    business_plan_id: recommendation.business_plan_id || '',
    expected_investment: num(recommendation.expected_investment ?? recommendation.investment_needed),
    expected_revenue: num(recommendation.expected_revenue ?? recommendation.ca_attendu),
    expected_margin: num(recommendation.expected_margin ?? recommendation.marge_attendue),
    actual_investment: 0,
    actual_revenue: 0,
    actual_margin: 0,
    roi_percent: null,
    profitability_status: 'not_evaluable_yet',
    non_profitability_reason: '',
    decision_reason: recommendation.recommendation || recommendation.why_now || '',
    bp_tracking_status: 'not_required_yet',
    bp_tracking_alert: '',
    changed_by_user: false,
    last_reviewed_at: '',
    created_at: date,
    updated_at: date,
  };
}

function relatedToDecision(row = {}, decision = {}) {
  const raw = norm(`${row.business_plan_id || ''} ${row.source_recommendation_id || ''} ${row.recommendation_id || ''} ${row.activity || ''} ${row.activite || ''} ${row.source_module || ''} ${row.libelle || ''} ${row.title || ''} ${row.nom || ''}`);
  const keys = [decision.business_plan_id, decision.id, decision.recommendation_id, decision.activity].filter(Boolean).map(norm);
  return keys.some((key) => key && raw.includes(key));
}

function findLinkedBusinessPlan(decision = {}, dataMap = {}) {
  const plans = arr(dataMap.business_plans || dataMap.businessPlans);
  return plans.find((bp) => {
    const bpId = String(bp.id || '');
    const sourceReco = String(bp.source_recommendation_id || bp.recommendation_id || '');
    return Boolean(
      (decision.business_plan_id && bpId === String(decision.business_plan_id)) ||
      (decision.recommendation_id && sourceReco === String(decision.recommendation_id)) ||
      (decision.id && sourceReco === String(decision.id))
    );
  });
}

function isExecutedLike(decision = {}) {
  return ['executed', 'monitoring', 'profitable', 'not_profitable'].includes(decision.status) || num(decision.actual_investment) > 0 || num(decision.actual_revenue) > 0;
}

function buildBpTracking(decision = {}, dataMap = {}) {
  const linkedPlan = findLinkedBusinessPlan(decision, dataMap);
  const executed = isExecutedLike(decision);
  if (!executed) {
    return {
      linkedPlan,
      bp_tracking_status: linkedPlan ? 'draft_available' : 'not_required_yet',
      bp_tracking_alert: linkedPlan ? 'BP brouillon disponible pour étude.' : '',
    };
  }
  if (!linkedPlan) {
    return {
      linkedPlan: null,
      bp_tracking_status: 'missing_bp',
      bp_tracking_alert: 'Alerte : décision exécutée sans business plan lié. Rentabilité réelle non traçable correctement.',
    };
  }
  return {
    linkedPlan,
    bp_tracking_status: 'linked_bp',
    bp_tracking_alert: 'BP lié : rentabilité traçable via Investissements, dépenses, ventes et paiements associés.',
  };
}

export function evaluateDecisionProfitability(decision = {}, dataMap = {}) {
  const tracking = buildBpTracking(decision, dataMap);
  const normalizedDecision = {
    ...decision,
    business_plan_id: decision.business_plan_id || tracking.linkedPlan?.id || '',
  };
  const transactions = arr(dataMap.finances || dataMap.transactions).filter((row) => relatedToDecision(row, normalizedDecision));
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders).filter((row) => relatedToDecision(row, normalizedDecision));
  const payments = arr(dataMap.payments).filter((row) => relatedToDecision(row, normalizedDecision));
  const bpLines = arr(dataMap.bp_investment_lines || dataMap.bpInvestmentLines).filter((row) => relatedToDecision(row, normalizedDecision));
  const investmentFromLines = bpLines.reduce((sum, row) => sum + num(row.total ?? num(row.quantite) * num(row.prix_unitaire)), 0);
  const expenses = transactions.filter((row) => ['sortie', 'depense', 'dépense', 'charge', 'achat'].some((x) => norm(row.type || row.categorie).includes(x))).reduce((sum, row) => sum + amount(row), 0);
  const revenueSales = sales.reduce((sum, row) => sum + amount(row), 0);
  const revenuePayments = payments.reduce((sum, row) => sum + amount(row), 0);
  const actualInvestment = Math.max(investmentFromLines, expenses, num(normalizedDecision.actual_investment));
  const actualRevenue = Math.max(revenueSales, revenuePayments, num(normalizedDecision.actual_revenue));
  const actualMargin = actualRevenue - actualInvestment;
  const roi = actualInvestment > 0 ? Math.round((actualMargin / actualInvestment) * 100) : null;
  const hasExecution = isExecutedLike({ ...normalizedDecision, actual_investment: actualInvestment, actual_revenue: actualRevenue });

  let profitabilityStatus = 'not_evaluable_yet';
  let reason = '';
  if (!hasExecution) {
    reason = 'Recommandation non exécutée : rentabilité réelle non mesurable.';
  } else if (tracking.bp_tracking_status === 'missing_bp') {
    profitabilityStatus = 'monitoring';
    reason = 'Décision exécutée mais BP absent : rattacher ou créer le business plan avant de juger la rentabilité.';
  } else if (actualInvestment > 0 && actualRevenue === 0) {
    profitabilityStatus = 'monitoring';
    reason = 'Investissement engagé, revenus pas encore constatés ou pas encore reliés.';
  } else if (actualMargin >= 0 && actualRevenue > 0) {
    profitabilityStatus = 'profitable';
    reason = 'Revenus réels supérieurs ou égaux aux investissements/charges reliés.';
  } else if (actualRevenue > 0 && actualMargin < 0) {
    profitabilityStatus = 'not_profitable';
    reason = 'Charges ou investissement supérieurs aux revenus reliés à la décision.';
  }

  return {
    ...normalizedDecision,
    actual_investment: actualInvestment,
    actual_revenue: actualRevenue,
    actual_margin: actualMargin,
    roi_percent: roi,
    profitability_status: profitabilityStatus,
    non_profitability_reason: profitabilityStatus === 'not_profitable' ? reason : normalizedDecision.non_profitability_reason || '',
    profitability_explanation: reason,
    bp_tracking_status: tracking.bp_tracking_status,
    bp_tracking_alert: tracking.bp_tracking_alert,
  };
}

export function buildDecisionHistory(dataMap = {}) {
  const stored = arr(dataMap.decision_history || dataMap.decisionHistory || dataMap.business_events).filter((row) => norm(`${row.source_module || ''} ${row.type_evenement || ''} ${row.event_type || ''}`).includes('centre_decisionnel') || String(row.id || row.recommendation_id || '').startsWith('RECO-'));
  const bpDrafts = arr(dataMap.business_plans || dataMap.businessPlans).filter((bp) => norm(bp.source_module).includes('centre_decisionnel') || bp.source_recommendation_id);
  const generatedFromBp = bpDrafts.map((bp) => buildDecisionRecord({ id: bp.source_recommendation_id, title: bp.nom || bp.title, activity: bp.activite || bp.activity, status: bp.statut === 'refuse' ? 'rejected' : bp.statut === 'confirme' || bp.statut === 'confirmé' ? 'accepted' : 'draft_created', business_plan_id: bp.id, expected_investment: bp.montant_investissement || bp.investment_needed, expected_revenue: bp.ca_attendu || bp.expected_revenue, expected_margin: bp.marge_attendue || bp.expected_margin, recommendation_date: bp.created_at }, { existingDecisions: stored }));
  const merged = [...stored, ...generatedFromBp].reduce((map, row) => {
    const key = row.recommendation_id || row.id || row.business_plan_id;
    if (!map.has(key)) map.set(key, row);
    return map;
  }, new Map());
  const decisions = Array.from(merged.values()).map((row) => evaluateDecisionProfitability(row, dataMap)).sort((a, b) => new Date(b.recommendation_date || b.created_at || 0) - new Date(a.recommendation_date || a.created_at || 0));
  const executed = decisions.filter((d) => isExecutedLike(d));
  const profitable = decisions.filter((d) => d.profitability_status === 'profitable');
  const notProfitable = decisions.filter((d) => d.profitability_status === 'not_profitable');
  const missingBp = decisions.filter((d) => d.bp_tracking_status === 'missing_bp');
  const incrementalRevenue = decisions.reduce((sum, d) => sum + num(d.actual_revenue), 0);
  const totalRevenue = arr(dataMap.sales_orders || dataMap.salesOrders).reduce((sum, row) => sum + amount(row), 0);
  const contributionRate = totalRevenue > 0 ? Math.round((incrementalRevenue / totalRevenue) * 100) : 0;
  return {
    decisions,
    alerts: { missingBp },
    totals: {
      recommended: decisions.length,
      executed: executed.length,
      profitable: profitable.length,
      notProfitable: notProfitable.length,
      missingBp: missingBp.length,
      incrementalRevenue,
      totalRevenue,
      contributionRate,
      successRate: executed.length ? Math.round((profitable.length / executed.length) * 100) : 0,
    },
  };
}

export function explainDecisionNonProfitability(decision = {}) {
  if (decision.bp_tracking_status === 'missing_bp') return decision.bp_tracking_alert || 'BP manquant : rentabilité non traçable.';
  if (decision.profitability_status !== 'not_profitable') return decision.profitability_explanation || 'Rentabilité non négative ou pas encore évaluable.';
  const reasons = [];
  if (num(decision.actual_investment) > num(decision.expected_investment) && num(decision.expected_investment) > 0) reasons.push('investissement réel supérieur au budget prévu');
  if (num(decision.actual_revenue) < num(decision.expected_revenue) && num(decision.expected_revenue) > 0) reasons.push('revenus réels inférieurs au CA attendu');
  if (num(decision.actual_margin) < 0) reasons.push('marge réelle négative');
  if (!reasons.length) reasons.push('charges supérieures aux revenus reliés');
  return `Non-rentabilité expliquée par : ${reasons.join(', ')}.`;
}

export default buildDecisionHistory;
