import { isOpportunityOpen } from '../modules/commercial/commercialMetrics.js';
import { comparePilotageKpis, computeSharedPilotageFinanceKpis } from './objectifsCroissanceWorkflow.js';
import { buildPilotageIssueKey } from './centreDecisionWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();

const closedTask = (task = {}) => ['termine', 'terminé', 'terminee', 'terminée', 'annule', 'annulé', 'done', 'closed'].includes(lower(task.status || task.statut));
const closedAlert = (alert = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed'].includes(lower(alert.status || alert.statut));

function taskMatchesRisk(task = {}, risk = {}) {
  const riskId = clean(risk.id);
  const keys = [
    task.issue_key,
    task.task_dedupe_key,
    task.action_key,
    buildPilotageIssueKey('risk', riskId),
    buildPilotageIssueKey('decision', riskId),
  ].map(clean).filter(Boolean);
  const hay = `${task.source_record_id || ''} ${task.related_id || ''} ${task.title || ''} ${task.description || ''}`.toLowerCase();
  return keys.some((key) => key && (task.issue_key === key || task.task_dedupe_key === key))
    || (riskId && hay.includes(riskId.toLowerCase()))
    || (risk.title && hay.includes(lower(risk.title)));
}

function alertMatchesRisk(alert = {}, risk = {}) {
  const riskId = clean(risk.id);
  const hay = `${alert.source_record_id || ''} ${alert.entity_id || ''} ${alert.title || ''} ${alert.message || ''}`.toLowerCase();
  return (riskId && (clean(alert.source_record_id) === riskId || clean(alert.entity_id) === riskId))
    || (risk.title && hay.includes(lower(risk.title)));
}

function taskMatchesOpportunity(task = {}, opportunity = {}) {
  const oppId = clean(opportunity.id || opportunity.opportunity_id);
  if (!oppId) return false;
  return clean(task.opportunity_id) === oppId
    || clean(task.source_record_id) === oppId
    || clean(task.related_id) === oppId
    || lower(task.notes || '').includes(oppId.toLowerCase());
}

export function analyzePilotageIntegrity({
  visionData = {},
  props = {},
  tasks = [],
  alerts = [],
  opportunities = [],
} = {}) {
  const gaps = [];
  const openTasks = arr(tasks).filter((task) => !closedTask(task));
  const openAlerts = arr(alerts).filter((alert) => !closedAlert(alert));
  const openOpportunities = arr(opportunities).length
    ? arr(opportunities).filter(isOpportunityOpen)
    : arr(visionData.openOpportunities);

  const sharedKpis = computeSharedPilotageFinanceKpis({
    salesOrders: props.salesOrders || visionData.sales,
    salesOrdersAll: props.salesOrdersAll || props.salesOrders || visionData.sales,
    payments: props.payments || visionData.payments,
    paymentsAll: props.paymentsAll || props.payments || visionData.payments,
    transactions: props.transactions || props.finances || visionData.payments,
    periodScope: props.periodScope || {},
    periodFiltered: Boolean(visionData.periodFiltered || props.periodFiltered),
  });

  gaps.push(...comparePilotageKpis(visionData, sharedKpis));

  openTasks
    .filter((task) => lower(task.source_module || task.module_lie) === 'centre_ia' && !clean(task.source_record_id))
    .forEach((task) => {
      gaps.push({
        id: `task-no-source-${task.id}`,
        type: 'Action Centre sans source',
        task,
        severity: 'warning',
        action: 'Compléter source_module / source_record_id ou recréer via workflow pilotage',
      });
    });

  openOpportunities.forEach((opp) => {
    const oppId = clean(opp.id || opp.opportunity_id);
    if (!oppId) {
      gaps.push({
        id: `opp-no-id-${labelOf(opp)}`,
        type: 'Opportunité non liée au Commercial',
        opportunity: opp,
        severity: 'warning',
        action: 'Synchroniser depuis sales_opportunities avec identifiant stable',
      });
      return;
    }
    const linkedTask = openTasks.some((task) => taskMatchesOpportunity(task, opp));
    if (!linkedTask && !opp.source_module && !opp.module_source) {
      gaps.push({
        id: `opp-orphan-${oppId}`,
        type: 'Opportunité affichée sans lien Commercial',
        opportunity: opp,
        severity: 'info',
        action: 'Ouvrir Commercial → Opportunités ou créer une recommandation',
      });
    }
  });

  arr(visionData.risks)
    .filter((risk) => risk.tone === 'bad' || lower(risk.severity).includes('critique'))
    .forEach((risk) => {
      const hasTask = openTasks.some((task) => taskMatchesRisk(task, risk));
      const hasAlert = openAlerts.some((alert) => alertMatchesRisk(alert, risk));
      if (!hasTask && !hasAlert) {
        gaps.push({
          id: `risk-no-followup-${risk.id}`,
          type: 'Risque sans alerte/tâche',
          risk,
          severity: 'danger',
          action: 'Créer tâche ou alerte depuis le registre des risques',
        });
      }
    });

  return {
    gaps,
    gapCount: gaps.length,
    kpiGaps: gaps.filter((gap) => gap.type === 'KPI divergent').length,
    orphanActions: gaps.filter((gap) => gap.type === 'Action Centre sans source').length,
    orphanOpportunities: gaps.filter((gap) => gap.type.startsWith('Opportunité')).length,
    risksWithoutFollowUp: gaps.filter((gap) => gap.type === 'Risque sans alerte/tâche').length,
    sharedKpis,
  };
}

function labelOf(row = {}) {
  return row.title || row.client_nom || row.customer_name || row.notes || row.id || 'opportunite';
}
