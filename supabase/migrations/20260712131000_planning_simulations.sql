-- Scénarios versionnés d'Objectifs & Croissance.
create table if not exists public.planning_simulations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  scenario_key text not null,
  name text not null,
  version integer not null check (version > 0),
  assumptions jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'validated', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, scenario_key, version)
);

create index if not exists idx_planning_simulations_farm_id
  on public.planning_simulations(farm_id);
create index if not exists idx_planning_simulations_farm_key_version
  on public.planning_simulations(farm_id, scenario_key, version desc);

alter table public.planning_simulations enable row level security;

drop policy if exists planning_simulations_select_farm on public.planning_simulations;
create policy planning_simulations_select_farm on public.planning_simulations
  for select using (public.can_access_farm(farm_id));

drop policy if exists planning_simulations_insert_farm on public.planning_simulations;
create policy planning_simulations_insert_farm on public.planning_simulations
  for insert with check (public.can_access_farm(farm_id));

drop policy if exists planning_simulations_update_farm on public.planning_simulations;
create policy planning_simulations_update_farm on public.planning_simulations
  for update using (public.can_access_farm(farm_id))
  with check (public.can_access_farm(farm_id));

drop policy if exists planning_simulations_delete_farm on public.planning_simulations;
create policy planning_simulations_delete_farm on public.planning_simulations
  for delete using (false);
