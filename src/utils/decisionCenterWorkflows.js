import { makeId } from './ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value = '') => String(value || '').trim();

export function decisionRecommendationSource(item = {}) {
  const module = item.source_module || item.module || item.activity || 'centre_ia';
  const id = item.source_id || item.entity_id || item.related_id || item.id || clean(item.title);
  return { module, id, key: `decision:${module}:${id}` };
}

export function buildDecisionRecommendationTask(item = {}, { date = today() } = {}) {
  if (!item?.id && !item?.title) return null;
  const source = decisionRecommendationSource(item);
  const taskId = makeId('TSK');
  const priority = item.priority === 'haute' || item.severity === 'critique' ? 'haute' : item.priority === 'moyenne' ? 'moyenne' : 'normale';
  const moduleLie = item.target_module || item.source_module || (item.activity === 'stock' ? 'stock' : item.activity === 'cultures' ? 'cultures' : item.activity === 'oeufs' || item.activity === 'poulets_chair' ? 'avicole' : item.activity === 'finances' ? 'finances' : 'centre_ia');
  return {
    task: {
      id: taskId,
      title: item.title || 'Action Centre décisionnel',
      module_lie: moduleLie,
      source_module: 'centre_ia',
      source_record_id: source.id,
      related_id: source.id,
      task_dedupe_key: source.key,
      action_key: source.key,
      due_date: date,
      priority,
      status: 'a_faire',
      checklist: 'Vérifier la donnée source; Réaliser l’action terrain; Revenir clôturer la tâche',
      notes: item.recommendation || item.event_note || item.timing || item.reason || 'Action recommandée par le Centre décisionnel.',
    },
    event: {
      id: makeId('EVT'),
      event_type: 'decision_action_task_created',
      module_source: 'centre_ia',
      entity_type: 'recommendation',
      entity_id: source.id,
      title: `Tâche créée depuis Centre décisionnel · ${item.title || source.id}`,
      description: item.recommendation || item.event_note || item.reason || '',
      event_date: date,
      severity: priority === 'haute' ? 'warning' : 'info',
      linked_task_id: taskId,
      source_module: source.module,
      source_record_id: source.id,
      saisies_evitees: 2,
    },
  };
}
