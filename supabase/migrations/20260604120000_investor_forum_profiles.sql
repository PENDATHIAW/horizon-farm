-- Investisseurs & Forums — profils manuels et historique exports

create extension if not exists "pgcrypto";

create table if not exists public.investor_forum_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  manual_content jsonb not null default '{}'::jsonb,
  dossier_status text not null default 'brouillon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investor_forum_profiles_owner_unique unique (owner_user_id)
);

create index if not exists investor_forum_profiles_owner_idx
  on public.investor_forum_profiles (owner_user_id);

create table if not exists public.investor_forum_exports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  pack_type text not null,
  audience_key text not null default 'investisseur_prive',
  document_title text not null,
  filename text not null,
  storage_ref text,
  file_size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists investor_forum_exports_owner_idx
  on public.investor_forum_exports (owner_user_id, created_at desc);

alter table public.investor_forum_profiles enable row level security;
alter table public.investor_forum_exports enable row level security;

drop policy if exists investor_forum_profiles_select on public.investor_forum_profiles;
create policy investor_forum_profiles_select on public.investor_forum_profiles
  for select to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp());

drop policy if exists investor_forum_profiles_insert on public.investor_forum_profiles;
create policy investor_forum_profiles_insert on public.investor_forum_profiles
  for insert to authenticated
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_profiles_update on public.investor_forum_profiles;
create policy investor_forum_profiles_update on public.investor_forum_profiles
  for update to authenticated
  using (owner_user_id = auth.uid() and public.can_write_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_exports_select on public.investor_forum_exports;
create policy investor_forum_exports_select on public.investor_forum_exports
  for select to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp());

drop policy if exists investor_forum_exports_insert on public.investor_forum_exports;
create policy investor_forum_exports_insert on public.investor_forum_exports
  for insert to authenticated
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_exports_delete on public.investor_forum_exports;
create policy investor_forum_exports_delete on public.investor_forum_exports
  for delete to authenticated
  using (owner_user_id = auth.uid() and public.can_write_erp());
