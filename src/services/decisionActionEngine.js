const num = (value = 0) => Number(value || 0);

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function action(label, type, priority, payload = {}) {
  return {
    id: makeId('ACTION'),
    label,
    type,
    priority,
    payload,
  };
}

export function buildDecisionActions(item = {}, target = null) {
  const actions = [];

  if (item.technical_rule) {
    actions.push(action('Créer une tâche terrain', 'technical_task', item.priority === 'haute' ? 'haute' : 'moyenne', {
      title: item.title,
      description: item.recommendation,
      source_alert_id: item.source_alert_id,
      source_module: item.source_module,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
    }));
    actions.push(action('Ouvrir le centre d’alertes', 'technical_alert', item.priority === 'haute' ? 'haute' : 'moyenne', {
      title: item.title,
      message: item.event_note || item.recommendation,
      source_alert_id: item.source_alert_id,
      source_module: item.source_module,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
    }));
    if (['oeufs', 'poulets_chair'].includes(item.activity)) actions.push(action('Ouvrir Avicole', 'technical_module', 'moyenne', { target_module: 'avicole' }));
    else if (['bovins', 'ovins', 'caprins', 'animaux'].includes(item.activity)) actions.push(action('Ouvrir Animaux / Santé', 'technical_module', 'moyenne', { target_module: item.source_module === 'sante' ? 'sante' : 'animaux' }));
    else if (item.activity === 'stock') actions.push(action('Ouvrir Stock', 'technical_module', 'moyenne', { target_module: 'stock' }));
    else if (item.activity === 'cultures') actions.push(action('Ouvrir Cultures', 'technical_module', 'moyenne', { target_module: 'cultures' }));
    return actions.slice(0, 4);
  }

  if (item.should_recommend_investment) {
    actions.push(action('Créer / ouvrir le BP brouillon', 'business_plan', 'haute', {
      activity: item.activity,
      recommendation_id: item.id,
      target_date: item.target_date,
      deadline: item.latest_start,
      gap_units: item.gap_units,
      gap_revenue: item.gap_revenue,
    }));
  }

  if (num(item.gap_units) > 0) {
    actions.push(action('Créer une opportunité de précommande', 'sales_opportunity', 'haute', {
      activity: item.activity,
      quantity_target: item.gap_units,
      revenue_target: item.gap_revenue,
      client_hint: target?.name || '',
      target_date: item.target_date,
    }));
  }

  if (item.latest_start) {
    actions.push(action('Créer une alerte deadline', 'alert', item.timing_status === 'urgent_deadline' ? 'haute' : 'moyenne', {
      title: `Deadline ${item.activity} - ${item.event_label || 'fenêtre commerciale'}`,
      due_date: item.latest_start,
      activity: item.activity,
      recommendation_id: item.id,
    }));
  }

  if (target?.name) {
    actions.push(action(`Créer une tâche de relance : ${target.name}`, 'task', 'moyenne', {
      title: `Relancer ${target.name}`,
      activity: item.activity,
      target_name: target.name,
      target_type: target.type,
      recommendation_id: item.id,
    }));
  }

  if (['poulets_chair', 'oeufs'].includes(item.activity)) {
    actions.push(action('Vérifier stock aliment / emballages', 'stock_check', 'moyenne', {
      activity: item.activity,
      items: item.activity === 'oeufs' ? ['plateaux œufs', 'aliment pondeuses'] : ['aliment chair', 'litière', 'vaccins'],
    }));
  }

  if (['bovins', 'ovins', 'caprins'].includes(item.activity)) {
    actions.push(action('Vérifier alimentation, poids cible et santé', 'animal_check', 'moyenne', {
      activity: item.activity,
      target_date: item.target_date,
      deadline: item.latest_start,
    }));
  }

  if (item.activity === 'cultures') {
    actions.push(action('Vérifier sol, eau, intrants et débouchés', 'culture_check', 'moyenne', {
      target_date: item.target_date,
      deadline: item.latest_start,
    }));
  }

  return actions.slice(0, 6);
}

export function actionTypeLabel(type) {
  return {
    business_plan: 'Business plan',
    sales_opportunity: 'Opportunité',
    alert: 'Alerte',
    task: 'Tâche',
    stock_check: 'Stock',
    animal_check: 'Animaux',
    culture_check: 'Cultures',
    technical_task: 'Tâche terrain',
    technical_alert: 'Alerte terrain',
    technical_module: 'Module',
  }[type] || 'Action';
}

export function actionTargetModule(type, payload = {}) {
  return {
    business_plan: 'investissements',
    sales_opportunity: 'ventes',
    alert: 'alertes',
    task: 'taches',
    stock_check: 'stock',
    animal_check: 'animaux',
    culture_check: 'cultures',
    technical_task: 'taches',
    technical_alert: 'alertes',
    technical_module: payload.target_module || 'alertes',
  }[type] || 'dashboard';
}

function buildDecisionTrace(action = {}, item = {}) {
  return {
    recommendation_id: item.id,
    action_id: action.id,
    source_module: 'centre_decisionnel',
    source_status: 'draft_opened',
    activity: item.activity,
    recommendation_title: item.title,
    action_label: action.label,
    action_type: action.type,
    target_module: actionTargetModule(action.type, action.payload),
    target_date: item.target_date,
    deadline: item.latest_start,
    demand_level: item.demand_level,
    coverage_rate: item.coverage_rate,
    coverage_status: item.coverage_status,
    gap_units: item.gap_units,
    gap_revenue: item.gap_revenue,
    expected_impact: item.recommendation,
    decision_reason: item.technical_rule ? `Règle technique terrain: ${item.event_note || item.recommendation || item.title}.` : `Demande ${item.demand_level || 'inconnue'}, couverture ${item.coverage_rate || 0}%, fenêtre ${item.event_label || item.target_date || 'à confirmer'}.`,
    opened_at: new Date().toISOString(),
  };
}

export function buildDraftFromDecisionAction(action = {}, item = {}) {
  const decisionTrace = buildDecisionTrace(action, item);
  const base = {
    id: makeId('DRAFT'),
    source_module: 'centre_decisionnel',
    source_recommendation_id: item.id,
    source_action_id: action.id,
    recommendation_id: item.id,
    decision_trace: decisionTrace,
    activity: item.activity,
    priority: action.priority,
    title: action.label,
    status: 'brouillon',
    statut: 'brouillon',
    created_at: new Date().toISOString(),
  };

  if (action.type === 'business_plan') {
    return {
      ...base,
      target_module: 'investissements',
      draft_type: 'business_plan',
      nom: `BP brouillon - ${item.title || item.activity}`,
      activite: item.activity,
      date_cible: item.target_date,
      deadline_mise_en_place: item.latest_start,
      investissement_estime: item.gap_revenue,
      quantite_cible: item.gap_units,
      justification: item.recommendation,
      source_recommendation_status: 'bp_draft_opened',
    };
  }

  if (action.type === 'sales_opportunity') {
    return {
      ...base,
      target_module: 'ventes',
      draft_type: 'sales_opportunity',
      titre: `Précommande ${item.activity}`,
      client_hint: action.payload?.client_hint || '',
      quantite_cible: action.payload?.quantity_target || item.gap_units,
      montant_cible: action.payload?.revenue_target || item.gap_revenue,
      date_cible: item.target_date,
      probabilite: 45,
      statut: 'prospection',
      source_recommendation_status: 'sales_opportunity_draft_opened',
    };
  }

  if (action.type === 'alert') {
    return {
      ...base,
      target_module: 'alertes',
      draft_type: 'alert',
      title: action.payload?.title || action.label,
      due_date: action.payload?.due_date || item.latest_start,
      severity: action.priority === 'haute' ? 'haute' : 'moyenne',
      message: `Deadline à surveiller pour ${item.activity}. Fenêtre cible : ${item.event_label || item.target_date || 'à confirmer'}.`,
      source_recommendation_status: 'alert_draft_opened',
    };
  }

  if (action.type === 'task') {
    return {
      ...base,
      target_module: 'taches',
      draft_type: 'task',
      title: action.payload?.title || action.label,
      due_date: item.latest_start || item.target_date,
      priority: action.priority === 'haute' ? 'critique' : 'haute',
      status: 'a_faire',
      statut: 'a_faire',
      description: `Action recommandée par le Centre décisionnel pour ${item.activity}.`,
      source_recommendation_status: 'task_draft_opened',
    };
  }

  if (action.type === 'technical_task') {
    return {
      ...base,
      target_module: 'taches',
      draft_type: 'task',
      title: action.payload?.title || item.title || action.label,
      due_date: item.latest_start || item.target_date,
      priority: action.priority === 'haute' ? 'critique' : 'haute',
      status: 'a_faire',
      statut: 'a_faire',
      module_lie: action.payload?.source_module || item.source_module || item.activity,
      entity_type: action.payload?.entity_type || item.entity_type,
      related_id: action.payload?.entity_id || item.entity_id,
      source_record_id: action.payload?.source_alert_id || item.source_alert_id,
      alert_dedupe_key: `${action.payload?.source_module || item.source_module || 'technique'}:${action.payload?.entity_type || item.entity_type || 'entite'}:${action.payload?.entity_id || item.entity_id || item.id}:${item.recommendation || item.title}`,
      description: action.payload?.description || item.recommendation || 'Action terrain recommandée par le Centre décisionnel.',
      source_recommendation_status: 'technical_task_draft_opened',
    };
  }

  if (action.type === 'technical_alert') {
    return {
      ...base,
      target_module: 'alertes',
      draft_type: 'alert',
      title: action.payload?.title || item.title || action.label,
      due_date: item.latest_start || item.target_date,
      severity: action.priority === 'haute' ? 'critique' : 'warning',
      status: 'nouvelle',
      statut: 'nouvelle',
      module_source: action.payload?.source_module || item.source_module || item.activity,
      entity_type: action.payload?.entity_type || item.entity_type,
      entity_id: action.payload?.entity_id || item.entity_id,
      alert_dedupe_key: `${action.payload?.source_module || item.source_module || 'technique'}:${action.payload?.entity_type || item.entity_type || 'entite'}:${action.payload?.entity_id || item.entity_id || item.id}:${item.recommendation || item.title}`,
      message: action.payload?.message || item.event_note || item.recommendation,
      action_recommandee: item.recommendation,
      source_recommendation_status: 'technical_alert_draft_opened',
    };
  }

  if (action.type === 'technical_module') {
    return {
      ...base,
      target_module: action.payload?.target_module || actionTargetModule(action.type, action.payload),
      draft_type: 'module_navigation',
      title: item.title || action.label,
      description: item.recommendation,
      source_recommendation_status: 'technical_module_opened',
    };
  }

  if (action.type === 'stock_check') {
    return {
      ...base,
      target_module: 'stock',
      draft_type: 'stock_check',
      title: action.label,
      items: action.payload?.items || [],
      due_date: item.latest_start || item.target_date,
      description: 'Vérifier disponibilité stock avant engagement commercial ou mise en place.',
      source_recommendation_status: 'stock_check_draft_opened',
    };
  }

  if (action.type === 'animal_check') {
    return {
      ...base,
      target_module: 'animaux',
      draft_type: 'animal_check',
      title: action.label,
      date_cible: item.target_date,
      deadline: item.latest_start,
      description: 'Vérifier poids, santé, alimentation et vendabilité des animaux.',
      source_recommendation_status: 'animal_check_draft_opened',
    };
  }

  if (action.type === 'culture_check') {
    return {
      ...base,
      target_module: 'cultures',
      draft_type: 'culture_check',
      title: action.label,
      date_cible: item.target_date,
      deadline: item.latest_start,
      description: 'Vérifier sol, eau, intrants, cycle cultural et débouchés avant lancement.',
      source_recommendation_status: 'culture_check_draft_opened',
    };
  }

  return { ...base, target_module: actionTargetModule(action.type, action.payload), draft_type: action.type || 'action' };
}

export default buildDecisionActions;
