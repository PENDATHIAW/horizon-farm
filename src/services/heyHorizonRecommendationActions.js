import { applyErpHealthAutoActions } from './erpHealthAutoActions.js';

/** Action one-click depuis Hey Horizon : navigation, tâche ou alerte selon finding.auto_action. */
export async function applyOneClickRecommendation(finding, handlers = {}) {
  if (!finding) return { ok: false, reason: 'empty' };

  const {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    existingTasks = [],
    existingAlerts = [],
  } = handlers;

  if (finding.auto_action === 'create_task' || finding.auto_action === 'create_alert') {
    const report = {
      autoTasks: finding.auto_action === 'create_task' ? [finding] : [],
      autoAlerts: finding.auto_action === 'create_alert' ? [finding] : [],
      findings: [finding],
    };
    const result = await applyErpHealthAutoActions(report, {
      existingTasks,
      existingAlerts,
      onCreateTask,
      onCreateAlert,
      onUpdateAlert,
      onCreateBusinessEvent,
    });
    onNavigate?.(finding.module || 'activite_suivi');
    return { ok: true, ...result, action: finding.auto_action };
  }

  onNavigate?.(finding.module || finding.module_target || 'objectifs_croissance');
  return { ok: true, navigated: true };
}

/** Crée une tâche de résolution depuis une alerte ouverte. */
export async function createAlertResolutionTask({ alertTitle, alertId, actionLabel, handlers = {} }) {
  const { onCreateTask, existingTasks = [], onNavigate } = handlers;
  if (typeof onCreateTask !== 'function') {
    onNavigate?.('activite_suivi');
    return { ok: false };
  }
  const finding = {
    id: `resolve-alert-${alertId || alertTitle}`,
    module: 'activite_suivi',
    severity: 'haute',
    category: 'coherence',
    title: `Traiter : ${alertTitle}`,
    description: actionLabel || 'Résoudre alerte ouverte',
    recommended_action: actionLabel || `Traiter l'alerte ${alertTitle}`,
    auto_action: 'create_task',
    alert_id: alertId,
  };
  return applyOneClickRecommendation(finding, { ...handlers, existingTasks });
}

/** Crée une tâche de suivi dette fournisseur. */
export async function createSupplierFollowUpTask({ supplierName, amount, supplierId, handlers = {} }) {
  const { onCreateTask, existingTasks = [], onNavigate } = handlers;
  if (typeof onCreateTask !== 'function') {
    onNavigate?.('achats_stock');
    return { ok: false };
  }
  const finding = {
    id: `relance-fourn-${supplierId || supplierName}`,
    module: 'achats_stock',
    severity: 'haute',
    category: 'coherence',
    title: `Payer ${supplierName}`,
    description: `Dette fournisseur${supplierId ? ` · ${supplierId}` : ''}`,
    recommended_action: `Planifier paiement de ${amount || 'la dette'} à ${supplierName}`,
    auto_action: 'create_task',
  };
  return applyOneClickRecommendation(finding, { ...handlers, existingTasks });
}

/** Crée une tâche de relance client depuis une réponse stratégique créances. */
export async function createClientFollowUpTask({ clientName, amount, orderId, handlers = {} }) {
  const { onCreateTask, onCreateBusinessEvent, existingTasks = [], onNavigate } = handlers;
  if (typeof onCreateTask !== 'function') {
    onNavigate?.('commercial');
    return { ok: false };
  }
  const finding = {
    id: `relance-${orderId || clientName}`,
    module: 'commercial',
    severity: 'haute',
    category: 'coherence',
    title: `Relancer ${clientName}`,
    description: `Encaissement en attente${orderId ? ` · commande ${orderId}` : ''}`,
    recommended_action: `Relancer ${clientName} pour ${amount || 'le solde'}`,
    auto_action: 'create_task',
  };
  return applyOneClickRecommendation(finding, { ...handlers, existingTasks });
}
