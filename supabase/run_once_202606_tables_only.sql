-- Partie A : tables + colonnes (sans fonction PL/pgSQL)
-- Exécuter en premier si le fichier complet échoue.

alter table public.alertes_center
  add column if not exists push_status text,
  add column if not exists push_notified_at timestamptz,
  add column if not exists push_error text,
  add column if not exists push_notification_count integer not null default 0,
  add column if not exists last_push_attempt_at timestamptz;

create index if not exists idx_alertes_center_push_notified_at on public.alertes_center(push_notified_at);
create index if not exists idx_alertes_center_push_status on public.alertes_center(push_status);

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
  company_id uuid references public.companies(id) on delete set null
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
