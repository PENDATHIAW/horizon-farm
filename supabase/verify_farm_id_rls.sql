-- Vérification LECTURE SEULE : tables métier sans farm_id ou sans RLS active.
--
-- À exécuter tel quel dans le SQL editor Supabase. N'écrit rien. Doit renvoyer
-- ZÉRO ligne une fois la migration 20260713120000_farm_id_rls_all_business_tables
-- appliquée. Toute ligne renvoyée indique une table métier à corriger : la
-- colonne « probleme » dit s'il manque farm_id, la RLS active, ou les deux.
--
-- La liste des tables métier ci-dessous est la même que celle de la migration.
-- Les tables techniques ou farm-agnostiques (farms, companies, user_farm_access,
-- profiles, module_role_permissions, system_settings, audit_logs,
-- security_events, offline_queue, push_subscriptions, deleted_records,
-- api_webhooks, automation_settings, market_*) sont volontairement exclues.

with tables_metier(nom) as (
  values
    ('animals'),('lots'),('alimentation_logs'),('production_oeufs_logs'),
    ('animal_health_records'),('animal_purchases'),('animal_weight_records'),
    ('reproduction_events'),('vaccins'),('veterinaires'),('veterinary_interventions'),
    ('veterinary_intervention_targets'),('veterinary_intervention_templates'),
    ('veterinary_rounds'),('intervention_medications'),('tracabilite'),
    ('clients'),('sales'),('sales_orders'),('sales_order_items'),('sales_opportunities'),
    ('deliveries'),('invoices'),('payments'),('client_receivables'),
    ('stocks'),('stock_movements'),('fournisseurs'),('price_catalog'),
    ('transactions'),('treasury_accounts'),('treasury_movements'),('investissements'),
    ('accounting_accounts'),('accounting_budgets'),('accounting_closures'),
    ('accounting_documents'),('accounting_entries'),('accounting_entry_lines'),
    ('farm_cost_settings'),
    ('cultures'),
    ('tasks'),
    ('alertes_center'),('alert_rules'),('alert_events'),('alertes_history'),('alertes_settings'),
    ('documents'),('erp_documents'),('reports'),
    ('farm_rh_directory'),
    ('equipment'),
    ('business_events'),
    ('business_plans'),('bp_funding_sources'),('bp_investment_lines'),('bp_lines_history'),
    ('bp_links'),('bp_recurring_costs'),('bp_revenue_projections'),('bp_risks'),('bp_versions'),
    ('feed_facility_zones'),('feed_finished_batches'),('feed_formula_ingredients'),
    ('feed_formula_versions'),('feed_formulas'),('feed_phase'),('feed_production_orders'),
    ('feed_quality_checks'),('feed_raw_batches'),('feed_raw_materials'),('feed_trials'),
    ('sensor_devices'),('sensor_readings'),('camera_devices'),('smartfarm_events'),
    ('funding_agreements'),('funding_applications'),('funding_contacts'),
    ('funding_document_library'),('funding_expense_allocations'),('funding_opportunities'),
    ('funding_project_journal'),('funding_reports'),('funder_accounts'),('funder_access_logs'),
    ('investor_forum_contacts'),('investor_forum_documents'),('investor_forum_exports'),
    ('investor_forum_profiles'),
    ('ai_decisions'),('ai_intake_events'),('ai_recommendations'),('ai_scores'),
    ('whatsapp_logs'),('whatsapp_notifications'),('whatsapp_templates')
),
etat as (
  select
    tm.nom,
    to_regclass('public.' || tm.nom) is not null as existe,
    exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = tm.nom and c.column_name = 'farm_id'
    ) as a_farm_id,
    coalesce((
      select cl.relrowsecurity from pg_class cl
      join pg_namespace n on n.oid = cl.relnamespace
      where n.nspname = 'public' and cl.relname = tm.nom
    ), false) as rls_active
  from tables_metier tm
)
select
  nom as table_metier,
  case
    when not a_farm_id and not rls_active then 'manque farm_id ET rls'
    when not a_farm_id then 'manque farm_id'
    when not rls_active then 'rls non active'
  end as probleme
from etat
where existe            -- on n'exige rien des tables absentes de cet environnement
  and (not a_farm_id or not rls_active)
order by probleme, table_metier;
