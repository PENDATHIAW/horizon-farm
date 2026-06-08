-- Phase 2 — Fondations Multi-Fermes Horizon Farm
-- companies = tenant SaaS ; farms = sites opérationnels
-- farm_id nullable sur tables P0 uniquement ; backfill prudent ; pas de NOT NULL

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Table farms
-- ---------------------------------------------------------------------------
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  legal_name text,
  legal_entity_type text,
  registration_number text,
  location text,
  region text,
  country text not null default 'SN',
  latitude numeric,
  longitude numeric,
  activity_type text[] not null default array['mixte']::text[],
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  is_default boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farms_company_id on public.farms(company_id);
create index if not exists idx_farms_owner_user_id on public.farms(owner_user_id);
create unique index if not exists idx_farms_one_default_per_company
  on public.farms(company_id)
  where is_default = true;

-- ---------------------------------------------------------------------------
-- Table user_farm_access
-- ---------------------------------------------------------------------------
create table if not exists public.user_farm_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  access_role text not null default 'farm_agent' check (access_role in (
    'super_admin',
    'direction',
    'farm_manager',
    'farm_accountant',
    'farm_agent',
    'farm_commercial',
    'farm_stock_manager',
    'farm_veterinary',
    'farm_readonly'
  )),
  modules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_farm_access_unique unique (user_id, farm_id)
);

create index if not exists idx_user_farm_access_user on public.user_farm_access(user_id);
create index if not exists idx_user_farm_access_farm on public.user_farm_access(farm_id);

-- ---------------------------------------------------------------------------
-- Helpers RLS multi-fermes (ne remplacent pas owner_user_id)
-- ---------------------------------------------------------------------------
create or replace function public.can_access_farm(target_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when target_farm_id is null then false
    when public.current_profile_role() in ('admin', 'manager') then exists (
      select 1
      from public.farms f
      join public.profiles p on p.id = auth.uid()
      where f.id = target_farm_id
        and (f.company_id = p.company_id or p.company_id is null)
    )
    else exists (
      select 1
      from public.user_farm_access ufa
      where ufa.user_id = auth.uid()
        and ufa.farm_id = target_farm_id
    )
    or exists (
      select 1
      from public.farms f
      where f.id = target_farm_id
        and f.owner_user_id = auth.uid()
    )
  end;
$$;

create or replace function public.can_read_farm(target_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_read_erp() and public.can_access_farm(target_farm_id);
$$;

create or replace function public.can_write_farm(target_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_write_erp()
    and public.can_access_farm(target_farm_id)
    and (
      public.current_profile_role() in ('admin', 'manager')
      or not exists (
        select 1
        from public.user_farm_access ufa
        where ufa.user_id = auth.uid()
          and ufa.farm_id = target_farm_id
          and ufa.access_role = 'farm_readonly'
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- farm_id nullable — tables critiques P0 uniquement
-- ---------------------------------------------------------------------------
alter table if exists public.animals add column if not exists farm_id uuid references public.farms(id) on delete set null;
alter table if exists public.lots add column if not exists farm_id uuid references public.farms(id) on delete set null;
alter table if exists public.stocks add column if not exists farm_id uuid references public.farms(id) on delete set null;
alter table if exists public.sales_orders add column if not exists farm_id uuid references public.farms(id) on delete set null;
alter table if exists public.finances add column if not exists farm_id uuid references public.farms(id) on delete set null;
alter table if exists public.cultures add column if not exists farm_id uuid references public.farms(id) on delete set null;
alter table if exists public.business_events add column if not exists farm_id uuid references public.farms(id) on delete set null;

create index if not exists idx_animals_farm_id on public.animals(farm_id);
create index if not exists idx_lots_farm_id on public.lots(farm_id);
create index if not exists idx_stocks_farm_id on public.stocks(farm_id);
create index if not exists idx_sales_orders_farm_id on public.sales_orders(farm_id);
create index if not exists idx_finances_farm_id on public.finances(farm_id);
create index if not exists idx_cultures_farm_id on public.cultures(farm_id);
create index if not exists idx_business_events_farm_id on public.business_events(farm_id);

-- ---------------------------------------------------------------------------
-- RLS farms + user_farm_access
-- ---------------------------------------------------------------------------
alter table public.farms enable row level security;
alter table public.user_farm_access enable row level security;

drop policy if exists farms_select on public.farms;
create policy farms_select on public.farms
  for select to authenticated
  using (
    public.can_read_erp()
    and (
      public.can_admin_erp()
      or public.can_access_farm(id)
      or company_id = public.current_company_id()
    )
  );

drop policy if exists farms_insert on public.farms;
create policy farms_insert on public.farms
  for insert to authenticated
  with check (
    public.can_write_erp()
    and (public.can_admin_erp() or company_id = public.current_company_id())
  );

drop policy if exists farms_update on public.farms;
create policy farms_update on public.farms
  for update to authenticated
  using (public.can_write_erp() and public.can_access_farm(id))
  with check (public.can_write_erp() and public.can_access_farm(id));

drop policy if exists user_farm_access_select on public.user_farm_access;
create policy user_farm_access_select on public.user_farm_access
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_admin_erp()
    or public.can_access_farm(farm_id)
  );

drop policy if exists user_farm_access_write on public.user_farm_access;
create policy user_farm_access_write on public.user_farm_access
  for all to authenticated
  using (public.can_admin_erp())
  with check (public.can_admin_erp());

-- ---------------------------------------------------------------------------
-- Ferme par défaut « Horizon Farm » par company + accès utilisateurs
-- ---------------------------------------------------------------------------
insert into public.companies (id, name, slug, status)
select
  'a0000000-0000-4000-8000-000000000010'::uuid,
  'Horizon Farm',
  'horizon-farm',
  'active'
where not exists (
  select 1 from public.companies where slug = 'horizon-farm' or name = 'Horizon Farm'
);

insert into public.farms (
  id,
  company_id,
  name,
  legal_name,
  country,
  activity_type,
  status,
  is_default,
  settings
)
select
  'a0000000-0000-4000-8000-000000000001'::uuid,
  c.id,
  'Horizon Farm',
  'Horizon Farm',
  'SN',
  array['mixte']::text[],
  'active',
  true,
  '{}'::jsonb
from public.companies c
where c.slug = 'horizon-farm' or c.name = 'Horizon Farm'
on conflict (id) do nothing;

-- Si aucune ferme default pour une company, en créer une
insert into public.farms (company_id, name, country, activity_type, status, is_default, settings)
select c.id, 'Horizon Farm', coalesce(c.name, 'SN'), array['mixte']::text[], 'active', true, '{}'::jsonb
from public.companies c
where not exists (
  select 1 from public.farms f where f.company_id = c.id and f.is_default = true
);

-- Accès direction/admin sur la ferme default
insert into public.user_farm_access (user_id, farm_id, access_role, modules)
select
  p.id,
  f.id,
  case when p.role = 'admin' then 'super_admin' else 'direction' end,
  '{}'::jsonb
from public.profiles p
join public.farms f on f.company_id = p.company_id and f.is_default = true
where p.role in ('admin', 'manager', 'comptable', 'employe', 'veterinaire')
on conflict (user_id, farm_id) do nothing;

-- ---------------------------------------------------------------------------
-- Backfill prudent — rattacher les lignes existantes à la ferme default
-- ---------------------------------------------------------------------------
do $$
declare
  default_farm_id uuid;
begin
  select f.id into default_farm_id
  from public.farms f
  where f.is_default = true
  order by f.created_at asc
  limit 1;

  if default_farm_id is null then
    return;
  end if;

  update public.animals set farm_id = default_farm_id where farm_id is null;
  update public.lots set farm_id = default_farm_id where farm_id is null;
  update public.stocks set farm_id = default_farm_id where farm_id is null;
  update public.sales_orders set farm_id = default_farm_id where farm_id is null;
  update public.finances set farm_id = default_farm_id where farm_id is null;
  update public.cultures set farm_id = default_farm_id where farm_id is null;
  update public.business_events set farm_id = default_farm_id where farm_id is null;
end $$;
