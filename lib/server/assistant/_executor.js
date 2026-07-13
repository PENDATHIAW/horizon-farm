import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const canExecuteWithUserAuth = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const extractBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

export const createUserScopedSupabase = (accessToken) => {
  if (!canExecuteWithUserAuth() || !accessToken) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
};

const tableAliases = Object.freeze({
  stock: 'stocks',
  finances: 'transactions',
  animaux: 'animals',
  avicole: 'lots',
  taches: 'tasks',
});

const resolveTable = (table) => tableAliases[table] || table;

const safeTables = new Set([
  'stocks',
  'transactions',
  'fournisseurs',
  'clients',
  'sales_orders',
  'sales_opportunities',
  'animals',
  'lots',
  'cultures',
  'documents',
  'tasks',
  'business_events',
  'alertes_center',
  'business_plans',
  'bp_investment_lines',
  'bp_recurring_costs',
  'bp_revenue_projections',
  'bp_funding_sources',
  'bp_links',
  'bp_risks',
]);

const safeInsertActions = new Set([
  'create_stock_entry',
  'create_paid_expense',
  'create_supplier_payable',
  'create_supplier',
  'create_client',
  'create_sales_order',
  'create_sales_opportunity',
  'create_animal',
  'create_poultry_lot',
  'create_finance_transaction',
  'create_task',
  'create_technical_task',
  'create_business_event',
  'create_alert',
  'create_business_plan',
  'create_bp_investment_line',
  'create_bp_recurring_cost',
  'create_bp_revenue_projection',
  'create_bp_funding_source',
  'create_bp_link',
  'create_bp_risk',
]);

const shouldInsert = (action) => {
  if (!action?.table) return false;
  if (action.requires_additional_validation) return false;
  if (!safeTables.has(resolveTable(action.table))) return false;
  if (!safeInsertActions.has(action.action)) return false;
  return true;
};

const decoratePayload = (payload = {}, context = {}) => ({
  ...payload,
  farm_id: payload.farm_id || context.farmId,
  created_at: payload.created_at || new Date().toISOString(),
  updated_at: payload.updated_at || new Date().toISOString(),
  created_by: payload.created_by || context.userId || null,
});

export async function executeAssistantActions(req, actions = [], context = {}) {
  const token = extractBearerToken(req);
  const supabase = createUserScopedSupabase(token);

  if (!supabase) {
    return {
      executed: false,
      mode: 'dry_run',
      reason: token ? 'Configuration Supabase API absente. Aucune écriture réelle effectuée.' : 'Token utilisateur absent. Aucune écriture réelle effectuée.',
      results: actions.map((action) => ({ ...action, executed: false, status: shouldInsert(action) ? 'ready_for_user_scoped_insert' : 'skipped' })),
    };
  }

  const results = [];

  for (const action of actions) {
    if (!shouldInsert(action)) {
      results.push({ ...action, executed: false, status: action.requires_additional_validation ? 'requires_additional_validation' : 'skipped' });
      continue;
    }

    const table = resolveTable(action.table);
    const payload = decoratePayload(action.payload || {}, context);
    if (!payload.farm_id) {
      results.push({ ...action, table, executed: false, status: 'error', error: 'Ferme active manquante.', payload });
      continue;
    }
    const { data, error } = await supabase.from(table).insert(payload).select().single();

    if (error) {
      results.push({ ...action, table, executed: false, status: 'error', error: error.message, payload });
      continue;
    }

    results.push({ ...action, table, executed: true, status: 'inserted', record: data, payload });
  }

  const hasError = results.some((result) => result.status === 'error');
  const insertedCount = results.filter((result) => result.executed).length;

  return { executed: insertedCount > 0 && !hasError, mode: 'user_scoped_supabase', inserted_count: insertedCount, has_error: hasError, results };
}
