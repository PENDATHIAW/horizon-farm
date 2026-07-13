-- Verification en lecture seule. Le resultat attendu est zero ligne.
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
    ('farm_cost_settings'),('cultures'),('tasks'),
    ('alertes_center'),('alert_rules'),('alert_events'),('alertes_history'),('alertes_settings'),
    ('documents'),('erp_documents'),('reports'),('farm_rh_directory'),('equipment'),
    ('business_events'),('business_plans'),('bp_funding_sources'),('bp_investment_lines'),
    ('bp_lines_history'),('bp_links'),('bp_recurring_costs'),('bp_revenue_projections'),
    ('bp_risks'),('bp_versions'),('planning_simulations'),
    ('feed_facility_zones'),('feed_finished_batches'),('feed_formula_ingredients'),
    ('feed_formula_versions'),('feed_formulas'),('feed_phase1_comparisons'),('feed_production_orders'),
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
    table_scope.nom,
    to_regclass('public.' || table_scope.nom) is not null as existe,
    exists (
      select 1 from information_schema.columns column_meta
      where column_meta.table_schema = 'public'
        and column_meta.table_name = table_scope.nom
        and column_meta.column_name = 'farm_id'
        and column_meta.udt_name = 'uuid'
    ) as farm_id_uuid,
    exists (
      select 1 from information_schema.columns column_meta
      where column_meta.table_schema = 'public'
        and column_meta.table_name = table_scope.nom
        and column_meta.column_name = 'farm_id'
        and column_meta.is_nullable = 'NO'
    ) as farm_id_non_nul,
    exists (
      select 1
      from pg_constraint constraint_meta
      join pg_attribute attribute_meta
        on attribute_meta.attrelid = constraint_meta.conrelid
        and attribute_meta.attnum = any(constraint_meta.conkey)
      where constraint_meta.conrelid = to_regclass('public.' || table_scope.nom)
        and constraint_meta.contype = 'f'
        and constraint_meta.confrelid = 'public.farms'::regclass
        and attribute_meta.attname = 'farm_id'
    ) as cle_etrangere,
    exists (
      select 1
      from pg_index index_meta
      join pg_attribute attribute_meta
        on attribute_meta.attrelid = index_meta.indrelid
        and attribute_meta.attnum = any(index_meta.indkey)
      where index_meta.indrelid = to_regclass('public.' || table_scope.nom)
        and attribute_meta.attname = 'farm_id'
    ) as index_ferme,
    (
      select count(*) = 3
      from information_schema.columns column_meta
      where column_meta.table_schema = 'public'
        and column_meta.table_name = table_scope.nom
        and column_meta.column_name in ('is_deleted', 'deleted_at', 'deleted_by')
    ) as suppression_logique,
    coalesce((
      select class_meta.relrowsecurity
      from pg_class class_meta
      join pg_namespace namespace_meta on namespace_meta.oid = class_meta.relnamespace
      where namespace_meta.nspname = 'public' and class_meta.relname = table_scope.nom
    ), false) as rls_active,
    coalesce((
      select class_meta.relforcerowsecurity
      from pg_class class_meta
      join pg_namespace namespace_meta on namespace_meta.oid = class_meta.relnamespace
      where namespace_meta.nspname = 'public' and class_meta.relname = table_scope.nom
    ), false) as rls_forcee,
    has_table_privilege('authenticated', 'public.' || table_scope.nom, 'SELECT')
      and has_table_privilege('authenticated', 'public.' || table_scope.nom, 'INSERT')
      and has_table_privilege('authenticated', 'public.' || table_scope.nom, 'UPDATE')
      and has_table_privilege('authenticated', 'public.' || table_scope.nom, 'DELETE')
      as droits_authenticated,
    exists (
      select 1 from pg_policies policy
      where policy.schemaname = 'public' and policy.tablename = table_scope.nom
        and policy.policyname = table_scope.nom || '_farm_read' and policy.cmd = 'SELECT'
        and coalesce(policy.qual, '') like '%is_deleted%'
    ) as politique_lecture,
    exists (
      select 1 from pg_policies policy
      where policy.schemaname = 'public' and policy.tablename = table_scope.nom
        and policy.policyname = table_scope.nom || '_farm_insert' and policy.cmd = 'INSERT'
    ) as politique_insertion,
    exists (
      select 1 from pg_policies policy
      where policy.schemaname = 'public' and policy.tablename = table_scope.nom
        and policy.policyname = table_scope.nom || '_farm_update' and policy.cmd = 'UPDATE'
    ) as politique_modification,
    exists (
      select 1 from pg_policies policy
      where policy.schemaname = 'public' and policy.tablename = table_scope.nom
        and policy.policyname = table_scope.nom || '_farm_delete' and policy.cmd = 'DELETE'
    ) as politique_suppression,
    not exists (
      select 1 from pg_policies policy
      where policy.schemaname = 'public' and policy.tablename = table_scope.nom
        and policy.policyname not in (
          table_scope.nom || '_farm_read', table_scope.nom || '_farm_insert',
          table_scope.nom || '_farm_update', table_scope.nom || '_farm_delete',
          table_scope.nom || '_funder_read'
        )
    ) as aucune_politique_historique
  from tables_metier table_scope
)
select
  nom as table_metier,
  concat_ws(', ',
    case when not farm_id_uuid then 'farm_id non uuid' end,
    case when not farm_id_non_nul then 'farm_id nullable' end,
    case when not cle_etrangere then 'cle etrangere absente' end,
    case when not index_ferme then 'index farm_id absent' end,
    case when not suppression_logique then 'suppression logique absente' end,
    case when not rls_active then 'rls inactive' end,
    case when not rls_forcee then 'rls non forcee' end,
    case when not droits_authenticated then 'droits authenticated incomplets' end,
    case when not politique_lecture then 'lecture absente' end,
    case when not politique_insertion then 'insertion absente' end,
    case when not politique_modification then 'modification absente' end,
    case when not politique_suppression then 'suppression absente' end,
    case when not aucune_politique_historique then 'politique historique restante' end
  ) as probleme
from etat
where existe
  and not (
    farm_id_uuid and farm_id_non_nul and cle_etrangere and index_ferme and suppression_logique
    and rls_active and rls_forcee and droits_authenticated
    and politique_lecture and politique_insertion
    and politique_modification and politique_suppression
    and aucune_politique_historique
  )
order by table_metier;
