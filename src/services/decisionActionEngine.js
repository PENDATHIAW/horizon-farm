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
  }[type] || 'Action';
}

export default buildDecisionActions;
