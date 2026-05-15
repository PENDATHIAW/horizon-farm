import { json, readJsonBody, requirePostOrOptions } from './_utils.js';

const now = () => new Date().toISOString();

const requiredFieldsByIntent = {
  purchase_stock: ['product_name', 'quantity', 'unit'],
  sale_record: ['product_name', 'quantity'],
  animal_creation: ['type'],
  poultry_lot_creation: ['type', 'initial_count'],
  supplier_creation: ['name'],
  client_creation: ['name'],
  finance_entry: ['transaction_type', 'amount'],
  task_creation: ['title'],
};

const moduleLabels = {
  stock: 'Stock',
  finances: 'Finances',
  fournisseurs: 'Fournisseurs',
  clients: 'Clients',
  ventes: 'Ventes',
  animaux: 'Animaux',
  avicole: 'Avicole',
  sante: 'Santé',
  cultures: 'Cultures',
  documents: 'Documents',
  taches: 'Tâches',
  tracabilite: 'Traçabilité',
  centre_ia: 'Centre IA',
};

const normalizeIntent = (draft = {}) => draft.intent || draft.type || 'unknown';
const fieldsOf = (draft = {}) => draft.draft_fields || draft.fields || {};

const validateRequiredFields = (intent, fields = {}) => {
  const required = requiredFieldsByIntent[intent] || [];
  return required.filter((field) => fields[field] === undefined || fields[field] === null || fields[field] === '');
};

const buildBusinessEvent = ({ intent, fields, userId }) => ({
  module: 'tracabilite',
  action: 'create_business_event',
  table: 'business_events',
  payload: {
    event_type: 'assistant_validation',
    source: 'horizon_assistant',
    intent,
    title: `Validation Horizon - ${intent}`,
    description: fields.notes || 'Action validée via Horizon Assistant',
    actor_id: userId || null,
    occurred_at: now(),
    metadata: fields,
  },
});

const buildActionsForDraft = (draft = {}, userId = null) => {
  const intent = normalizeIntent(draft);
  const fields = fieldsOf(draft);
  const actions = [];

  if (intent === 'purchase_stock') {
    actions.push({
      module: 'stock',
      action: 'create_stock_entry',
      table: 'stock',
      payload: {
        produit: fields.product_name,
        categorie: fields.category || 'aliment',
        quantite: Number(fields.quantity || 0),
        unite: fields.unit || 'unité',
        poids_unitaire_kg: fields.unit_weight_kg || null,
        poids_total_kg: fields.total_weight_kg || null,
        fournisseur_id: fields.supplier_id || null,
        fournisseur_nom: fields.supplier_name || null,
        type_mouvement: 'entree',
        source: 'horizon_assistant',
        date: fields.date || now().slice(0, 10),
        notes: fields.notes || '',
      },
    });

    if (fields.payment_status && fields.payment_status !== 'unknown') {
      actions.push({
        module: 'finances',
        action: fields.payment_status === 'paid' ? 'create_paid_expense' : 'create_supplier_payable',
        table: 'finances',
        payload: {
          type: 'sortie',
          categorie: 'achat_stock',
          libelle: `Achat ${fields.product_name || 'stock'} via Horizon`,
          montant: fields.payment_amount || null,
          statut: fields.payment_status === 'paid' ? 'paye' : fields.payment_status,
          fournisseur_id: fields.supplier_id || null,
          date: fields.date || now().slice(0, 10),
          source: 'horizon_assistant',
        },
      });
    }

    if (!fields.supplier_id && fields.supplier_name) {
      actions.push({
        module: 'fournisseurs',
        action: 'prepare_supplier_creation',
        table: 'fournisseurs',
        requires_additional_validation: true,
        payload: {
          nom: fields.supplier_name,
          type: 'aliment',
          source: 'horizon_assistant',
        },
      });
    }
  }

  if (intent === 'sale_record') {
    actions.push({
      module: 'ventes',
      action: 'create_sales_order',
      table: 'sales_orders',
      payload: {
        client_id: fields.client_id || null,
        client_nom: fields.client_name || null,
        product_name: fields.product_name,
        quantity: Number(fields.quantity || 0),
        unit_price: fields.unit_price || null,
        total_amount: fields.total_amount || null,
        payment_status: fields.payment_status || 'unknown',
        date: fields.date || now().slice(0, 10),
        source: 'horizon_assistant',
      },
    });

    actions.push({
      module: 'stock',
      action: 'prepare_stock_exit',
      table: 'stock',
      payload: {
        produit: fields.product_name,
        quantite: Number(fields.quantity || 0),
        type_mouvement: 'sortie',
        source: 'horizon_assistant',
      },
    });
  }

  if (intent === 'animal_creation') {
    actions.push({
      module: 'animaux',
      action: 'create_animal',
      table: 'animaux',
      payload: {
        type: fields.type,
        name: fields.name || fields.nom || null,
        race: fields.race || null,
        age: fields.age || null,
        poids: fields.weight_kg || fields.poids || null,
        statut: fields.statut || 'actif',
        source: 'horizon_assistant',
      },
    });
  }

  if (intent === 'poultry_lot_creation') {
    actions.push({
      module: 'avicole',
      action: 'create_poultry_lot',
      table: 'avicole',
      payload: {
        type: fields.type,
        name: fields.name || fields.nom || null,
        initial_count: Number(fields.initial_count || fields.quantity || 0),
        age_weeks: fields.age_weeks || null,
        date_entree: fields.date || now().slice(0, 10),
        statut: 'actif',
        source: 'horizon_assistant',
      },
    });
  }

  if (intent === 'supplier_creation') {
    actions.push({
      module: 'fournisseurs',
      action: 'create_supplier',
      table: 'fournisseurs',
      payload: {
        nom: fields.name || fields.nom,
        telephone: fields.phone || null,
        adresse: fields.address || null,
        type: fields.type || 'general',
        source: 'horizon_assistant',
      },
    });
  }

  if (intent === 'client_creation') {
    actions.push({
      module: 'clients',
      action: 'create_client',
      table: 'clients',
      payload: {
        nom: fields.name || fields.nom,
        telephone: fields.phone || null,
        adresse: fields.address || null,
        source: 'horizon_assistant',
      },
    });
  }

  if (intent === 'finance_entry') {
    actions.push({
      module: 'finances',
      action: 'create_finance_transaction',
      table: 'finances',
      payload: {
        type: fields.transaction_type,
        montant: Number(fields.amount || 0),
        categorie: fields.category || 'non_categorise',
        libelle: fields.label || fields.notes || 'Transaction Horizon',
        date: fields.date || now().slice(0, 10),
        source: 'horizon_assistant',
      },
    });
  }

  if (intent === 'task_creation') {
    actions.push({
      module: 'taches',
      action: 'create_task',
      table: 'taches',
      payload: {
        title: fields.title,
        description: fields.description || '',
        due_date: fields.due_date || null,
        priority: fields.priority || 'normale',
        assignee: fields.assignee || null,
        source: 'horizon_assistant',
      },
    });
  }

  actions.push(buildBusinessEvent({ intent, fields, userId }));

  actions.push({
    module: 'centre_ia',
    action: 'refresh_ai_context',
    table: null,
    payload: {
      intent,
      updated_at: now(),
      source: 'horizon_assistant',
    },
  });

  return actions;
};

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;

  const body = await readJsonBody(req);
  const draft = body.draft || {};
  const userId = body.userId || body.user_id || null;
  const execute = Boolean(body.execute);
  const intent = normalizeIntent(draft);
  const fields = fieldsOf(draft);

  if (!body.confirmed) {
    return json(res, 400, {
      ok: false,
      status: 'confirmation_required',
      message: 'Validation utilisateur obligatoire avant exécution.',
    });
  }

  const missing = validateRequiredFields(intent, fields);
  if (missing.length) {
    return json(res, 422, {
      ok: false,
      status: 'missing_fields',
      intent,
      missing_fields: missing,
      message: `Champs manquants: ${missing.join(', ')}`,
    });
  }

  const actions = buildActionsForDraft(draft, userId);
  const impactedModules = [...new Set(actions.map((action) => action.module).filter(Boolean))];

  // MVP sécurisé : l'endpoint prépare les actions validées.
  // L'exécution réelle Supabase sera branchée dans une étape suivante avec RLS/auth stricte.
  const executionStatus = execute ? 'prepared_for_execution' : 'dry_run';

  return json(res, 200, {
    ok: true,
    status: executionStatus,
    intent,
    confirmed: true,
    executed: false,
    execution_note: execute
      ? 'Actions validées et prêtes à brancher sur Supabase. Exécution réelle désactivée dans ce MVP sécurisé.'
      : 'Simulation de validation. Aucune donnée écrite.',
    impacted_modules: impactedModules,
    impacted_module_labels: impactedModules.map((module) => moduleLabels[module] || module),
    actions,
    message: `Nécessaire préparé. Modules concernés: ${impactedModules.map((module) => moduleLabels[module] || module).join(', ')}.`,
    timestamp: now(),
  });
}
