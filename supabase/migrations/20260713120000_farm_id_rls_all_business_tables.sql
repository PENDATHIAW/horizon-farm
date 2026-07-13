-- Lot A : farm_id + RLS par ferme sur toutes les tables métier.
--
-- Idempotent. Pour chaque table métier existante : ajoute farm_id (nullable),
-- rattache les lignes existantes à la ferme Horizon Farm par défaut, crée
-- l'index, active la RLS et pose des politiques de lecture/écriture par ferme
-- (can_read_farm / can_write_farm, définies par 20260606120000_multi_farm_foundations).
--
-- Tables HORS périmètre (farm-agnostiques ou techniques, volontairement exclues) :
--   farms, companies, user_farm_access, profiles, module_role_permissions,
--   system_settings, audit_logs, security_events, offline_queue,
--   push_subscriptions, deleted_records, api_webhooks, automation_settings,
--   market_prices, market_price_sources, market_calendar_events.
-- Le script supabase/verify_farm_id_rls.sql applique la même frontière et doit
-- renvoyer zéro ligne une fois cette migration appliquée.

do $$
declare
  t text;
  default_farm uuid;
  default_company uuid;
  metier text[] := array[
    -- Élevage
    'animals','lots','alimentation_logs','production_oeufs_logs',
    'animal_health_records','animal_purchases','animal_weight_records',
    'reproduction_events','vaccins','veterinaires','veterinary_interventions',
    'veterinary_intervention_targets','veterinary_intervention_templates',
    'veterinary_rounds','intervention_medications','tracabilite',
    -- Commercial
    'clients','sales','sales_orders','sales_order_items','sales_opportunities',
    'deliveries','invoices','payments','client_receivables',
    -- Achats & Stock
    'stocks','stock_movements','fournisseurs','price_catalog',
    -- Finance
    'transactions','treasury_accounts','treasury_movements','investissements',
    'accounting_accounts','accounting_budgets','accounting_closures',
    'accounting_documents','accounting_entries','accounting_entry_lines',
    'farm_cost_settings',
    -- Cultures
    'cultures',
    -- Activité & Suivi
    'tasks',
    -- Alertes (moteur central + satellites)
    'alertes_center','alert_rules','alert_events','alertes_history','alertes_settings',
    -- Documents & Rapports
    'documents','erp_documents','reports',
    -- Équipe
    'farm_rh_directory',
    -- Équipements
    'equipment',
    -- Événements métier
    'business_events',
    -- Objectifs & Business Plan
    'business_plans','bp_funding_sources','bp_investment_lines','bp_lines_history',
    'bp_links','bp_recurring_costs','bp_revenue_projections','bp_risks','bp_versions',
    -- AGRI FEEDS
    'feed_facility_zones','feed_finished_batches','feed_formula_ingredients',
    'feed_formula_versions','feed_formulas','feed_phase','feed_production_orders',
    'feed_quality_checks','feed_raw_batches','feed_raw_materials','feed_trials',
    -- Smart Farm
    'sensor_devices','sensor_readings','camera_devices','smartfarm_events',
    -- Financements
    'funding_agreements','funding_applications','funding_contacts',
    'funding_document_library','funding_expense_allocations','funding_opportunities',
    'funding_project_journal','funding_reports','funder_accounts','funder_access_logs',
    'investor_forum_contacts','investor_forum_documents','investor_forum_exports',
    'investor_forum_profiles',
    -- Analyses par ferme
    'ai_decisions','ai_intake_events','ai_recommendations','ai_scores',
    -- Messagerie terrain par ferme
    'whatsapp_logs','whatsapp_notifications','whatsapp_templates'
  ];
begin
  -- Ferme Horizon Farm par défaut (créée si aucune ferme n'existe).
  select id into default_farm from public.farms order by (is_default is true) desc, created_at asc limit 1;
  if default_farm is null then
    select id into default_company from public.companies order by created_at asc limit 1;
    if default_company is null then
      insert into public.companies (id, name) values (gen_random_uuid(), 'Horizon Farm')
      returning id into default_company;
    end if;
    insert into public.farms (id, company_id, name, country, status, is_default, settings)
    values (gen_random_uuid(), default_company, 'Horizon Farm', 'SN', 'active', true,
            '{"modules":{"agri_feeds":true,"smartfarm":true,"financements":true,"assistant_erp":true}}'::jsonb)
    returning id into default_farm;
  end if;

  foreach t in array metier loop
    if to_regclass('public.' || t) is null then
      continue; -- table absente dans cet environnement : on saute proprement
    end if;

    -- farm_id nullable + rattachement à la ferme par défaut + index
    execute format('alter table public.%I add column if not exists farm_id uuid references public.farms(id) on delete set null', t);
    execute format('update public.%I set farm_id = %L where farm_id is null', t, default_farm);
    execute format('create index if not exists %I on public.%I(farm_id)', 'idx_' || t || '_farm_id', t);

    -- RLS par ferme (permissive ; les lignes sans farm_id restent lisibles le
    -- temps de la bascule, à durcir en NOT NULL une fois le backfill validé)
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_farm_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (farm_id is null or public.can_read_farm(farm_id))',
      t || '_farm_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_farm_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (farm_id is null or public.can_write_farm(farm_id)) with check (farm_id is null or public.can_write_farm(farm_id))',
      t || '_farm_write', t);
  end loop;
end $$;
