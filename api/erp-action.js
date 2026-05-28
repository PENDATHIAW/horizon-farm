const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ACTIONS = {
  create_task: { table: 'taches', module: 'taches' },
  create_alert: { table: 'alertes_center', module: 'alertes' }
};

const ROLE_ACTIONS = {
  admin: ['*'],
  manager: ['*'],
  employe: ['create_task', 'create_alert'],
  veterinaire: ['create_task', 'create_alert'],
  comptable: ['create_task', 'create_alert'],
  visiteur: []
};

function send(res, status, payload) {
  return res.status(status).json(payload);
}

function canPerform(role, action) {
  const allowed = ROLE_ACTIONS[role] || ROLE_ACTIONS.visiteur;
  return allowed.includes('*') || allowed.includes(action);
}

function denyMessage(language = 'fr') {
  if (language === 'wo') return 'Mënuma def loolu ak sa ndigal léegi. Laajal responsable bi mu jox la accès bu gën a yaatu.';
  if (language === 'en') return 'I cannot perform this action with your current access level. Please ask a manager for the required permission.';
  return 'Je ne peux pas effectuer cette action avec votre niveau d’accès actuel. Demandez à un responsable de vous accorder l’autorisation nécessaire.';
}

async function supabaseInsert(table, payload) {
  if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
    throw new Error('Supabase server variables are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  }
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify([payload])
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase insert failed: ${response.status}`);
  return data;
}

function buildTaskPayload(args = {}, actor = {}) {
  return {
    title: args.title || args.titre || 'Tâche créée depuis Horizon Chat',
    description: args.description || args.message || '',
    status: args.status || args.statut || 'a_faire',
    priority: args.priority || args.priorite || 'normale',
    due_date: args.due_date || args.date || null,
    assigned_to: args.assigned_to || args.assigne || null,
    source: 'horizon_chat',
    created_by: actor.userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function buildAlertPayload(args = {}, actor = {}) {
  return {
    title: args.title || args.titre || 'Alerte créée depuis Horizon Chat',
    message: args.message || args.description || args.title || 'Alerte créée depuis Horizon Chat',
    priority: args.priority || args.priorite || 'normale',
    status: args.status || args.statut || 'nouvelle',
    source: 'horizon_chat',
    created_by: actor.userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function successMessage(language = 'fr', action = '') {
  if (language === 'wo') return action === 'create_alert' ? 'Alert bi am na, def naa ko ci ERP bi.' : 'Liggéey bi am na, def naa ko ci ERP bi.';
  if (language === 'en') return action === 'create_alert' ? 'The alert has been created in the ERP.' : 'The task has been created in the ERP.';
  return action === 'create_alert' ? 'L’alerte a été créée dans l’ERP.' : 'La tâche a été créée dans l’ERP.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || '').trim();
    const role = String(body.role || 'visiteur').trim();
    const language = String(body.language || 'fr').trim();
    const actor = body.actor || {};
    const args = body.args || {};
    const actionConfig = ACTIONS[action];

    if (!actionConfig) return send(res, 400, { error: 'Unknown ERP action.', availableActions: Object.keys(ACTIONS) });
    if (!canPerform(role, action)) return send(res, 403, { error: 'access_denied', message: denyMessage(language), role, action });

    const payload = action === 'create_alert' ? buildAlertPayload(args, actor) : buildTaskPayload(args, actor);
    const rows = await supabaseInsert(actionConfig.table, payload);

    return send(res, 200, {
      action,
      module: actionConfig.module,
      created: true,
      message: successMessage(language, action),
      rows
    });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP action failed.' });
  }
}
