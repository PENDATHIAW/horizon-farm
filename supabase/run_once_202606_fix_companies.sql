-- Correctif si erreur "relation public.companies does not exist"
-- Exécuter ce fichier puis relancer run_once_202606_tables_only.sql
-- (ou seulement la fin si colonnes push déjà créées)

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
