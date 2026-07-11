-- AGRI FEEDS — durcissement RLS après les migrations de création.
-- Ne réécrit pas les migrations déjà appliquées : remplace seulement les politiques ouvertes.

create or replace function public.current_profile_permissions()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select permissions from public.profiles where id = auth.uid()), '{}'::jsonb);
$$;

create or replace function public.profile_permission_text(permission_key text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_permissions() ->> permission_key, '');
$$;

create or replace function public.profile_permission_enabled(permission_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(public.profile_permission_text(permission_key)) in ('true', '1', 'yes', 'read', 'write', 'admin');
$$;

create or replace function public.can_read_agri_feeds(target_farm_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select (
    public.can_access_module('agri_feeds', 'read')
    or public.current_profile_role() in ('admin', 'manager', 'employe', 'comptable')
    or public.profile_permission_enabled('agri_feeds')
    or public.profile_permission_enabled('agri_feeds_read')
    or public.profile_permission_enabled('responsable_agri_feeds')
    or public.profile_permission_enabled('technicien_agri_feeds')
    or public.profile_permission_enabled('commercial_agri_feeds')
    or public.profile_permission_enabled('finance_agri_feeds')
    or public.profile_permission_enabled('lecteur_financeur')
    or public.profile_permission_enabled('financeur_readonly')
  )
  and (
    public.can_admin_erp()
    or (target_farm_id is null and public.current_profile_role() in ('admin', 'manager'))
    or (target_farm_id is not null and public.can_read_farm(target_farm_id))
  );
$$;

create or replace function public.can_write_agri_feeds(target_farm_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select (
    public.can_access_module('agri_feeds', 'write')
    or public.current_profile_role() in ('admin', 'manager', 'employe', 'comptable')
    or lower(public.profile_permission_text('agri_feeds')) in ('write', 'admin')
    or lower(public.profile_permission_text('agri_feeds_write')) in ('true', '1', 'yes', 'write', 'admin')
    or lower(public.profile_permission_text('responsable_agri_feeds')) in ('true', '1', 'yes', 'write', 'admin')
    or lower(public.profile_permission_text('technicien_agri_feeds')) in ('true', '1', 'yes', 'write')
    or lower(public.profile_permission_text('commercial_agri_feeds')) in ('write', 'admin')
    or lower(public.profile_permission_text('finance_agri_feeds')) in ('write', 'admin')
  )
  and not public.profile_permission_enabled('lecteur_financeur')
  and not public.profile_permission_enabled('financeur_readonly')
  and (
    public.can_admin_erp()
    or (target_farm_id is null and public.current_profile_role() in ('admin', 'manager'))
    or (target_farm_id is not null and public.can_write_farm(target_farm_id))
  );
$$;

create or replace function public.can_delete_agri_feeds(target_farm_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select (
    public.can_admin_erp()
    or public.current_profile_role() = 'manager'
    or lower(public.profile_permission_text('agri_feeds')) = 'admin'
  )
  and not public.profile_permission_enabled('lecteur_financeur')
  and not public.profile_permission_enabled('financeur_readonly')
  and (
    public.can_admin_erp()
    or (target_farm_id is null and public.current_profile_role() = 'manager')
    or (target_farm_id is not null and public.can_write_farm(target_farm_id))
  );
$$;

insert into public.module_role_permissions (id, module_id, role, can_read, can_write, can_admin) values
  ('perm-agri-feeds-admin', 'agri_feeds', 'admin', true, true, true),
  ('perm-agri-feeds-manager', 'agri_feeds', 'manager', true, true, false),
  ('perm-agri-feeds-employe', 'agri_feeds', 'employe', true, true, false),
  ('perm-agri-feeds-comptable', 'agri_feeds', 'comptable', true, true, false),
  ('perm-agri-feeds-veterinaire', 'agri_feeds', 'veterinaire', true, false, false),
  ('perm-agri-feeds-responsable', 'agri_feeds', 'responsable_agri_feeds', true, true, false),
  ('perm-agri-feeds-technicien', 'agri_feeds', 'technicien', true, true, false),
  ('perm-agri-feeds-commercial', 'agri_feeds', 'commercial', true, true, false),
  ('perm-agri-feeds-finance', 'agri_feeds', 'finance', true, true, false),
  ('perm-agri-feeds-financeur', 'agri_feeds', 'lecteur_financeur', true, false, false)
on conflict (module_id, role) do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  can_admin = excluded.can_admin;

do $$
declare
  t text;
begin
  foreach t in array array[
    'feed_facility_zones',
    'feed_raw_materials',
    'feed_raw_batches',
    'feed_formulas',
    'feed_formula_versions',
    'feed_formula_ingredients',
    'feed_production_orders',
    'feed_finished_batches',
    'feed_quality_checks',
    'feed_trials',
    'feed_phase1_comparisons'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format(
      'create policy %I_read on public.%I for select to authenticated using (public.can_read_agri_feeds(farm_id))',
      t, t
    );
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (public.can_write_agri_feeds(farm_id))',
      t, t
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (public.can_write_agri_feeds(farm_id)) with check (public.can_write_agri_feeds(farm_id))',
      t, t
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (public.can_delete_agri_feeds(farm_id))',
      t, t
    );
  end loop;
end $$;

comment on function public.can_read_agri_feeds(uuid) is
  'Lecture AGRI FEEDS : RBAC module + scope farm_id ; inclut financeur en lecture seule si permission explicite.';
comment on function public.can_write_agri_feeds(uuid) is
  'Écriture AGRI FEEDS : responsable/promotrice, technicien, commercial/finance autorisés ; financeur explicitement exclu.';
