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

const CLOSED_STATUSES = ['termine', 'terminée', 'terminee', 'done', 'closed', 'archive', 'archived', 'annule', 'annulée', 'cancelled'];

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

function normalize(value = '') {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isClosed(row = {}) {
  const status = normalize(row.status || row.statut || row.state || '');
  return CLOSED_STATUSES.some((closed) => status.includes(normalize(closed)));
}

function duplicateMessage(language = 'fr', action = '') {
  if (language === 'wo') return action === 'create_alert' ? 'Alert bu ni mel amoon na ba pare te amagul clôture. Du ma ko def ñaari yoon.' : 'Liggéey bu ni mel amoon na ba pare te amagul clôture. Du ma ko def ñaari yoon.';
  if (language === 'en') return action === 'create_alert' ? 'A similar open alert already exists, so I did not create a duplicate.' : 'A similar open task already exists, so I did not create a duplicate.';
  return action === 'create_alert' ? 'Une alerte similaire existe déjà et n’est pas clôturée, donc je n’ai pas créé de doublon.' : 'Une tâche similaire existe déjà et n’est pas terminée, donc je n’ai pas créé de doublon.';
}

async function supabaseRequest(table, options = {}) {
  if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
    throw new Error('Supabase server variables are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  }
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${options.query || ''}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase request failed: ${response.status}`);
  return data;
}

async function supabaseInsert(table, payload) {
  return supabaseRequest(table, { method: 'POST', body: [payload] });
}

async function findDuplicate(table, payload, action) {
  const rows = await supabaseRequest(table, { query: '?select=*&limit=100' });
  const newTitle = normalize(payload.title);
  const newMessage = normalize(payload.message || payload.description || '');
  const newDueDate = payload.due_date || null;

  return rows.find((row) => {
    if (isClosed(row)) return false;
    const rowTitle = normalize(row.title || row.titre || row.name || '');
    const rowMessage = normalize(row.message || row.description || '');
    const rowDueDate = row.due_date || row.date || null;
    const titleMatch = newTitle && rowTitle && (rowTitle.includes(newTitle) || newTitle.includes(rowTitle));
    const messageMatch = newMessage && rowMessage && (rowMessage.includes(newMessage) || newMessage.includes(rowMessage));
    const dateCompatible = !newDueDate || !rowDueDate || String(newDueDate).slice(0, 10) === String(rowDueDate).slice(0, 10);
    if (action === 'create_alert') return dateCompatible && (titleMatch || messageMatch);
    return dateCompatible && (titleMatch || messageMatch);
  });
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
    const duplicate = await findDuplicate(actionConfig.table, payload, action);
    if (duplicate) {
      return send(res, 200, {
        action,
        module: actionConfig.module,
        created: false,
        duplicate: true,
        message: duplicateMessage(language, action),
        existing: duplicate
      });
    }

    const rows = await supabaseInsert(actionConfig.table, payload);
    return send(res, 200, {
      action,
      module: actionConfig.module,
      created: true,
      duplicate: false,
      message: successMessage(language, action),
      rows
    });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP action failed.' });
  }
}
