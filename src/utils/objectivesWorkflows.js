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

export function buildGrowthObjectiveWorkflow(objective = {}, context = {}) {
  const activity = objective.activity || 'global';
  const label = objective.label || objective.title || activity;
  const sourceModule = moduleForObjective(activity);
  const current = n(objective.current ?? objective.realized ?? objective.realise);
  const target = n(objective.target ?? objective.cible);
  const status = buildObjectiveStatus({ ...objective, realized: current, target });
  const stockNeed = Math.max(0, n(objective.stock_need ?? objective.besoin_stock));
  const cashNeed = Math.max(0, n(objective.cash_need ?? objective.besoin_cash));
  const capacityNeed = Math.max(0, n(objective.capacity_need ?? objective.besoin_capacite));
  const availableStock = n(context.availableStock ?? context.stockDisponible);
  const availableCash = n(context.availableCash ?? context.cashDisponible);
  const availableCapacity = n(context.availableCapacity ?? context.capaciteDisponible);
  const simulation = {
    activity,
    current,
    target,
    remaining: status.remaining,
    attainment: status.attainment,
    stock_need: stockNeed,
    cash_need: cashNeed,
    capacity_need: capacityNeed,
    available_stock: availableStock,
    available_cash: availableCash,
    available_capacity: availableCapacity,
    projected_sales: n(objective.projected_sales ?? objective.ca_prevu ?? objective.target),
    hr_need: n(objective.hr_need ?? objective.besoin_rh),
  };
  const unsustainable = [
    stockNeed > 0 && availableStock > 0 && stockNeed > availableStock ? 'stock insuffisant' : '',
    cashNeed > 0 && availableCash > 0 && cashNeed > availableCash ? 'cash insuffisant' : '',
    capacityNeed > 0 && availableCapacity > 0 && capacityNeed > availableCapacity ? 'capacité insuffisante' : '',
  ].filter(Boolean);
  const base = buildObjectiveActionTask({ ...objective, realized: current, target }, { date: objective.date || today(), dueDate: objective.echeance || objective.due_date || today() });
  return {
    status,
    progress: {
      current,
      target,
      attainment: status.attainment,
      remaining: status.remaining,
      source_indicator: objective.source_indicator || objective.indicateur_source || sourceModule,
      deadline: objective.echeance || objective.due_date || '',
    },
    task: status.key === 'atteint' ? null : {
      ...base.task,
      notes: `${base.task.notes} Besoin stock ${stockNeed}, cash ${cashNeed}, capacité ${capacityNeed}.`,
      simulation,
    },
    alert: unsustainable.length ? {
      id: `ALT-OBJ-${activity}-${objective.date || today()}`,
      title: `Croissance non soutenable · ${label}`,
      message: unsustainable.join(', '),
      module_source: 'objectifs_croissance',
      entity_type: 'objectif',
      entity_id: activity,
      severity: 'haute',
      status: 'nouvelle',
      alert_dedupe_key: `objective-unsustainable:${activity}`,
    } : null,
    event: {
      ...base.event,
      event_type: 'growth_objective',
      type_evenement: 'growth_objective',
      description: `${label}: ${status.attainment}% · reste ${status.remaining}. ${unsustainable.join(', ')}`,
      simulation,
    },
    simulation,
    sourceModule,
  };
}
