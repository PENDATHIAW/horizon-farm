const n = (value = 0) => Number(value || 0) || 0;
const clean = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

const MODULE_BY_ACTIVITY = {
  oeufs: 'avicole',
  poulets_chair: 'avicole',
  fumier_pondeuses: 'avicole',
  fumier_chair: 'avicole',
  bovins: 'animaux',
  ovins: 'animaux',
  caprins: 'animaux',
  animaux: 'animaux',
  cultures: 'cultures',
  stock: 'stock',
  global: 'finances',
};

export function moduleForObjective(activity = 'global') {
  return MODULE_BY_ACTIVITY[activity] || 'finances';
}

export function buildObjectiveStatus(objective = {}) {
  const target = n(objective.target ?? objective.monthTarget ?? objective.cible);
  const realized = n(objective.realized ?? objective.realise);
  const remaining = Math.max(0, n(objective.remaining ?? target - realized));
  const attainment = target > 0 ? Math.round((realized / target) * 100) : n(objective.attainment);
  const rawStatus = clean(objective.status || objective.statut);
  if (['atteint', 'termine', 'complete', 'realise'].some((word) => rawStatus.includes(word)) || attainment >= 100 || remaining <= 0) {
    return { key: 'atteint', label: 'Atteint', priority: 'basse', attainment, remaining };
  }
  if (['retard', 'bloque', 'urgent'].some((word) => rawStatus.includes(word)) || (target > 0 && attainment < 80 && remaining > 0)) {
    return { key: 'en_retard', label: 'En retard', priority: 'haute', attainment, remaining };
  }
  return { key: 'en_cours', label: 'En cours', priority: 'moyenne', attainment, remaining };
}

export function buildObjectiveActionTask(objective = {}, options = {}) {
  const activity = objective.activity || 'global';
  const module = moduleForObjective(activity);
  const status = buildObjectiveStatus(objective);
  const label = objective.label || objective.title || activity;
  const idBase = `OBJ-${activity}-${options.date || today()}`;
  const action = status.key === 'atteint'
    ? `Sécuriser la suite de l'objectif ${label}`
    : `Rattraper l'objectif ${label}`;
  const task = {
    id: options.taskId || `TASK-${idBase}`,
    title: action,
    module_lie: module,
    source_module: 'objectifs_croissance',
    source_record_id: activity,
    related_id: activity,
    task_dedupe_key: `objective-action:${activity}:${options.date || today()}`,
    action_key: `objective-action:${activity}`,
    due_date: options.dueDate || options.date || today(),
    priority: status.priority,
    status: 'a_faire',
    checklist: status.key === 'atteint'
      ? 'Confirmer les chiffres; Préparer prochaine cible; Archiver preuve'
      : 'Identifier le manque; Ouvrir le module source; Créer vente ou action terrain; Vérifier l’effet sur l’objectif',
    notes: status.key === 'atteint'
      ? `${label} est atteint à ${status.attainment}%. Préparer la prochaine étape.`
      : `${label} est à ${status.attainment}%. Reste à réaliser: ${Math.round(status.remaining).toLocaleString('fr-FR')} FCFA.`,
  };
  const event = {
    id: options.eventId || `EVT-${idBase}`,
    event_type: 'objectif_plan_action',
    module_source: 'objectifs_croissance',
    entity_type: 'objectif',
    entity_id: activity,
    title: task.title,
    description: task.notes,
    event_date: options.date || today(),
    severity: status.key === 'en_retard' ? 'warning' : 'info',
    source_module: module,
    source_record_id: activity,
    linked_task_id: task.id,
  };
  return { status, task, event, sourceModule: module };
}
