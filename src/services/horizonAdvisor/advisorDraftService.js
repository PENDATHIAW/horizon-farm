/**
 * Horizon Advisor — brouillons d'actions validables (tâche / alerte).
 * Aucune écriture directe : validation utilisateur obligatoire.
 */

import {
  AI_DRAFT_SOURCES,
  TARGET_WORKFLOWS,
  createAiActionDraft,
  markDraftValidated,
} from '../aiGateway/aiActionDrafts.js';
import { applyOneClickRecommendation } from '../heyHorizonRecommendationActions.js';
import { buildPriorityFollowUpAlert, buildPriorityFollowUpTask } from '../../utils/centreDecisionWorkflow.js';
import { redirectToSource, shouldBlockInlineAlertCreation } from '../../utils/antiDuplicationGuard.js';

const arr = (v) => (Array.isArray(v) ? v : []);

function recommendationToFinding(recommendation = {}, actionType = 'task') {
  const base = recommendation.finding || {
    id: recommendation.id,
    module: recommendation.module || recommendation.module_target,
    severity: recommendation.severity || 'moyenne',
    category: recommendation.category || 'advisor',
    title: recommendation.title,
    description: recommendation.summary || recommendation.recommended_action,
    recommended_action: recommendation.recommended_action || recommendation.summary,
    confidence_score: (recommendation.confidence_score || 85) / 100,
    source_records: recommendation.finding?.source_records || [],
  };
  return {
    ...base,
    auto_action: actionType === 'alert' ? 'create_alert' : 'create_task',
  };
}

/**
 * Crée un brouillon d'action advisor (tâche ou alerte).
 */
export function createAdvisorActionDraft(recommendation = {}, { actionType = 'task' } = {}) {
  if (!recommendation?.id) {
    throw new Error('Recommandation advisor invalide');
  }
  const finding = recommendationToFinding(recommendation, actionType);
  const intent = actionType === 'alert' ? 'advisor_create_alert' : 'advisor_create_task';

  return createAiActionDraft({
    intent,
    confidence: finding.confidence_score ?? 0.85,
    source: AI_DRAFT_SOURCES.HEALTH_ENGINE,
    draft: {
      title: recommendation.title,
      summary: recommendation.summary,
      primary_module: recommendation.module_target || recommendation.module,
      preview: {
        finding,
        recommendation,
        action_type: actionType,
      },
      impacted_modules: [recommendation.module_target || recommendation.module].filter(Boolean),
    },
    target_workflow: actionType === 'alert' ? TARGET_WORKFLOWS.OPEN_FORM : TARGET_WORKFLOWS.OPEN_FORM,
    required_validation: true,
    warnings: recommendation.already_tracked ? ['Un suivi similaire semble déjà ouvert.'] : [],
    raw_input: recommendation.title,
    meta: {
      advisor_id: recommendation.id,
      action_type: actionType,
      role: 'primary',
    },
  });
}

export function validateAdvisorDraft(draft = {}, meta = {}) {
  return markDraftValidated(draft, meta);
}

/**
 * Exécute un brouillon advisor validé via workflows existants (erpHealthAutoActions).
 */
export async function executeAdvisorDraft(draft = {}, handlers = {}, options = {}) {
  const validated = draft.user_validated ? draft : validateAdvisorDraft(draft, options.meta);
  if (!validated.user_validated) {
    return { ok: false, error: 'Validation utilisateur requise' };
  }

  const actionType = validated.draft?.preview?.action_type
    || validated.meta?.action_type
    || 'task';
  const finding = validated.draft?.preview?.finding
    || recommendationToFinding(validated.draft?.preview?.recommendation || {}, actionType);
  const moduleId = options.moduleId || 'centre_decisionnel';

  if (actionType === 'alert' && shouldBlockInlineAlertCreation(moduleId)) {
    redirectToSource(handlers.onNavigate, 'alertes_centre_activite');
    const built = buildPriorityFollowUpAlert({
      title: finding.title,
      detail: finding.recommended_action || finding.description,
      tone: finding.severity === 'critique' || finding.severity === 'haute' ? 'bad' : 'warn',
      module: finding.module,
      finding,
    });
    if (typeof handlers.onCreateAlert !== 'function') {
      return { ok: false, error: 'Création alerte indisponible — ouvrez Activité & Suivi' };
    }
    await handlers.onCreateAlert(built.alert);
    await handlers.onRefreshAlertes?.();
    return { ok: true, createdAlerts: 1, redirected: true };
  }

  if (finding.auto_action === 'create_task' || finding.auto_action === 'create_alert') {
    const result = await applyOneClickRecommendation(finding, handlers);
    return { ok: true, ...result };
  }

  if (actionType === 'alert') {
    const built = buildPriorityFollowUpAlert({
      title: finding.title,
      detail: finding.recommended_action || finding.description,
      tone: 'warn',
      module: finding.module,
      finding,
    });
    if (typeof handlers.onCreateAlert !== 'function') {
      return { ok: false, error: 'Création alerte indisponible' };
    }
    await handlers.onCreateAlert(built.alert);
    await handlers.onRefreshAlertes?.();
    return { ok: true, createdAlerts: 1 };
  }

  const built = buildPriorityFollowUpTask({
    title: finding.title,
    detail: finding.recommended_action || finding.description,
    tone: finding.severity === 'critique' || finding.severity === 'haute' ? 'bad' : 'warn',
    module: finding.module,
    finding,
  });
  if (!built?.task || typeof handlers.onCreateTask !== 'function') {
    return { ok: false, error: 'Création tâche indisponible' };
  }
  await handlers.onCreateTask(built.task);
  if (built.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent(built.event);
  }
  await handlers.onRefreshTasks?.();
  return { ok: true, createdTasks: 1 };
}

/**
 * Prépare puis valide et exécute en une séquence contrôlée par l'UI.
 */
export async function prepareValidateExecuteAdvisorAction(recommendation, actionType, handlers, options = {}) {
  const draft = createAdvisorActionDraft(recommendation, { actionType });
  const validated = validateAdvisorDraft(draft, options.meta);
  return executeAdvisorDraft(validated, handlers, options);
}

export default {
  createAdvisorActionDraft,
  validateAdvisorDraft,
  executeAdvisorDraft,
  prepareValidateExecuteAdvisorAction,
};
