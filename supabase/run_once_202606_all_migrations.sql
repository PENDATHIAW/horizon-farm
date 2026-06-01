-- =============================================================================
-- Horizon Farm — 6 migrations 202606 (à exécuter UNE SEULE FOIS dans Supabase)
-- Dashboard → SQL Editor → New query → coller TOUT ce fichier → Run
--
-- Si erreur "syntax error at or near for" : le SQL Editor a découpé le script.
--   → Exécutez d'abord run_once_202606_tables_only.sql
--   → Puis run_once_202606_trigger_only.sql (en entier, sans rien sélectionner)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Bootstrap minimal (si table companies / fonctions RLS absentes)
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Horizon Farm',
  slug text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $current_profile_role$
begin
  if auth.uid() is null then
    return 'visiteur';
  end if;
  if to_regclass('public.profiles') is not null then
    return coalesce(
      (select p.role from public.profiles p where p.id = auth.uid() limit 1),
      'admin'
    );
  end if;
  return 'admin';
end;
$current_profile_role$;

create or replace function public.current_company_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $current_company_id$
begin
  if to_regclass('public.profiles') is not null then
    return (select p.company_id from public.profiles p where p.id = auth.uid() limit 1);
  end if;
  return null;
end;
$current_company_id$;

create or replace function public.can_read_erp()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('admin','manager','employe','veterinaire','comptable');
$$;

create or replace function public.can_write_erp()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('admin','manager','employe','veterinaire','comptable');
$$;

create or replace function public.can_admin_erp()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- 1/6 — Champs push sur alertes_center
-- ---------------------------------------------------------------------------

alter table public.alertes_center
  add column if not exists push_status text,
  add column if not exists push_notified_at timestamptz,
  add column if not exists push_error text,
  add column if not exists push_notification_count integer not null default 0,
  add column if not exists last_push_attempt_at timestamptz;

create index if not exists idx_alertes_center_push_notified_at
  on public.alertes_center(push_notified_at);

create index if not exists idx_alertes_center_push_status
  on public.alertes_center(push_status);

-- ---------------------------------------------------------------------------
-- 2/6 — Trigger push (version finale 20260601002000)
-- IMPORTANT : exécuter ce bloc en une seule fois (ne pas couper sur les ;)
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push_on_critical_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $dispatch_push$
declare
  app_url text;
  cron_secret text;
  payload jsonb;
  alert_severity text;
  alert_status text;
  alert_module text;
begin
  payload := to_jsonb(new);

  alert_severity := lower(coalesce(payload->>'severity', payload->>'gravite', ''));
  alert_status := lower(coalesce(payload->>'status', payload->>'statut', 'nouvelle'));
  alert_module := lower(coalesce(payload->>'module_source', payload->>'module', 'alertes'));

  if alert_status <> 'nouvelle' then
    return new;
  end if;

  if new.push_notified_at is not null then
    return new;
  end if;

  if alert_severity in ('urgence', 'critique') then
    null;
  elsif alert_module in (
    'stock', 'avicole', 'animaux', 'sante', 'smartfarm', 'equipements',
    'finances', 'clients', 'documents', 'documents_rapports', 'taches', 'ventes'
  ) then
    null;
  else
    return new;
  end if;

  select value into app_url from public.system_settings where key = 'APP_PUBLIC_URL' limit 1;
  select value into cron_secret from public.system_settings where key = 'CRON_SECRET' limit 1;

  if app_url is null or length(trim(app_url)) = 0 then
    return new;
  end if;

  perform net.http_post(
    url := trim(trailing '/' from app_url) || '/api/push/send-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(cron_secret, '')
    ),
    body := jsonb_build_object(
      'source', 'supabase_alert_trigger',
      'alert_id', payload->>'id'
    )
  );

  return new;
exception when others then
  return new;
end;
$dispatch_push$;

drop trigger if exists trg_dispatch_push_on_critical_alert on public.alertes_center;

create trigger trg_dispatch_push_on_critical_alert
after insert on public.alertes_center
for each row
execute function public.dispatch_push_on_critical_alert();

-- ---------------------------------------------------------------------------
-- 3/6 — Colonnes issue_key / source / related
-- ---------------------------------------------------------------------------

alter table if exists public.alertes_center
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.taches
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.ai_recommendations
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.business_events
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.documents
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.finances
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.sales_orders
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.payments
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.stock
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

create index if not exists idx_alertes_center_issue_key on public.alertes_center(issue_key);
create index if not exists idx_taches_issue_key on public.taches(issue_key);
create index if not exists idx_ai_recommendations_issue_key on public.ai_recommendations(issue_key);
create index if not exists idx_business_events_issue_key on public.business_events(issue_key);
create index if not exists idx_documents_issue_key on public.documents(issue_key);
create index if not exists idx_finances_issue_key on public.finances(issue_key);
create index if not exists idx_sales_orders_issue_key on public.sales_orders(issue_key);
create index if not exists idx_payments_issue_key on public.payments(issue_key);
create index if not exists idx_stock_issue_key on public.stock(issue_key);

-- ---------------------------------------------------------------------------
-- 4/6 — Table stock_movements + RLS
-- ---------------------------------------------------------------------------

create table if not exists public.stock_movements (
  id text primary key,
  stock_id text not null,
  movement_type text not null default 'entree',
  quantity numeric not null default 0,
  unit text,
  stock_before numeric,
  stock_after numeric,
  stock_delta numeric,
  source_module text,
  source_record_id text,
  linked_event_id text,
  notes text,
  movement_date date not null default current_date,
  created_at timestamptz not null default now(),
  company_id uuid
);

create index if not exists stock_movements_stock_id_idx on public.stock_movements(stock_id);
create index if not exists stock_movements_date_idx on public.stock_movements(movement_date desc);
create index if not exists stock_movements_source_idx on public.stock_movements(source_module, source_record_id);

alter table public.stock_movements enable row level security;

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements
  for select to authenticated
  using (public.can_read_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));

drop policy if exists stock_movements_insert on public.stock_movements;
create policy stock_movements_insert on public.stock_movements
  for insert to authenticated
  with check (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));

drop policy if exists stock_movements_update on public.stock_movements;
create policy stock_movements_update on public.stock_movements
  for update to authenticated
  using (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()))
  with check (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));

-- ---------------------------------------------------------------------------
-- 5/6 — module_role_permissions + RBAC
-- ---------------------------------------------------------------------------

create table if not exists public.module_role_permissions (
  id text primary key,
  module_id text not null,
  role text not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  can_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (module_id, role)
);

alter table public.module_role_permissions enable row level security;

drop policy if exists module_role_permissions_read on public.module_role_permissions;
create policy module_role_permissions_read on public.module_role_permissions
  for select to authenticated
  using (public.can_read_erp());

drop policy if exists module_role_permissions_admin on public.module_role_permissions;
create policy module_role_permissions_admin on public.module_role_permissions
  for all to authenticated
  using (public.can_admin_erp())
  with check (public.can_admin_erp());

insert into public.module_role_permissions (id, module_id, role, can_read, can_write, can_admin) values
  ('perm-admin-all', '*', 'admin', true, true, true),
  ('perm-manager-read', '*', 'manager', true, true, false),
  ('perm-comptable-finance', 'finances', 'comptable', true, true, false),
  ('perm-comptable-compta', 'comptabilite', 'comptable', true, true, false),
  ('perm-vet-elevage', 'elevage', 'veterinaire', true, true, false),
  ('perm-vet-sante', 'sante', 'veterinaire', true, true, false),
  ('perm-employe-read', '*', 'employe', true, false, false)
on conflict (module_id, role) do nothing;

create or replace function public.can_access_module(p_module text, p_action text default 'read')
returns boolean
language sql
security definer
set search_path = public
stable
as $can_access_module$
  select exists (
    select 1
    from public.module_role_permissions m
    where (m.module_id = p_module or m.module_id = '*')
      and m.role = public.current_profile_role()
      and case lower(p_action)
        when 'write' then m.can_write or m.can_admin
        when 'admin' then m.can_admin
        else m.can_read or m.can_write or m.can_admin
      end
  )
  or public.can_admin_erp();
$can_access_module$;
