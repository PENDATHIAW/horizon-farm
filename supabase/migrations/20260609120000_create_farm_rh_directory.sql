-- Annuaire RH ferme (personnes + équipes) — sync multi-appareils comme farm_cost_settings

create table if not exists public.farm_rh_directory (
  id text primary key default 'default',
  directory jsonb not null default '{}'::jsonb,
  owner_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farm_rh_directory_updated_idx on public.farm_rh_directory (updated_at desc);

alter table public.farm_rh_directory enable row level security;

drop policy if exists farm_rh_directory_select on public.farm_rh_directory;
create policy farm_rh_directory_select on public.farm_rh_directory
  for select using (auth.role() = 'authenticated');

drop policy if exists farm_rh_directory_insert on public.farm_rh_directory;
create policy farm_rh_directory_insert on public.farm_rh_directory
  for insert with check (auth.role() = 'authenticated');

drop policy if exists farm_rh_directory_update on public.farm_rh_directory;
create policy farm_rh_directory_update on public.farm_rh_directory
  for update using (auth.role() = 'authenticated');
