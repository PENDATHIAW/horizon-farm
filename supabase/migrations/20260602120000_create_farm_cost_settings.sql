-- Paramètres coûts unifiés (Annexe ERP) — synchronisation cloud
create extension if not exists "pgcrypto";

create table if not exists public.farm_cost_settings (
  id text primary key default 'default',
  settings jsonb not null default '{}'::jsonb,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists farm_cost_settings_updated_idx on public.farm_cost_settings (updated_at desc);

alter table public.farm_cost_settings enable row level security;

drop policy if exists farm_cost_settings_select on public.farm_cost_settings;
create policy farm_cost_settings_select on public.farm_cost_settings
  for select to authenticated using (public.can_read_erp());

drop policy if exists farm_cost_settings_insert on public.farm_cost_settings;
create policy farm_cost_settings_insert on public.farm_cost_settings
  for insert to authenticated with check (public.can_write_erp());

drop policy if exists farm_cost_settings_update on public.farm_cost_settings;
create policy farm_cost_settings_update on public.farm_cost_settings
  for update to authenticated
  using (public.can_write_erp())
  with check (public.can_write_erp());
