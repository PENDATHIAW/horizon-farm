import { executeAssistantActions } from './_executor.js';
import { json, readJsonBody, requirePostOrOptions } from './_utils.js';

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const makeId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const number = (value, fallback = 0) => Number(value ?? fallback) || fallback;

const requiredFieldsByIntent = {
  purchase_stock: ['product_name', 'quantity', 'unit'],
  sale_record: ['product_name', 'quantity'],
  animal_creation: ['type'],
  poultry_lot_creation: ['type', 'initial_count'],
  supplier_creation: ['name'],
  client_creation: ['name'],
  finance_entry: ['transaction_type', 'amount'],
  task_creation: ['title'],
  technical_task: ['title'],
  business_plan: ['title'],
  sales_opportunity: ['title'],
  alert: ['title'],
};

const moduleLabels = {
  stock: 'Stock', finances: 'Finances', fournisseurs: 'Fournisseurs', clients: 'Clients', ventes: 'Ventes', animaux: 'Animaux', avicole: 'Avicole', sante: 'Santé', cultures: 'Cultures', documents: 'Documents', taches: 'Tâches', tracabilite: 'Traçabilité', centre_ia: 'Centre IA', investissements: 'Investissements', business_plans: 'Business plans', alertes: 'Alertes',
};

const intentAliases = {
  bp: 'business_plan',
  draft_business_plan: 'business_plan',
  business_plan_draft: 'business_plan',
  decision_business_plan: 'business_plan',
  opportunity: 'sales_opportunity',
  sales_opportunity_draft: 'sales_opportunity',
  create_sales_opportunity: 'sales_opportunity',
  alert_creation: 'alert',
  technical_task_creation: 'technical_task',
};
const normalizeIntent = (draft = {}) => intentAliases[draft.intent || draft.type] || draft.intent || draft.type || 'unknown';
const fieldsOf = (draft = {}) => draft.draft_fields || draft.fields || draft.payload || draft.data || {};
const validateRequiredFields = (intent, fields = {}) => (requiredFieldsByIntent[intent] || ['title']).filter((field) => fields[field] === undefined || fields[field] === null || fields[field] === '');

const buildBusinessEvent = ({ intent, fields, userId, title }) => ({ module: 'tracabilite', action: 'create_business_event', table: 'business_events', payload: { event_type: 'assistant_validation', source: 'horizon_assistant', intent, title: title || `Validation Horizon - ${intent}`, description: fields.notes || fields.description || 'Action validée via Horizon Assistant', actor_id: userId || null, occurred_at: now(), event_date: today(), metadata: fields } });
const clean = (value, fallback = '') => String(value || fallback).trim();
const asArray = (value) => Array.isArray(value) ? value : [];

function businessPlanActions(fields = {}, userId = null) {
  const bpId = fields.id || fields.business_plan_id || makeId('BP');
  const activity = fields.activity || fields.activite || fields.target_module || fields.module || 'global';
  const title = clean(fields.title || fields.name || fields.nom, 'Business plan brouillon');
  const investment = number(fields.suggested_investment ?? fields.investment_amount ?? fields.investissement ?? fields.budget ?? fields.amount, 0);
  const expectedRevenue = number(fields.expected_revenue ?? fields.ca_previsionnel ?? fields.revenu_attendu, 0);
  const expectedMargin = number(fields.expected_margin ?? fields.marge_attendue, Math.max(0, expectedRevenue - investment));
  const actions = [{ module: 'investissements', action: 'create_business_plan', table: 'business_plans', payload: { id: bpId, title, name: title, description: fields.description || fields.notes || '', status: fields.status || 'brouillon', statut: fields.statut || 'brouillon', activity, activite: activity, source_module: fields.source_module || 'centre_ia', source_recommendation_id: fields.recommendation_id || fields.source_id || null, decision_key: fields.decision_key || null, suggested_investment: investment, investment_amount: investment, expected_revenue: expectedRevenue, expected_margin: expectedMargin, break_even: fields.break_even ?? fields.seuil_rentabilite ?? null, priority: fields.priority || 'moyenne', created_by: userId || null, source: 'horizon_assistant' } }];
  asArray(fields.investment_lines || fields.investissements || fields.lines).forEach((line, index) => actions.push({ module: 'investissements', action: 'create_bp_investment_line', table: 'bp_investment_lines', payload: { id: line.id || makeId('BPLI'), business_plan_id: bpId, designation: line.designation || line.title || line.name || `Investissement ${index + 1}`, categorie: line.categorie || line.category || activity, montant: number(line.montant ?? line.amount ?? line.total, 0), quantity: number(line.quantity, 1), status: line.status || 'a_prevoir', source: 'horizon_assistant' } }));
  asArray(fields.recurring_costs || fields.charges_recurrentes).forEach((line, index) => actions.push({ module: 'investissements', action: 'create_bp_recurring_cost', table: 'bp_recurring_costs', payload: { id: line.id || makeId('BPRC'), business_plan_id: bpId, designation: line.designation || line.title || `Charge récurrente ${index + 1}`, categorie: line.categorie || line.category || activity, montant_mensuel: number(line.montant_mensuel ?? line.monthly_amount ?? line.amount, 0), source: 'horizon_assistant' } }));
  asArray(fields.revenue_projections || fields.recettes_previsionnelles).forEach((line, index) => actions.push({ module: 'investissements', action: 'create_bp_revenue_projection', table: 'bp_revenue_projections', payload: { id: line.id || makeId('BPRV'), business_plan_id: bpId, designation: line.designation || line.title || `Recette ${index + 1}`, activity, quantity: number(line.quantity ?? line.quantite, 0), unit_price: number(line.unit_price ?? line.prix_unitaire, 0), total: number(line.total ?? line.amount, 0), source: 'horizon_assistant' } }));
  asArray(fields.funding_sources || fields.sources_financement).forEach((line, index) => actions.push({ module: 'investissements', action: 'create_bp_funding_source', table: 'bp_funding_sources', payload: { id: line.id || makeId('BPFS'), business_plan_id: bpId, source_name: line.source_name || line.name || line.nom || `Source ${index + 1}`, type: line.type || 'apport', montant: number(line.montant ?? line.amount, 0), status: line.status || 'a_confirmer', source: 'horizon_assistant' } }));
  asArray(fields.risks || fields.risques).forEach((risk, index) => actions.push({ module: 'investissements', action: 'create_bp_risk', table: 'bp_risks', payload: { id: risk.id || makeId('BPRK'), business_plan_id: bpId, title: risk.title || risk.nom || `Risque ${index + 1}`, severity: risk.severity || risk.niveau || 'moyen', mitigation: risk.mitigation || risk.plan || '', source: 'horizon_assistant' } }));
  actions.push(buildBusinessEvent({ intent: 'business_plan', fields, userId, title: `Business plan brouillon créé - ${title}` }));
  return actions;
}

function buildActionsForDraft(draft = {}, userId = null) {
  const intent = normalizeIntent(draft);
  const fields = fieldsOf(draft);
  const actions = [];
  if (intent === 'business_plan') return businessPlanActions(fields, userId);

  if (intent === 'sales_opportunity') actions.push({ module: 'ventes', action: 'create_sales_opportunity', table: 'sales_opportunities', payload: { id: fields.id || makeId('OPP'), title: fields.title || fields.name || 'Opportunité commerciale', description: fields.description || fields.notes || '', source_type: fields.source_type || fields.target_type || fields.activity || null, source_id: fields.source_id || fields.target_id || null, source_module: fields.source_module || fields.module || null, quantity: number(fields.quantity ?? fields.quantite, 0), unit: fields.unit || fields.unite || '', estimated_value: number(fields.estimated_value ?? fields.amount ?? fields.montant_estime, 0), status: fields.status || 'nouveau', priority: fields.priority || 'moyenne', decision_key: fields.decision_key || null, source: 'horizon_assistant' } });
  if (intent === 'alert') actions.push({ module: 'alertes', action: 'create_alert', table: 'alertes_center', payload: { id: fields.id || makeId('ALT'), title: fields.title || 'Alerte Horizon', message: fields.message || fields.description || fields.notes || '', module_source: fields.module_source || fields.module || 'centre_ia', entity_type: fields.entity_type || fields.target_type || null, entity_id: fields.entity_id || fields.target_id || null, severity: fields.severity || fields.priority || 'warning', status: fields.status || 'nouvelle', action_recommandee: fields.action_recommandee || fields.recommended_action || '', decision_key: fields.decision_key || null, source: 'horizon_assistant' } });
  if (intent === 'technical_task') actions.push({ module: 'taches', action: 'create_technical_task', table: 'taches', payload: { id: fields.id || makeId('TSK'), title: fields.title, description: fields.description || fields.notes || '', module_lie: fields.module_lie || fields.module || 'technique', related_id: fields.related_id || fields.target_id || null, due_date: fields.due_date || fields.deadline || null, priority: fields.priority || 'moyenne', status: fields.status || 'a_faire', task_type: 'technical_task', source: 'horizon_assistant' } });

  if (intent === 'purchase_stock') {
    actions.push({ module: 'stock', action: 'create_stock_entry', table: 'stock', payload: { produit: fields.product_name, categorie: fields.category || 'aliment', quantite: Number(fields.quantity || 0), unite: fields.unit || 'unité', fournisseur_id: fields.supplier_id || null, fournisseur_nom: fields.supplier_name || null, type_mouvement: 'entree', source: 'horizon_assistant', date: fields.date || today(), notes: fields.notes || '' } });
    if (fields.payment_status && fields.payment_status !== 'unknown') actions.push({ module: 'finances', action: fields.payment_status === 'paid' ? 'create_paid_expense' : 'create_supplier_payable', table: 'finances', payload: { type: 'sortie', categorie: 'achat_stock', libelle: `Achat ${fields.product_name || 'stock'} via Horizon`, montant: fields.payment_amount || null, statut: fields.payment_status === 'paid' ? 'paye' : fields.payment_status, fournisseur_id: fields.supplier_id || null, date: fields.date || today(), source: 'horizon_assistant' } });
  }
  if (intent === 'sale_record') actions.push({ module: 'ventes', action: 'create_sales_order', table: 'sales_orders', payload: { client_id: fields.client_id || null, client_nom: fields.client_name || null, product_name: fields.product_name, quantity: Number(fields.quantity || 0), unit_price: fields.unit_price || null, total_amount: fields.total_amount || null, payment_status: fields.payment_status || 'unknown', date: fields.date || today(), source: 'horizon_assistant' } });
  if (intent === 'animal_creation') actions.push({ module: 'animaux', action: 'create_animal', table: 'animaux', payload: { type: fields.type, name: fields.name || fields.nom || null, race: fields.race || null, age: fields.age || null, poids: fields.weight_kg || fields.poids || null, statut: fields.statut || 'actif', source: 'horizon_assistant' } });
  if (intent === 'poultry_lot_creation') actions.push({ module: 'avicole', action: 'create_poultry_lot', table: 'avicole', payload: { type: fields.type, name: fields.name || fields.nom || null, initial_count: Number(fields.initial_count || fields.quantity || 0), age_weeks: fields.age_weeks || null, date_entree: fields.date || today(), statut: 'actif', source: 'horizon_assistant' } });
  if (intent === 'supplier_creation') actions.push({ module: 'fournisseurs', action: 'create_supplier', table: 'fournisseurs', payload: { nom: fields.name || fields.nom, telephone: fields.phone || null, adresse: fields.address || null, type: fields.type || 'general', source: 'horizon_assistant' } });
  if (intent === 'client_creation') actions.push({ module: 'clients', action: 'create_client', table: 'clients', payload: { nom: fields.name || fields.nom, telephone: fields.phone || null, adresse: fields.address || null, source: 'horizon_assistant' } });
  if (intent === 'finance_entry') actions.push({ module: 'finances', action: 'create_finance_transaction', table: 'finances', payload: { type: fields.transaction_type, montant: Number(fields.amount || 0), categorie: fields.category || 'non_categorise', libelle: fields.label || fields.notes || 'Transaction Horizon', date: fields.date || today(), source: 'horizon_assistant' } });
  if (intent === 'task_creation') actions.push({ module: 'taches', action: 'create_task', table: 'taches', payload: { title: fields.title, description: fields.description || '', due_date: fields.due_date || null, priority: fields.priority || 'normale', assignee: fields.assignee || null, source: 'horizon_assistant' } });

  actions.push(buildBusinessEvent({ intent, fields, userId }));
  actions.push({ module: 'centre_ia', action: 'refresh_ai_context', table: null, payload: { intent, updated_at: now(), source: 'horizon_assistant' } });
  return actions;
}

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;
  const body = await readJsonBody(req);
  const draft = body.draft || {};
  const userId = body.userId || body.user_id || null;
  const execute = Boolean(body.execute);
  const intent = normalizeIntent(draft);
  const fields = fieldsOf(draft);
  if (!body.confirmed) return json(res, 400, { ok: false, status: 'confirmation_required', message: 'Validation utilisateur obligatoire avant exécution.' });
  const missing = validateRequiredFields(intent, fields);
  if (missing.length) return json(res, 422, { ok: false, status: 'missing_fields', intent, missing_fields: missing, message: `Champs manquants: ${missing.join(', ')}` });
  const actions = buildActionsForDraft(draft, userId);
  const impactedModules = [...new Set(actions.map((action) => action.module).filter(Boolean))];
  const execution = execute ? await executeAssistantActions(req, actions, { userId, intent }) : { executed: false, mode: 'dry_run', results: actions.map((action) => ({ ...action, executed: false, status: 'dry_run' })) };
  return json(res, 200, { ok: !execution.has_error, status: execute ? (execution.executed ? 'executed' : 'execution_attempted') : 'dry_run', intent, confirmed: true, executed: Boolean(execution.executed), execution_mode: execution.mode, execution_note: execute ? 'Exécution demandée avec le token utilisateur. Les règles Supabase/RLS restent appliquées.' : 'Simulation de validation. Aucune donnée écrite.', impacted_modules: impactedModules, impacted_module_labels: impactedModules.map((module) => moduleLabels[module] || module), actions, execution, message: execution.executed ? `Nécessaire fait. Modules mis à jour: ${impactedModules.map((module) => moduleLabels[module] || module).join(', ')}.` : `Nécessaire préparé. Modules concernés: ${impactedModules.map((module) => moduleLabels[module] || module).join(', ')}.`, timestamp: now() });
}
