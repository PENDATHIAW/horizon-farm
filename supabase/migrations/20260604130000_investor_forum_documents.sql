-- Bibliothèque de fichiers du dossier investisseur / forum

create table if not exists public.investor_forum_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  category text not null default 'autre',
  title text not null,
  filename text,
  file_url text,
  erp_document_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists investor_forum_documents_owner_idx
  on public.investor_forum_documents (owner_user_id, created_at desc);

create index if not exists investor_forum_documents_category_idx
  on public.investor_forum_documents (category);

alter table public.investor_forum_documents enable row level security;

drop policy if exists investor_forum_documents_select on public.investor_forum_documents;
create policy investor_forum_documents_select on public.investor_forum_documents
  for select to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp());

drop policy if exists investor_forum_documents_insert on public.investor_forum_documents;
create policy investor_forum_documents_insert on public.investor_forum_documents
  for insert to authenticated
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_documents_update on public.investor_forum_documents;
create policy investor_forum_documents_update on public.investor_forum_documents
  for update to authenticated
  using (owner_user_id = auth.uid() and public.can_write_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists investor_forum_documents_delete on public.investor_forum_documents;
create policy investor_forum_documents_delete on public.investor_forum_documents
  for delete to authenticated
  using (owner_user_id = auth.uid() and public.can_write_erp());
