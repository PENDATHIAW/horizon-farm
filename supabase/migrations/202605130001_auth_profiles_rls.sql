-- Horizon Farm SaaS auth foundation
-- Passwords are managed by Supabase Auth only. This table stores business profile, role and permissions.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Horizon Farm',
  slug text unique,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'visiteur' check (role in ('admin','manager','employe','veterinaire','comptable','visiteur')),
  status text not null default 'pending' check (status in ('active','pending','invited','suspended','disabled')),
  company_id uuid references public.companies(id) on delete set null,
  permissions jsonb not null default '{}'::jsonb,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_profiles_role on public.profiles(role);

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'visiteur');
$$;

create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select (select company_id from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() = 'admin';
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('admin','manager','employe','veterinaire','comptable');
$$;

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
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'visiteur'),
    coalesce(nullif(new.raw_user_meta_data->>'status',''), 'pending'),
    nullif(new.raw_user_meta_data->>'company_id','')::uuid,
    '{}'::jsonb
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;

drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all on public.companies
  for all to authenticated
  using (public.is_admin() or id = public.current_company_id())
  with check (public.is_admin() or id = public.current_company_id());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Generic helpers for business tables. Apply these policies manually to tables that contain company_id.
-- Example:
-- alter table public.animaux enable row level security;
-- create policy animaux_company_read on public.animaux for select to authenticated using (public.is_admin() or company_id = public.current_company_id());
-- create policy animaux_company_write on public.animaux for all to authenticated using (public.is_staff() and (public.is_admin() or company_id = public.current_company_id())) with check (public.is_staff() and (public.is_admin() or company_id = public.current_company_id()));

comment on table public.profiles is 'Business profile for Supabase Auth users. Passwords are never stored here.';
