import toast from 'react-hot-toast';
import { generateSequentialId } from '../../utils/ids.js';
import { resolveRouteModule } from '../../utils/commercialNavigation.js';
import { buildTaskFromAlert } from '../../utils/taskWorkflows.js';
import { applyOneClickRecommendation } from '../../services/heyHorizonRecommendationActions.js';
import { openVisionPriority } from './visionMetrics.js';
import { navigateVisionFinding, navigateVisionPriority } from './visionNavigation.js';

const MODULE_TO_TASK = {
  commercial: 'ventes',
  achats_stock: 'stock',
  finance_pilotage: 'finances',
  elevage: 'avicole',
  activite_suivi: 'taches',
  documents_rapports: 'documents',
  rh: 'equipements',
  objectifs_croissance: 'objectifs_croissance',
  centre_decisionnel: 'taches',
  centre_ia: 'taches',
  alertes: 'taches',
  taches: 'taches',
  ventes: 'ventes',
  stock: 'stock',
  finances: 'finances',
  avicole: 'avicole',
  animaux: 'animaux',
};

const MODULE_TO_ALERT = {
  commercial: 'ventes',
  achats_stock: 'stock',
  finance_pilotage: 'finances',
  elevage: 'avicole',
  activite_suivi: 'taches',
  documents_rapports: 'documents',
  centre_decisionnel: 'centre_decisionnel',
  centre_ia: 'centre_decisionnel',
  objectifs_croissance: 'autre',
};

const today = () => new Date().toISOString().slice(0, 10);

function mapTaskModule(module = '') {
  const resolved = resolveRouteModule(String(module || '').trim());
  return MODULE_TO_TASK[resolved] || MODULE_TO_TASK[module] || 'taches';
}

function mapAlertModule(module = '') {
  const resolved = resolveRouteModule(String(module || '').trim());
  return MODULE_TO_ALERT[resolved] || MODULE_TO_ALERT[module] || 'centre_decisionnel';
}

function severityFromItem(item = {}) {
  const raw = String(item.severity || item.record?.severity || item.record?.severite || item.priority || '').toLowerCase();
  if (raw.includes('critique') || item.tone === 'bad') return 'critique';
  if (raw.includes('haute') || raw.includes('urgent')) return 'haute';
  return 'moyenne';
}

export function buildTaskPayloadFromPriorityItem(item = {}, existingTasks = []) {
  if (item.kind === 'tache' && item.record) return null;
  if (item.kind === 'alerte' && item.record) {
    return buildTaskFromAlert(item.record, existingTasks).task;
  }
  if (item.isEngine && item.finding) {
    const finding = item.finding;
    return {
      id: generateSequentialId('taches', existingTasks),
      title: finding.title || item.title || 'Action IA',
      module_lie: mapTaskModule(finding.module || item.sourceModule),
      entity_type: finding.category || 'finding',
      related_id: finding.source_records?.[0]?.id || finding.id || item.id,
      assigned_to: 'TEAM-FERME',
      due_date: today(),
      priority: severityFromItem({ severity: finding.severity, tone: item.tone }) === 'critique' ? 'critique' : 'haute',
      status: 'a_faire',
      statut: 'a_faire',
      notes: [finding.description, finding.recommended_action, item.detail].filter(Boolean).join(' · '),
      source_module: 'centre_decisionnel',
      source_record_id: finding.id || item.id,
      task_dedupe_key: finding.id || `centre-priorite:${item.id}`,
      action_key: finding.recommended_action || item.title,
    };
  }
  return {
    id: generateSequentialId('taches', existingTasks),
    title: `Traiter : ${item.title}`,
    module_lie: mapTaskModule(item.sourceModule || item.navModule),
    entity_type: item.record?.entity_type || item.kind || 'priorite',
    related_id: item.record?.entity_id || item.record?.id || item.id,
    assigned_to: 'TEAM-FERME',
    due_date: today(),
    priority: severityFromItem(item) === 'critique' ? 'critique' : 'haute',
    status: 'a_faire',
    statut: 'a_faire',
    notes: item.detail || item.message || '',
    source_module: 'centre_decisionnel',
    source_record_id: item.id,
    task_dedupe_key: `centre-priorite:${item.id}`,
    action_key: item.detail?.slice(0, 120) || item.title,
  };
}

export function buildAlertPayloadFromPriorityItem(item = {}, existingAlerts = []) {
  if (item.kind === 'alerte') return null;
  const sev = severityFromItem(item);
  return {
    id: generateSequentialId('alertes_center', existingAlerts),
    title: item.title,
    message: item.detail || item.message || '',
    module_source: mapAlertModule(item.sourceModule || item.module || item.navModule),
    entity_type: item.record?.entity_type || item.entity_type || item.kind || 'priorite',
    entity_id: item.record?.entity_id || item.lotId || item.building || item.id,
    severity: sev === 'critique' ? 'critique' : 'warning',
    status: 'nouvelle',
    statut: 'nouvelle',
    action_recommandee: item.detail || item.recommendation || item.message || 'Traiter dans le Centre décisionnel',
    alert_dedupe_key: item.alert_dedupe_key || `centre-priorite:${item.id}:${item.title}`,
  };
}

export function navigateFromPriorityItem(item = {}, { onNavigate, setTab, moduleId = 'centre_ia' } = {}) {
  if (item.targetTab && setTab) {
    setTab(item.targetTab);
    return;
  }
  if (item.kind === 'alerte') {
    onNavigate?.('activite_suivi', { tab: 'Alertes' });
    return;
  }
  if (item.kind === 'tache') {
    onNavigate?.('activite_suivi', { tab: 'Tâches' });
    return;
  }
  if (item.isEngine && item.finding) {
    navigateVisionFinding(onNavigate, item.finding);
    return;
  }
  const module = resolveRouteModule(item.navModule || item.sourceModule || '');
  if (module === 'centre_ia' || module === 'centre_decisionnel') {
    if (item.tab && setTab) setTab(item.tab);
    else if (setTab) setTab('Risques');
    return;
  }
  if (item.navModule || item.sourceModule) {
    navigateVisionPriority(onNavigate, item);
    return;
  }
  openVisionPriority(item, moduleId, { setTab, onNavigate });
}

export async function runPriorityTaskAction(item, handlers = {}) {
  const { onCreateTask, onRefreshTasks, existingTasks = [] } = handlers;
  if (typeof onCreateTask !== 'function') {
    toast.error('Création de tâche indisponible');
    return false;
  }
  if (item.kind === 'tache') {
    navigateFromPriorityItem(item, handlers);
    toast.success('Tâche ouverte dans Activité & Suivi');
    return true;
  }
  const payload = buildTaskPayloadFromPriorityItem(item, existingTasks);
  if (!payload) {
    toast.error('Impossible de créer une tâche pour cet élément');
    return false;
  }
  try {
    await onCreateTask(payload);
    await onRefreshTasks?.();
    toast.success('Tâche créée');
    return true;
  } catch (error) {
    toast.error(error?.message || 'Création de tâche impossible');
    return false;
  }
}

export async function runPriorityAlertAction(item, handlers = {}) {
  const { onCreateAlert, onRefreshAlertes, existingAlerts = [] } = handlers;
  if (typeof onCreateAlert !== 'function') {
    toast.error("Création d'alerte indisponible");
    return false;
  }
  if (item.kind === 'alerte') {
    navigateFromPriorityItem(item, handlers);
    toast.success('Alerte ouverte dans Activité & Suivi');
    return true;
  }
  const payload = buildAlertPayloadFromPriorityItem(item, existingAlerts);
  if (!payload) {
    toast.error("Impossible de créer une alerte pour cet élément");
    return false;
  }
  try {
    await onCreateAlert(payload);
    await onRefreshAlertes?.();
    toast.success('Alerte créée');
    return true;
  } catch (error) {
    toast.error(error?.message || "Création d'alerte impossible");
    return false;
  }
}

export async function runPriorityFindingAction(item, handlers = {}) {
  if (!item.finding) {
    toast.error('Action IA indisponible');
    return false;
  }
  try {
    const result = await applyOneClickRecommendation(item.finding, handlers);
    if (result.createdTasks || result.createdAlerts) {
      toast.success(`${result.createdTasks || 0} tâche(s), ${result.createdAlerts || 0} alerte(s)`);
      await handlers.onRefreshTasks?.();
      await handlers.onRefreshAlertes?.();
      return true;
    }
    if (result.skipped) {
      toast.success('Déjà traité ou en cours');
      return true;
    }
    if (result.navigated || result.ok) {
      toast.success('Module ouvert');
      return true;
    }
    toast.error('Action impossible');
    return false;
  } catch (error) {
    toast.error(error?.message || 'Action impossible');
    return false;
  }
}

export async function runPriorityTreatedAction(item, handlers = {}) {
  const { onCreateBusinessEvent, moduleId = 'centre_ia' } = handlers;
  if (typeof onCreateBusinessEvent !== 'function') {
    toast.error('Marquage indisponible');
    return false;
  }
  try {
    await onCreateBusinessEvent({
      event_type: 'priorite_traitee',
      module_source: moduleId,
      entity_id: item.id,
      title: `Priorité traitée : ${item.title}`,
      event_date: today(),
      severity: 'info',
    });
    toast.success('Priorité marquée comme traitée');
    return true;
  } catch (error) {
    toast.error(error?.message || 'Marquage impossible');
    return false;
  }
}
