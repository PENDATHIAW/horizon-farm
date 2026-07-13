-- Isolation stricte par ferme et par role sur toutes les tables metier.
-- Migration repetable : elle convertit et rattache l'historique avant de
-- rendre farm_id obligatoire, puis remplace les anciennes politiques RLS.

create or replace function public.canonical_erp_role(raw_role text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(raw_role, ''))
    when 'admin' then 'admin_support'
    when 'super_admin' then 'admin_support'
    when 'manager' then 'promotrice_direction'
    when 'direction' then 'promotrice_direction'
    when 'employe' then 'terrain'
    when 'farm_agent' then 'terrain'
    when 'farm_stock_manager' then 'terrain'
    when 'comptable' then 'finance'
    when 'farm_accountant' then 'finance'
    when 'responsable_agri_feeds' then 'responsable_filiere'
    when 'farm_manager' then 'responsable_filiere'
    when 'commercial' then 'responsable_filiere'
    when 'farm_commercial' then 'responsable_filiere'
    when 'technicien_elevage' then 'terrain'
    when 'farm_veterinary' then 'veterinaire'
    when 'lecteur_financeur' then 'financeur_externe'
    when 'farm_readonly' then 'financeur_externe'
    when 'promotrice_direction' then 'promotrice_direction'
    when 'responsable_filiere' then 'responsable_filiere'
    when 'terrain' then 'terrain'
    when 'finance' then 'finance'
    when 'veterinaire' then 'veterinaire'
    when 'maintenance' then 'maintenance'
    when 'financeur_externe' then 'financeur_externe'
    when 'admin_support' then 'admin_support'
    when 'visiteur' then 'visiteur'
    else 'visiteur'
  end;
$$;

-- Les profils et acces existants basculent vers les huit roles officiels.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.profiles'::regclass
      and con.contype = 'c'
      and att.attname = 'role'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;

  update public.profiles
  set role = public.canonical_erp_role(role), updated_at = now()
  where role is distinct from public.canonical_erp_role(role);

  alter table public.profiles
    add constraint profiles_role_check check (role in (
      'promotrice_direction','responsable_filiere','terrain','finance',
      'veterinaire','maintenance','financeur_externe','admin_support','visiteur'
    ));

  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.user_farm_access'::regclass
      and con.contype = 'c'
      and att.attname = 'access_role'
  loop
    execute format('alter table public.user_farm_access drop constraint %I', constraint_name);
  end loop;

  update public.user_farm_access access
  set access_role = case
    when public.canonical_erp_role(access.access_role) = 'visiteur'
      then coalesce((select public.canonical_erp_role(profile.role) from public.profiles profile where profile.id = access.user_id), 'terrain')
    else public.canonical_erp_role(access.access_role)
  end,
  updated_at = now();

  alter table public.user_farm_access
    add constraint user_farm_access_role_check check (access_role in (
      'promotrice_direction','responsable_filiere','terrain','finance',
      'veterinaire','maintenance','financeur_externe','admin_support'
    ));
end $$;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select public.canonical_erp_role(role) from public.profiles where id = auth.uid()), 'visiteur');
$$;

create or replace function public.current_erp_role(target_farm_id uuid default null)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select public.canonical_erp_role(access.access_role)
     from public.user_farm_access access
     where access.user_id = auth.uid() and access.farm_id = target_farm_id
     limit 1),
    (select 'promotrice_direction'
     from public.farms farm
     where farm.id = target_farm_id and farm.owner_user_id = auth.uid()),
    public.current_profile_role()
  );
$$;

create or replace function public.can_read_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.status = 'active'
      and public.canonical_erp_role(profile.role) in (
        'promotrice_direction','responsable_filiere','terrain','finance',
        'veterinaire','maintenance','financeur_externe','admin_support'
      )
  );
$$;

create or replace function public.can_write_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_read_erp()
    and public.current_profile_role() <> 'financeur_externe';
$$;

create or replace function public.can_admin_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_read_erp()
    and public.current_profile_role() in ('promotrice_direction', 'admin_support');
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select public.can_admin_erp(); $$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select public.can_write_erp(); $$;

create or replace function public.can_access_farm(target_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_farm_id is not null
    and public.can_read_erp()
    and (
      exists (
        select 1 from public.user_farm_access access
        where access.user_id = auth.uid() and access.farm_id = target_farm_id
      )
      or exists (
        select 1 from public.farms farm
        where farm.id = target_farm_id and farm.owner_user_id = auth.uid()
      )
      or (
        public.current_profile_role() in ('promotrice_direction', 'admin_support')
        and exists (
          select 1
          from public.farms farm
          join public.profiles profile on profile.id = auth.uid()
          where farm.id = target_farm_id
            and profile.status = 'active'
            and (profile.company_id is null or profile.company_id = farm.company_id)
        )
      )
    );
$$;

create or replace function public.can_read_farm(target_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select public.can_access_farm(target_farm_id); $$;

create or replace function public.can_write_farm(target_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_access_farm(target_farm_id)
    and public.current_erp_role(target_farm_id) <> 'financeur_externe';
$$;

create or replace function public.farm_table_domain(target_table text)
returns text
language sql
immutable
as $$
  select case
    when target_table = any(array[
      'animals','lots','alimentation_logs','production_oeufs_logs','animal_health_records',
      'animal_purchases','animal_weight_records','reproduction_events','vaccins',
      'veterinaires','veterinary_interventions','veterinary_intervention_targets',
      'veterinary_intervention_templates','veterinary_rounds','intervention_medications','tracabilite'
    ]) then 'elevage'
    when target_table = any(array[
      'clients','sales','sales_orders','sales_order_items','sales_opportunities',
      'deliveries','invoices','payments','client_receivables','whatsapp_logs',
      'whatsapp_notifications','whatsapp_templates'
    ]) then 'commercial'
    when target_table = any(array['stocks','stock_movements','fournisseurs','price_catalog']) then 'stock'
    when target_table = any(array[
      'transactions','treasury_accounts','treasury_movements','investissements',
      'accounting_accounts','accounting_budgets','accounting_closures',
      'accounting_documents','accounting_entries','accounting_entry_lines','farm_cost_settings'
    ]) then 'finance'
    when target_table = 'cultures' then 'cultures'
    when target_table = any(array[
      'tasks','alertes_center','alert_rules','alert_events','alertes_history','alertes_settings'
    ]) then 'activite'
    when target_table = any(array['documents','erp_documents','reports']) then 'documents'
    when target_table = 'farm_rh_directory' then 'equipe'
    when target_table = 'equipment' then 'equipements'
    when target_table = 'business_events' then 'journal'
    when target_table = any(array[
      'business_plans','bp_funding_sources','bp_investment_lines','bp_lines_history',
      'bp_links','bp_recurring_costs','bp_revenue_projections','bp_risks','bp_versions',
      'planning_simulations'
    ]) then 'objectifs'
    when target_table like 'feed_%' then 'agri_feeds'
    when target_table = any(array['sensor_devices','sensor_readings','camera_devices','smartfarm_events']) then 'smartfarm'
    when target_table = any(array[
      'funding_agreements','funding_applications','funding_contacts','funding_document_library',
      'funding_expense_allocations','funding_opportunities','funding_project_journal',
      'funding_reports','funder_accounts','funder_access_logs','investor_forum_contacts',
      'investor_forum_documents','investor_forum_exports','investor_forum_profiles'
    ]) then 'financements'
    when target_table = any(array['ai_decisions','ai_intake_events','ai_recommendations','ai_scores']) then 'decision'
    else 'inconnu'
  end;
$$;

create or replace function public.can_read_farm_table(target_farm_id uuid, target_table text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  role_name text := public.current_erp_role(target_farm_id);
  domain_name text := public.farm_table_domain(target_table);
begin
  if not public.can_access_farm(target_farm_id) then return false; end if;
  if role_name in ('promotrice_direction', 'admin_support', 'responsable_filiere', 'finance') then return true; end if;
  if role_name = 'terrain' then
    return domain_name in ('elevage','cultures','stock','activite','documents','equipements','journal','agri_feeds','smartfarm');
  end if;
  if role_name = 'veterinaire' then
    return domain_name in ('elevage','stock','activite','documents','journal','agri_feeds');
  end if;
  if role_name = 'maintenance' then
    return domain_name in ('stock','activite','documents','equipements','journal','smartfarm');
  end if;
  return false;
end;
$$;

create or replace function public.can_insert_farm_table(target_farm_id uuid, target_table text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  role_name text := public.current_erp_role(target_farm_id);
  domain_name text := public.farm_table_domain(target_table);
begin
  if not public.can_write_farm(target_farm_id) then return false; end if;
  if role_name in ('promotrice_direction', 'admin_support') then return true; end if;
  if role_name = 'responsable_filiere' then
    return domain_name in ('elevage','commercial','stock','cultures','activite','documents','equipe','equipements','journal','objectifs','agri_feeds','smartfarm');
  end if;
  if role_name = 'terrain' then
    return domain_name in ('elevage','cultures','stock','activite','documents','journal','agri_feeds');
  end if;
  if role_name = 'finance' then
    return domain_name in ('commercial','stock','finance','activite','documents','journal','objectifs','financements','decision');
  end if;
  if role_name = 'veterinaire' then
    return domain_name in ('elevage','activite','documents','journal');
  end if;
  if role_name = 'maintenance' then
    return domain_name in ('activite','documents','equipements','journal','smartfarm');
  end if;
  return false;
end;
$$;

create or replace function public.can_update_farm_table(target_farm_id uuid, target_table text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_table not in ('business_events', 'stock_movements')
    and public.can_insert_farm_table(target_farm_id, target_table);
$$;

create or replace function public.can_delete_farm_table(target_farm_id uuid, target_table text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_table not in ('business_events', 'stock_movements', 'accounting_entries', 'accounting_entry_lines')
    and public.can_access_farm(target_farm_id)
    and public.current_erp_role(target_farm_id) in ('promotrice_direction', 'admin_support');
$$;

create or replace function public.can_read_funder_record(target_farm_id uuid, target_table text, record jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  owner_id uuid;
begin
  if not public.can_access_farm(target_farm_id)
    or public.current_erp_role(target_farm_id) <> 'financeur_externe' then
    return false;
  end if;

  if target_table = 'funder_accounts' then
    return record->>'user_id' = auth.uid()::text
      and record->>'status' = 'active'
      and (nullif(record->>'expires_at', '') is null or (record->>'expires_at')::timestamptz > now());
  end if;
  if target_table = 'funder_access_logs' then
    return record->>'user_id' = auth.uid()::text;
  end if;
  if target_table not in ('funding_document_library', 'funding_reports', 'funding_project_journal') then
    return false;
  end if;
  if record->>'status' <> 'published'
    or record->>'visibility' not in ('shared', 'public') then
    return false;
  end if;
  if target_table = 'funding_reports' and coalesce((record->>'immutable')::boolean, false) is not true then
    return false;
  end if;

  owner_id := nullif(record->>'owner_user_id', '')::uuid;
  return exists (
    select 1 from public.funder_accounts account
    where account.user_id = auth.uid()
      and account.farm_id = target_farm_id
      and account.status = 'active'
      and (account.expires_at is null or account.expires_at > now())
      and (owner_id is null or account.owner_user_id = owner_id)
  );
end;
$$;

-- Le trigger Auth accepte les anciens noms uniquement en entree et stocke le role officiel.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status, company_id, permissions)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    public.canonical_erp_role(coalesce(nullif(new.raw_user_meta_data->>'role',''), 'visiteur')),
    coalesce(nullif(new.raw_user_meta_data->>'status',''), 'pending'),
    nullif(new.raw_user_meta_data->>'company_id','')::uuid,
    '{}'::jsonb
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

-- Les permissions de module gardent les huit roles visibles dans l'administration.
insert into public.module_role_permissions (id, module_id, role, can_read, can_write, can_admin) values
  ('perm-role-promotrice', '*', 'promotrice_direction', true, true, true),
  ('perm-role-responsable', '*', 'responsable_filiere', true, true, false),
  ('perm-role-terrain', 'elevage', 'terrain', true, true, false),
  ('perm-role-finance', 'finance_pilotage', 'finance', true, true, false),
  ('perm-role-veterinaire', 'elevage', 'veterinaire', true, true, false),
  ('perm-role-maintenance', 'equipements', 'maintenance', true, true, false),
  ('perm-role-financeur', 'financements', 'financeur_externe', true, false, false),
  ('perm-role-admin-support', '*', 'admin_support', true, true, true)
on conflict (module_id, role) do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  can_admin = excluded.can_admin;

create or replace function public.can_access_module(p_module text, p_action text default 'read')
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.module_role_permissions permission
    where (permission.module_id = p_module or permission.module_id = '*')
      and public.canonical_erp_role(permission.role) = public.current_profile_role()
      and case lower(p_action)
        when 'write' then permission.can_write or permission.can_admin
        when 'admin' then permission.can_admin
        else permission.can_read or permission.can_write or permission.can_admin
      end
  );
$$;

-- Ces trois journaux transversaux etaient declares dans le schema de reference
-- mais absents de l'historique des migrations. Ils ne dupliquent aucune donnee
-- proprietaire et restent inactifs tant qu'aucun workflow ne les alimente.
create table if not exists public.ai_decisions (
  id text primary key,
  recommendation_id text,
  decision_status text not null default 'en_attente',
  decision_by uuid default auth.uid(),
  decision_note text,
  before_data jsonb default '{}'::jsonb,
  after_data jsonb default '{}'::jsonb,
  modules_impacted text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.ai_intake_events (
  id text primary key,
  raw_input text not null,
  input_type text default 'text',
  interpreted_intent text,
  status text default 'brouillon',
  extracted_data jsonb default '{}'::jsonb,
  proposed_actions jsonb default '[]'::jsonb,
  modules_impacted text[] default '{}',
  validation_required boolean default true,
  validated_by uuid,
  validated_at timestamptz,
  execution_result jsonb default '{}'::jsonb,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_scores (
  id text primary key,
  score_type text not null,
  entity_type text not null,
  entity_id text not null,
  score numeric not null default 0,
  score_label text,
  factors jsonb default '{}'::jsonb,
  explanation text,
  calculated_at timestamptz default now(),
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now()
);

do $$
declare
  t text;
  policy_name text;
  constraint_name text;
  default_farm uuid;
  default_company uuid;
  farm_id_udt text;
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  funder_tables constant text[] := array[
    'funding_document_library','funding_reports','funding_project_journal',
    'funder_accounts','funder_access_logs'
  ];
  metier text[] := array[
    -- Elevage
    'animals','lots','alimentation_logs','production_oeufs_logs',
    'animal_health_records','animal_purchases','animal_weight_records',
    'reproduction_events','vaccins','veterinaires','veterinary_interventions',
    'veterinary_intervention_targets','veterinary_intervention_templates',
    'veterinary_rounds','intervention_medications','tracabilite',
    -- Commercial
    'clients','sales','sales_orders','sales_order_items','sales_opportunities',
    'deliveries','invoices','payments','client_receivables',
    -- Achats et stock
    'stocks','stock_movements','fournisseurs','price_catalog',
    -- Finance
    'transactions','treasury_accounts','treasury_movements','investissements',
    'accounting_accounts','accounting_budgets','accounting_closures',
    'accounting_documents','accounting_entries','accounting_entry_lines',
    'farm_cost_settings',
    -- Cultures
    'cultures',
    -- Activite et alertes
    'tasks','alertes_center','alert_rules','alert_events','alertes_history','alertes_settings',
    -- Documents, equipe et equipements
    'documents','erp_documents','reports','farm_rh_directory','equipment',
    -- Journal et objectifs
    'business_events','business_plans','bp_funding_sources','bp_investment_lines',
    'bp_lines_history','bp_links','bp_recurring_costs','bp_revenue_projections',
    'bp_risks','bp_versions','planning_simulations',
    -- AGRI FEEDS
    'feed_facility_zones','feed_finished_batches','feed_formula_ingredients',
    'feed_formula_versions','feed_formulas','feed_phase1_comparisons','feed_production_orders',
    'feed_quality_checks','feed_raw_batches','feed_raw_materials','feed_trials',
    -- Smart Farm
    'sensor_devices','sensor_readings','camera_devices','smartfarm_events',
    -- Financements
    'funding_agreements','funding_applications','funding_contacts',
    'funding_document_library','funding_expense_allocations','funding_opportunities',
    'funding_project_journal','funding_reports','funder_accounts','funder_access_logs',
    'investor_forum_contacts','investor_forum_documents','investor_forum_exports',
    'investor_forum_profiles',
    -- Analyses et messagerie
    'ai_decisions','ai_intake_events','ai_recommendations','ai_scores',
    'whatsapp_logs','whatsapp_notifications','whatsapp_templates'
  ];
begin
  select id into default_farm
  from public.farms
  order by (is_default is true) desc, created_at asc
  limit 1;

  if default_farm is null then
    select id into default_company from public.companies order by created_at asc limit 1;
    if default_company is null then
      insert into public.companies (id, name) values (gen_random_uuid(), 'Horizon Farm')
      returning id into default_company;
    end if;
    insert into public.farms (id, company_id, name, country, status, is_default, settings)
    values (
      gen_random_uuid(), default_company, 'Horizon Farm', 'SN', 'active', true,
      '{"modules":{"agri_feeds":true,"smartfarm":true,"financements":true,"assistant_erp":true}}'::jsonb
    ) returning id into default_farm;
  end if;

  foreach t in array metier loop
    if to_regclass('public.' || t) is null then continue; end if;

    select column_meta.udt_name into farm_id_udt
    from information_schema.columns column_meta
    where column_meta.table_schema = 'public'
      and column_meta.table_name = t
      and column_meta.column_name = 'farm_id';

    if farm_id_udt is null then
      execute format('alter table public.%I add column farm_id uuid', t);
    elsif farm_id_udt <> 'uuid' then
      execute format('alter table public.%I alter column farm_id drop default', t);
      execute format(
        'alter table public.%I alter column farm_id type uuid using (case when farm_id is null then %L::uuid when farm_id::text ~* %L then farm_id::text::uuid else %L::uuid end)',
        t, default_farm, uuid_pattern, default_farm
      );
    end if;

    execute format(
      'update public.%I row_to_scope set farm_id = %L where row_to_scope.farm_id is null or not exists (select 1 from public.farms farm where farm.id = row_to_scope.farm_id)',
      t, default_farm
    );
    execute format('alter table public.%I alter column farm_id set not null', t);

    for constraint_name in
      select con.conname
      from pg_constraint con
      join pg_attribute att
        on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      where con.conrelid = to_regclass('public.' || t)
        and con.contype = 'f'
        and con.confrelid = 'public.farms'::regclass
        and att.attname = 'farm_id'
    loop
      execute format('alter table public.%I drop constraint %I', t, constraint_name);
    end loop;
    execute format(
      'alter table public.%I add constraint %I foreign key (farm_id) references public.farms(id) on delete restrict',
      t, 'fk_' || t || '_farm_id'
    );

    execute format('create index if not exists %I on public.%I(farm_id)', 'idx_' || t || '_farm_id', t);
    execute format('alter table public.%I add column if not exists is_deleted boolean not null default false', t);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists deleted_by text', t);
    execute format('update public.%I set is_deleted = false where is_deleted is null', t);
    execute format('alter table public.%I alter column is_deleted set default false', t);
    execute format('alter table public.%I alter column is_deleted set not null', t);
    execute format(
      'create index if not exists %I on public.%I(farm_id) where is_deleted is false',
      'idx_' || t || '_active_farm', t
    );
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated, service_role',
      t
    );

    for policy_name in
      select policy.policyname
      from pg_policies policy
      where policy.schemaname = 'public' and policy.tablename = t
    loop
      execute format('drop policy %I on public.%I', policy_name, t);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (is_deleted is false and public.can_read_farm_table(farm_id, %L))',
      t || '_farm_read', t, t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_insert_farm_table(farm_id, %L))',
      t || '_farm_insert', t, t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_update_farm_table(farm_id, %L)) with check (public.can_update_farm_table(farm_id, %L))',
      t || '_farm_update', t, t, t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_delete_farm_table(farm_id, %L))',
      t || '_farm_delete', t, t
    );

    if t = any(funder_tables) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.can_read_funder_record(farm_id, %L, to_jsonb(%I)))',
        t || '_funder_read', t, t, t
      );
    end if;
  end loop;
end $$;

grant execute on function public.current_erp_role(uuid) to authenticated;
grant execute on function public.can_read_farm_table(uuid, text) to authenticated;
grant execute on function public.can_insert_farm_table(uuid, text) to authenticated;
grant execute on function public.can_update_farm_table(uuid, text) to authenticated;
grant execute on function public.can_delete_farm_table(uuid, text) to authenticated;
grant execute on function public.can_read_funder_record(uuid, text, jsonb) to authenticated;
