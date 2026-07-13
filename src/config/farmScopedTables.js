export const FARM_SCOPED_TABLES = Object.freeze([
  'animals', 'lots', 'alimentation_logs', 'production_oeufs_logs',
  'animal_health_records', 'animal_purchases', 'animal_weight_records',
  'reproduction_events', 'vaccins', 'veterinaires', 'veterinary_interventions',
  'veterinary_intervention_targets', 'veterinary_intervention_templates',
  'veterinary_rounds', 'intervention_medications', 'tracabilite',
  'clients', 'sales', 'sales_orders', 'sales_order_items', 'sales_opportunities',
  'deliveries', 'invoices', 'payments', 'client_receivables',
  'stocks', 'stock_movements', 'fournisseurs', 'price_catalog',
  'transactions', 'treasury_accounts', 'treasury_movements', 'investissements',
  'accounting_accounts', 'accounting_budgets', 'accounting_closures',
  'accounting_documents', 'accounting_entries', 'accounting_entry_lines',
  'farm_cost_settings', 'cultures', 'tasks',
  'alertes_center', 'alert_rules', 'alert_events', 'alertes_history', 'alertes_settings',
  'documents', 'erp_documents', 'reports', 'farm_rh_directory', 'equipment',
  'business_events', 'business_plans', 'bp_funding_sources', 'bp_investment_lines',
  'bp_lines_history', 'bp_links', 'bp_recurring_costs', 'bp_revenue_projections',
  'bp_risks', 'bp_versions', 'planning_simulations',
  'feed_facility_zones', 'feed_finished_batches', 'feed_formula_ingredients',
  'feed_formula_versions', 'feed_formulas', 'feed_phase1_comparisons',
  'feed_production_orders', 'feed_quality_checks', 'feed_raw_batches',
  'feed_raw_materials', 'feed_trials', 'sensor_devices', 'sensor_readings',
  'camera_devices', 'smartfarm_events', 'funding_agreements',
  'funding_applications', 'funding_contacts', 'funding_document_library',
  'funding_expense_allocations', 'funding_opportunities', 'funding_project_journal',
  'funding_reports', 'funder_accounts', 'funder_access_logs',
  'investor_forum_contacts', 'investor_forum_documents', 'investor_forum_exports',
  'investor_forum_profiles', 'ai_decisions', 'ai_intake_events',
  'ai_recommendations', 'ai_scores', 'whatsapp_logs', 'whatsapp_notifications',
  'whatsapp_templates',
]);

export const FARM_SCOPED_TABLE_SET = new Set(FARM_SCOPED_TABLES);

export function isFarmScopedTable(table) {
  return FARM_SCOPED_TABLE_SET.has(String(table || ''));
}
