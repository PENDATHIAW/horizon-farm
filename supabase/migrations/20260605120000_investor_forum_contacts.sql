-- CRM Investisseurs & Forums (Investor Room)

create table if not exists public.investor_forum_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  name text not null,
  organization text,
  country text,
  email text,
  phone text,
  contact_type text not null default 'investisseur',
  potential_amount numeric,
  status text not null default 'prospect',
  last_exchange_at timestamptz,
  follow_up_at timestamptz,
  notes text,
  documents_sent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investor_forum_contacts_owner_idx
  on public.investor_forum_contacts (owner_user_id, updated_at desc);

alter table public.investor_forum_contacts enable row level security;

drop policy if exists investor_forum_contacts_select on public.investor_forum_contacts;
create policy investor_forum_contacts_select on public.investor_forum_contacts
  for select to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp());

drop policy if exists investor_forum_contacts_insert on public.investor_forum_contacts;
create policy investor_forum_contacts_insert on public.investor_forum_contacts
  for insert to authenticated
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_contacts_update on public.investor_forum_contacts;
create policy investor_forum_contacts_update on public.investor_forum_contacts
  for update to authenticated
  using (owner_user_id = auth.uid() and public.can_write_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_contacts_delete on public.investor_forum_contacts;
create policy investor_forum_contacts_delete on public.investor_forum_contacts
  for delete to authenticated
  using (owner_user_id = auth.uid() and public.can_write_erp());
