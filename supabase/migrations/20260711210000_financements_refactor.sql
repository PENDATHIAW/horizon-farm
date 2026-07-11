-- FINANCEMENTS — refonte de l'ancien module Investisseurs & Forums.
-- Les anciennes tables restent migrées en lecture de compatibilité, mais le module actif
-- écrit/lit les entités métier ci-dessous.

create extension if not exists "pgcrypto";

create table if not exists public.funding_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  title text not null,
  institution text,
  opportunity_type text not null default 'subvention'
    check (opportunity_type in ('subvention', 'pret', 'concours', 'evenement', 'investisseur_prive', 'programme_accompagnement')),
  status text not null default 'identifiee'
    check (status in ('identifiee', 'a_qualifier', 'en_preparation', 'deposee', 'en_instruction', 'accordee', 'refusee', 'abandonnee')),
  amount_requested numeric not null default 0,
  deadline date,
  owner_label text,
  next_action text,
  next_action_at date,
  eligibility text,
  required_documents text[] not null default '{}',
  source text not null default 'financements',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funding_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  name text not null,
  organization text,
  role text,
  organization_type text not null default 'subvention',
  country text,
  email text,
  phone text,
  status text not null default 'prospect',
  last_exchange_at timestamptz,
  next_follow_up_at timestamptz,
  linked_opportunity_id uuid references public.funding_opportunities(id) on delete set null,
  consent_status text not null default 'non_precise',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funding_applications (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  opportunity_id uuid references public.funding_opportunities(id) on delete set null,
  title text not null,
  target_institution text,
  status text not null default 'draft',
  requested_amount numeric not null default 0,
  submitted_at date,
  decision_due_at date,
  required_documents text[] not null default '{}',
  ready_documents text[] not null default '{}',
  completion_rate integer not null default 0 check (completion_rate >= 0 and completion_rate <= 100),
  frozen_snapshot_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funding_document_library (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  application_id uuid references public.funding_applications(id) on delete set null,
  agreement_id uuid,
  title text not null,
  category text not null default 'piece_dossier',
  version_label text not null default 'v1',
  visibility text not null default 'internal' check (visibility in ('internal', 'restricted', 'shared', 'public')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'archived')),
  file_url text,
  erp_document_id text,
  source text not null default 'documents',
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funding_agreements (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  application_id uuid references public.funding_applications(id) on delete set null,
  title text not null,
  funder text,
  status text not null default 'signed',
  amount_granted numeric not null default 0,
  amount_received numeric not null default 0,
  amount_spent numeric not null default 0,
  signed_at date,
  reporting_due_at date,
  restrictions text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funding_expense_allocations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  agreement_id uuid not null references public.funding_agreements(id) on delete cascade,
  finance_transaction_id uuid,
  document_id uuid,
  amount numeric not null check (amount >= 0),
  category text,
  status text not null default 'allocated',
  allocated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funding_reports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  title text not null,
  period_label text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'archived')),
  visibility text not null default 'shared' check (visibility in ('internal', 'restricted', 'shared', 'public')),
  version_number integer not null default 1 check (version_number > 0),
  immutable boolean not null default true,
  source_snapshot_hash text not null,
  source_snapshot_generated_at timestamptz not null default now(),
  public_summary text,
  sections jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint funding_reports_immutable_published check (status <> 'published' or (immutable = true and source_snapshot_hash <> ''))
);

create table if not exists public.funding_project_journal (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  title text not null,
  summary text,
  event_date date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'shared' check (visibility in ('internal', 'restricted', 'shared', 'public')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funder_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  user_id uuid,
  email text,
  organization text,
  display_name text,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'revoked')),
  permissions text[] not null default array['*']::text[],
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funder_access_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  funder_account_id uuid references public.funder_accounts(id) on delete set null,
  user_id uuid,
  action text not null default 'read',
  resource_type text,
  resource_id uuid,
  status text not null default 'allowed' check (status in ('allowed', 'denied')),
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists funding_opportunities_owner_idx on public.funding_opportunities(owner_user_id, updated_at desc);
create index if not exists funding_contacts_owner_idx on public.funding_contacts(owner_user_id, updated_at desc);
create index if not exists funding_applications_owner_idx on public.funding_applications(owner_user_id, updated_at desc);
create index if not exists funding_documents_public_idx on public.funding_document_library(owner_user_id, visibility, status, published_at desc);
create index if not exists funding_agreements_owner_idx on public.funding_agreements(owner_user_id, updated_at desc);
create index if not exists funding_allocations_agreement_idx on public.funding_expense_allocations(agreement_id, allocated_at desc);
create index if not exists funding_reports_public_idx on public.funding_reports(owner_user_id, visibility, status, published_at desc);
create index if not exists funding_journal_public_idx on public.funding_project_journal(owner_user_id, visibility, status, event_date desc);
create index if not exists funder_accounts_user_idx on public.funder_accounts(user_id, status);
create index if not exists funder_access_logs_owner_idx on public.funder_access_logs(owner_user_id, created_at desc);

alter table public.funding_opportunities enable row level security;
alter table public.funding_contacts enable row level security;
alter table public.funding_applications enable row level security;
alter table public.funding_document_library enable row level security;
alter table public.funding_agreements enable row level security;
alter table public.funding_expense_allocations enable row level security;
alter table public.funding_reports enable row level security;
alter table public.funding_project_journal enable row level security;
alter table public.funder_accounts enable row level security;
alter table public.funder_access_logs enable row level security;

drop policy if exists funding_opportunities_internal_all on public.funding_opportunities;
create policy funding_opportunities_internal_all on public.funding_opportunities
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_contacts_internal_all on public.funding_contacts;
create policy funding_contacts_internal_all on public.funding_contacts
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_applications_internal_all on public.funding_applications;
create policy funding_applications_internal_all on public.funding_applications
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_agreements_internal_all on public.funding_agreements;
create policy funding_agreements_internal_all on public.funding_agreements
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_allocations_internal_all on public.funding_expense_allocations;
create policy funding_allocations_internal_all on public.funding_expense_allocations
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_documents_internal_all on public.funding_document_library;
create policy funding_documents_internal_all on public.funding_document_library
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_documents_funder_read on public.funding_document_library;
create policy funding_documents_funder_read on public.funding_document_library
  for select to authenticated
  using (
    status = 'published'
    and visibility in ('shared', 'public')
    and exists (
      select 1 from public.funder_accounts fa
      where fa.user_id = auth.uid()
        and fa.status = 'active'
        and (fa.expires_at is null or fa.expires_at > now())
        and fa.owner_user_id = funding_document_library.owner_user_id
    )
  );

drop policy if exists funding_reports_internal_all on public.funding_reports;
create policy funding_reports_internal_all on public.funding_reports
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_reports_funder_read on public.funding_reports;
create policy funding_reports_funder_read on public.funding_reports
  for select to authenticated
  using (
    status = 'published'
    and visibility in ('shared', 'public')
    and immutable = true
    and exists (
      select 1 from public.funder_accounts fa
      where fa.user_id = auth.uid()
        and fa.status = 'active'
        and (fa.expires_at is null or fa.expires_at > now())
        and fa.owner_user_id = funding_reports.owner_user_id
    )
  );

drop policy if exists funding_journal_internal_all on public.funding_project_journal;
create policy funding_journal_internal_all on public.funding_project_journal
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funding_journal_funder_read on public.funding_project_journal;
create policy funding_journal_funder_read on public.funding_project_journal
  for select to authenticated
  using (
    status = 'published'
    and visibility in ('shared', 'public')
    and exists (
      select 1 from public.funder_accounts fa
      where fa.user_id = auth.uid()
        and fa.status = 'active'
        and (fa.expires_at is null or fa.expires_at > now())
        and fa.owner_user_id = funding_project_journal.owner_user_id
    )
  );

drop policy if exists funder_accounts_internal_all on public.funder_accounts;
create policy funder_accounts_internal_all on public.funder_accounts
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid() and public.can_write_erp());

drop policy if exists funder_accounts_self_read on public.funder_accounts;
create policy funder_accounts_self_read on public.funder_accounts
  for select to authenticated
  using (user_id = auth.uid() and status = 'active' and (expires_at is null or expires_at > now()));

drop policy if exists funder_logs_internal_all on public.funder_access_logs;
create policy funder_logs_internal_all on public.funder_access_logs
  for all to authenticated
  using (owner_user_id = auth.uid() or public.can_admin_erp())
  with check (owner_user_id = auth.uid());

drop policy if exists funder_logs_self_insert on public.funder_access_logs;
create policy funder_logs_self_insert on public.funder_access_logs
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and action in ('read', 'download')
    and exists (
      select 1 from public.funder_accounts fa
      where fa.id = funder_access_logs.funder_account_id
        and fa.user_id = auth.uid()
        and fa.status = 'active'
        and (fa.expires_at is null or fa.expires_at > now())
    )
  );

do $$
begin
  if to_regclass('public.investor_forum_contacts') is not null then
    execute $sql$
      insert into public.funding_contacts (
        id, owner_user_id, name, organization, country, email, phone,
        organization_type, status, last_exchange_at, next_follow_up_at, metadata, created_at, updated_at
      )
      select
        id,
        owner_user_id,
        name,
        organization,
        country,
        email,
        phone,
        case
          when contact_type in ('forum', 'salon') then 'evenement'
          when contact_type = 'banque' then 'pret'
          when contact_type = 'investisseur' then 'investisseur_prive'
          when contact_type in ('ong', 'subvention') then 'subvention'
          else coalesce(nullif(contact_type, ''), 'subvention')
        end,
        case
          when status = 'en_discussion' then 'en_echange'
          when status = 'negociation' then 'en_echange'
          when status = 'accord' then 'partenaire'
          when status = 'refus' then 'inactif'
          else coalesce(nullif(status, ''), 'prospect')
        end,
        last_exchange_at,
        follow_up_at,
        jsonb_build_object(
          'legacy_table', 'investor_forum_contacts',
          'documents_sent', documents_sent,
          'notes_migrated_internal', notes is not null
        ),
        created_at,
        updated_at
      from public.investor_forum_contacts
      on conflict (id) do nothing
    $sql$;
  end if;

  if to_regclass('public.investor_forum_documents') is not null then
    execute $sql$
      insert into public.funding_document_library (
        id, owner_user_id, title, category, version_label, visibility, status,
        file_url, erp_document_id, source, metadata, created_at, updated_at
      )
      select
        id,
        owner_user_id,
        title,
        coalesce(nullif(category, ''), 'piece_dossier'),
        'v1',
        'internal',
        'draft',
        file_url,
        erp_document_id,
        'investor_forum_documents',
        jsonb_build_object('legacy_table', 'investor_forum_documents', 'filename', filename, 'notes_migrated_internal', notes is not null),
        created_at,
        created_at
      from public.investor_forum_documents
      on conflict (id) do nothing
    $sql$;
  end if;

  if to_regclass('public.investor_forum_exports') is not null then
    execute $sql$
      insert into public.funding_reports (
        id, owner_user_id, title, period_label, status, visibility, version_number,
        immutable, source_snapshot_hash, source_snapshot_generated_at, public_summary, sections, published_at, metadata, created_at
      )
      select
        id,
        owner_user_id,
        document_title,
        'Toutes les périodes',
        'published',
        'shared',
        1,
        true,
        'legacy-export-' || id::text,
        created_at,
        filename,
        jsonb_build_array(pack_type, audience_key),
        created_at,
        jsonb_build_object('legacy_table', 'investor_forum_exports', 'storage_ref', storage_ref, 'file_size_bytes', file_size_bytes),
        created_at
      from public.investor_forum_exports
      on conflict (id) do nothing
    $sql$;
  end if;

  if to_regclass('public.investor_forum_profiles') is not null then
    execute $sql$
      insert into public.funding_applications (
        owner_user_id, title, target_institution, status, frozen_snapshot_hash, metadata, created_at, updated_at
      )
      select
        owner_user_id,
        'Dossier financement principal',
        'Financeurs',
        case when dossier_status = 'pret' then 'ready' when dossier_status = 'en_cours' then 'in_progress' else 'draft' end,
        'legacy-profile-' || id::text,
        jsonb_build_object('legacy_table', 'investor_forum_profiles', 'manual_content', manual_content),
        created_at,
        updated_at
      from public.investor_forum_profiles p
      where not exists (
        select 1 from public.funding_applications fa
        where fa.owner_user_id = p.owner_user_id and fa.metadata->>'legacy_table' = 'investor_forum_profiles'
      )
    $sql$;
  end if;
end $$;
