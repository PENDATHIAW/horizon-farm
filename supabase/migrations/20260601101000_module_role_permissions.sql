-- Module role permissions for RBAC (P10)

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
as $$
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
$$;
