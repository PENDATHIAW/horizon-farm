import { buildDecisionRecommendationTask } from './decisionCenterWorkflows.js';
import { makeId } from './ids.js';

const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

/** Cibles de navigation explicites — pilotage → module métier source. */
export const PILOTAGE_NAV_TARGETS = {
  stock: { module: 'achats_stock', tab: 'Stock' },
  achats_stock: { module: 'achats_stock', tab: 'Stock' },
  sante: { module: 'elevage', tab: 'Santé' },
  elevage: { module: 'elevage', tab: 'Santé' },
  health: { module: 'elevage', tab: 'Santé' },
  vente: { module: 'commercial', tab: 'Opportunités' },
  commercial: { module: 'commercial', tab: 'Opportunités' },
  clients: { module: 'commercial', tab: 'Clients' },
  finance: { module: 'finance_pilotage', tab: 'Trésorerie' },
  finance_pilotage: { module: 'finance_pilotage', tab: 'Trésorerie' },
  documents: { module: 'documents_rapports', tab: 'Preuves' },
  documents_rapports: { module: 'documents_rapports', tab: 'Preuves' },
  financeur: { module: 'objectifs_croissance', tab: 'Financeurs' },
  objectifs_croissance: { module: 'objectifs_croissance', tab: 'Financeurs' },
  activite_suivi: { module: 'activite_suivi', tab: 'Alertes' },
  centre_ia: { module: 'centre_ia', tab: 'À traiter' },
};

export function buildPilotageIssueKey(scope = 'item', id = '') {
  const safeScope = clean(scope) || 'item';
  const safeId = clean(id) || 'unknown';
  return `pilotage:${safeScope}:${safeId}`;
}

export function inferPilotageNavKey(item = {}) {
  const domain = lower(item.domain || item.category || '');
  const moduleHint = lower(item.module || item.sourceModule || item.source_module || item.navModule || '');
  const title = lower(item.title || '');

  if (item.id === 'cash-negative' || moduleHint.includes('finance') || domain.includes('finance')) return 'finance';
  if (item.opportunity_id || item.commercial_id || /^opp[-_]/i.test(item.id || '') || domain.includes('opportun') || moduleHint.includes('opportun')) return 'vente';
  if (item.id === 'receivable' || domain.includes('commercial') || moduleHint.includes('commercial')) return 'clients';
  if (item.id === 'missing-proof' || domain.includes('document') || moduleHint.includes('document')) return 'documents';
  if (domain.includes('stock') || moduleHint.includes('stock') || moduleHint.includes('achats')) return 'stock';
  if (domain.includes('élevage') || domain.includes('elevage') || domain.includes('santé') || domain.includes('sante') || title.includes('santé') || moduleHint.includes('elevage') || moduleHint.includes('sante')) return 'sante';
  if (domain.includes('financeur') || title.includes('financeur') || title.includes('dossier')) return 'financeur';

  return moduleHint || 'centre_ia';
}

export function resolvePilotageNavigation(item = {}) {
  if (item.navModule && item.navTab) {
    return { module: item.navModule, tab: item.navTab };
  }
  if (item.module && item.navTab) {
    return { module: item.module, tab: item.navTab };
  }
  if (item.finding) {
    const module = item.finding.module || 'activite_suivi';
    const tab = item.finding.tab || PILOTAGE_NAV_TARGETS[inferPilotageNavKey({ module })]?.tab || null;
    return { module, tab };
  }

  const key = inferPilotageNavKey(item);
  const target = PILOTAGE_NAV_TARGETS[key] || PILOTAGE_NAV_TARGETS.centre_ia;
  const tab = item.navTab || item.tab || target.tab;
  return { module: item.navModule || item.module || item.sourceModule || item.source_module || target.module, tab };
}

export function navigateFromPilotageItem(onNavigate, item = {}) {
  if (!onNavigate) return null;
  const { module, tab } = resolvePilotageNavigation(item);
  if (tab) onNavigate(module, { tab });
  else onNavigate(module);
  return { module, tab };
}

export function pilotageSourceFromItem(item = {}, fallbackModule = 'centre_ia') {
  const nav = resolvePilotageNavigation(item);
  const sourceModule = item.source_module || item.sourceModule || nav.module || fallbackModule;
  const sourceId = item.source_record_id || item.source_id || item.entity_id || item.record?.id || item.id || clean(item.title);
  return {
    sourceModule,
    sourceId,
    issueKey: buildPilotageIssueKey(item.kind || item.domain || 'decision', sourceId),
    targetModule: nav.module,
    targetTab: nav.tab,
  };
}

export function buildRiskFollowUpTask(risk = {}, options = {}) {
  const source = pilotageSourceFromItem({ ...risk, kind: 'risk' }, risk.module || 'centre_ia');
  const built = buildDecisionRecommendationTask({
    id: source.sourceId,
    title: `Risque : ${risk.title || 'Sans titre'}`,
    source_module: source.sourceModule,
    target_module: source.targetModule,
    recommendation: `${risk.cause || 'Cause non précisée'}. Action : ${risk.action || 'Traiter le risque'}`,
    severity: risk.tone === 'bad' ? 'critique' : 'warning',
    priority: risk.tone === 'bad' ? 'haute' : 'moyenne',
  }, options);
  if (!built?.task) return null;
  return {
    ...built,
    task: {
      ...built.task,
      issue_key: source.issueKey,
      source_module: source.sourceModule,
      source_record_id: source.sourceId,
      module_lie: source.targetModule,
      priority: risk.tone === 'bad' ? 'critique' : built.task.priority,
      status: 'ouverte',
      description: `${risk.cause || ''} → ${risk.impact || ''}`.trim(),
    },
  };
}

export function buildRiskFollowUpAlert(risk = {}, options = {}) {
  const source = pilotageSourceFromItem({ ...risk, kind: 'risk' }, risk.module || 'centre_ia');
  const severity = risk.tone === 'bad' ? 'critique' : 'warning';
  return {
    alert: {
      id: options.alertId || makeId('ALR'),
      title: `Risque : ${risk.title || 'Sans titre'}`,
      message: `${risk.cause || 'Cause non précisée'} → ${risk.impact || 'Impact à évaluer'}`,
      module_source: 'centre_ia',
      source_module: source.sourceModule,
      source_record_id: source.sourceId,
      issue_key: source.issueKey,
      severity,
      status: 'nouvelle',
      action_recommandee: risk.action || 'Voir module source et traiter le risque',
      entity_type: 'risque',
      entity_id: source.sourceId,
      event_date: options.date || today(),
    },
    event: {
      id: makeId('EVT'),
      event_type: 'decision_risk_alert_created',
      module_source: 'centre_ia',
      entity_type: 'risque',
      entity_id: source.sourceId,
      title: `Alerte risque · ${risk.title || source.sourceId}`,
      description: risk.action || '',
      event_date: options.date || today(),
      severity: severity === 'critique' ? 'warning' : 'info',
      source_module: source.sourceModule,
      source_record_id: source.sourceId,
    },
  };
}

export function buildOpportunityFollowUpTask(opportunity = {}, options = {}) {
  const oppId = opportunity.id || opportunity.opportunity_id || clean(opportunity.title || opportunity.client_nom);
  const source = {
    sourceModule: 'commercial',
    sourceId: oppId,
    issueKey: buildPilotageIssueKey('opportunity', oppId),
    targetModule: 'commercial',
    targetTab: 'Opportunités',
  };
  const built = buildDecisionRecommendationTask({
    id: source.sourceId,
    title: `Suivre opportunité : ${opportunity.title || opportunity.client_nom || oppId}`,
    source_module: source.sourceModule,
    target_module: source.targetModule,
    recommendation: 'Ouvrir le module Commercial et faire avancer le pipeline — pas de saisie vente depuis le Centre décisionnel.',
    severity: 'info',
    priority: 'moyenne',
  }, options);
  if (!built?.task) return null;
  return {
    ...built,
    task: {
      ...built.task,
      issue_key: source.issueKey,
      source_module: source.sourceModule,
      source_record_id: source.sourceId,
      related_id: source.sourceId,
      opportunity_id: oppId,
      module_lie: 'commercial',
      status: 'ouverte',
      notes: `Opportunité commerciale liée (${oppId}). Gérer dans Commercial → Opportunités.`,
    },
  };
}

export function buildPriorityFollowUpTask(item = {}, options = {}) {
  const source = pilotageSourceFromItem({ ...item, kind: 'priority' });
  const built = buildDecisionRecommendationTask({
    id: source.sourceId,
    title: item.title || 'Priorité Centre décisionnel',
    source_module: source.sourceModule,
    target_module: source.targetModule,
    recommendation: item.detail || item.recommendation || 'Traiter la priorité dans le module source.',
    severity: item.tone === 'bad' ? 'critique' : 'warning',
    priority: item.tone === 'bad' ? 'haute' : 'moyenne',
  }, options);
  if (!built?.task) return null;
  return {
    ...built,
    task: {
      ...built.task,
      issue_key: source.issueKey,
      source_module: source.sourceModule,
      source_record_id: source.sourceId,
      module_lie: source.targetModule,
      status: 'ouverte',
      notes: item.detail || built.task.notes,
    },
  };
}

export function buildPriorityFollowUpAlert(item = {}, options = {}) {
  const source = pilotageSourceFromItem({ ...item, kind: 'priority' });
  return {
    alert: {
      id: options.alertId || makeId('ALR'),
      title: item.title || 'Priorité Centre décisionnel',
      message: item.detail || 'Priorité à traiter',
      module_source: 'centre_ia',
      source_module: source.sourceModule,
      source_record_id: source.sourceId,
      issue_key: source.issueKey,
      severity: item.tone === 'bad' ? 'critique' : 'warning',
      status: 'nouvelle',
      action_recommandee: item.detail || 'Voir module source',
      entity_type: 'priorite',
      entity_id: source.sourceId,
    },
  };
}
