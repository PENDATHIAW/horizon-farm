const SIMULATION_SEED_VERSION = 'horizon-farm-bp-financeur-m8-v5';
const SIMULATION_VERSION_KEY = 'horizon_simulated_seed_version';

const TABLE_MODULE_KEYS = [
  'transactions', 'tasks', 'reports', 'equipment', 'animals', 'lots', 'vaccins', 'veterinaires', 'finances',
  'investments', 'business_plans', 'bp_investment_lines', 'bp_recurring_costs', 'bp_revenue_projections',
  'bp_funding_sources', 'bp_links', 'bp_risks', 'price_catalog', 'bp_versions', 'bp_lines_history', 'stocks',
  'stock', 'clients', 'fournisseurs', 'tracabilite', 'cultures', 'ventes', 'documents', 'taches', 'rapports',
  'equipements', 'audit_logs', 'alimentation_logs', 'production_oeufs_logs', 'sensor_devices', 'camera_devices',
  'business_events', 'alertes_center', 'whatsapp_templates', 'whatsapp_logs', 'sales_orders', 'sales_order_items',
  'deliveries', 'invoices', 'payments', 'sales_opportunities', 'animaux', 'avicole', 'sante', 'investissements',
];

const simulatedStorageKey = (table) => `horizon_simulated_rows:${table}`;
const simulatedDeletedKey = (table) => `horizon_simulated_deleted:${table}`;

/** Réinitialise suppressions et surcharges locales du mode simulé. */
export function resetSimulatedModeCache() {
  if (typeof localStorage === 'undefined') return;
  try {
    const tables = new Set(TABLE_MODULE_KEYS);
    tables.forEach((table) => {
      localStorage.removeItem(simulatedStorageKey(table));
      localStorage.removeItem(simulatedDeletedKey(table));
    });
    localStorage.setItem(SIMULATION_VERSION_KEY, SIMULATION_SEED_VERSION);
  } catch {
    // localStorage peut être indisponible.
  }
}

export function resetSimulatedLocalStateIfNeeded() {
  if (typeof localStorage === 'undefined') return;
  try {
    const currentVersion = localStorage.getItem(SIMULATION_VERSION_KEY);
    if (currentVersion === SIMULATION_SEED_VERSION) return;
    resetSimulatedModeCache();
  } catch {
    // Local storage may be blocked. In that case, keep serving seed rows directly.
  }
}

export { simulatedStorageKey, simulatedDeletedKey, SIMULATION_SEED_VERSION, SIMULATION_VERSION_KEY };
