begin;

alter table public.funding_expense_allocations
  alter column finance_transaction_id type text using finance_transaction_id::text,
  alter column document_id type text using document_id::text;

alter table public.funding_reports
  alter column visibility set default 'internal',
  add column if not exists file_url text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.funder_accounts
  alter column permissions set default array['overview', 'reports', 'project_journal', 'shared_documents']::text[],
  alter column status set default 'invited';

update public.funder_accounts
set permissions = array['overview', 'reports', 'project_journal', 'shared_documents']::text[]
where permissions is null
  or cardinality(permissions) = 0
  or '*' = any(permissions);

update public.funding_document_library document
set agreement_id = null
where agreement_id is not null
  and not exists (
    select 1
    from public.funding_agreements agreement
    where agreement.id = document.agreement_id
      and agreement.farm_id = document.farm_id
  );

update public.funding_contacts contact
set linked_opportunity_id = null
where linked_opportunity_id is not null
  and not exists (
    select 1 from public.funding_opportunities opportunity
    where opportunity.id = contact.linked_opportunity_id
      and opportunity.farm_id = contact.farm_id
  );

update public.funding_applications application
set opportunity_id = null
where opportunity_id is not null
  and not exists (
    select 1 from public.funding_opportunities opportunity
    where opportunity.id = application.opportunity_id
      and opportunity.farm_id = application.farm_id
  );

update public.funding_document_library document
set application_id = null
where application_id is not null
  and not exists (
    select 1 from public.funding_applications application
    where application.id = document.application_id
      and application.farm_id = document.farm_id
  );

update public.funding_agreements agreement
set application_id = null
where application_id is not null
  and not exists (
    select 1 from public.funding_applications application
    where application.id = agreement.application_id
      and application.farm_id = agreement.farm_id
  );

alter table public.funding_document_library
  drop constraint if exists funding_document_library_agreement_id_fkey;

alter table public.funding_document_library
  add constraint funding_document_library_agreement_id_fkey
  foreign key (agreement_id) references public.funding_agreements(id) on delete set null;

create index if not exists funding_allocations_transaction_idx
  on public.funding_expense_allocations(farm_id, finance_transaction_id)
  where is_deleted is false;

create index if not exists funding_accounts_email_idx
  on public.funder_accounts(farm_id, lower(email))
  where is_deleted is false;

alter table public.funding_opportunities
  drop constraint if exists funding_opportunities_amount_nonnegative;
alter table public.funding_opportunities
  add constraint funding_opportunities_amount_nonnegative
  check (amount_requested >= 0) not valid;

alter table public.funding_applications
  drop constraint if exists funding_applications_amount_positive;
alter table public.funding_applications
  add constraint funding_applications_amount_positive
  check (requested_amount >= 0) not valid;

alter table public.funding_agreements
  drop constraint if exists funding_agreements_amounts_coherent;
alter table public.funding_agreements
  add constraint funding_agreements_amounts_coherent
  check (
    amount_granted >= 0
    and amount_received >= 0
    and amount_spent >= 0
    and amount_received <= amount_granted
  ) not valid;

update public.funding_opportunities
set amount_requested = greatest(amount_requested, 0)
where amount_requested < 0;

update public.funding_applications
set requested_amount = greatest(requested_amount, 0)
where requested_amount < 0;

update public.funding_agreements
set amount_granted = greatest(amount_granted, amount_received, 0),
    amount_received = greatest(amount_received, 0),
    amount_spent = greatest(amount_spent, 0)
where amount_granted < 0
   or amount_received < 0
   or amount_spent < 0
   or amount_received > amount_granted;

alter table public.funding_opportunities
  validate constraint funding_opportunities_amount_nonnegative;
alter table public.funding_applications
  validate constraint funding_applications_amount_positive;
alter table public.funding_agreements
  validate constraint funding_agreements_amounts_coherent;

create or replace function public.validate_funding_record_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_data jsonb := to_jsonb(new);
  opportunity_id uuid := nullif(record_data->>'opportunity_id', '')::uuid;
  linked_opportunity_id uuid := nullif(record_data->>'linked_opportunity_id', '')::uuid;
  application_id uuid := nullif(record_data->>'application_id', '')::uuid;
  agreement_id uuid := nullif(record_data->>'agreement_id', '')::uuid;
begin
  if coalesce((record_data->>'is_deleted')::boolean, false) is true then
    return new;
  end if;

  if opportunity_id is not null and not exists (
    select 1 from public.funding_opportunities opportunity
    where opportunity.id = opportunity_id
      and opportunity.farm_id = new.farm_id
  ) then
    raise exception 'L’opportunité liée doit appartenir à la ferme active.';
  end if;

  if linked_opportunity_id is not null and not exists (
    select 1 from public.funding_opportunities opportunity
    where opportunity.id = linked_opportunity_id
      and opportunity.farm_id = new.farm_id
  ) then
    raise exception 'L’opportunité liée doit appartenir à la ferme active.';
  end if;

  if application_id is not null and not exists (
    select 1 from public.funding_applications application
    where application.id = application_id
      and application.farm_id = new.farm_id
  ) then
    raise exception 'Le dossier lié doit appartenir à la ferme active.';
  end if;

  if agreement_id is not null and not exists (
    select 1 from public.funding_agreements agreement
    where agreement.id = agreement_id
      and agreement.farm_id = new.farm_id
  ) then
    raise exception 'La convention liée doit appartenir à la ferme active.';
  end if;

  return new;
end;
$$;

drop trigger if exists funding_contacts_validate_links on public.funding_contacts;
create trigger funding_contacts_validate_links
before insert or update on public.funding_contacts
for each row execute function public.validate_funding_record_links();

drop trigger if exists funding_applications_validate_links on public.funding_applications;
create trigger funding_applications_validate_links
before insert or update on public.funding_applications
for each row execute function public.validate_funding_record_links();

drop trigger if exists funding_documents_validate_links on public.funding_document_library;
create trigger funding_documents_validate_links
before insert or update on public.funding_document_library
for each row execute function public.validate_funding_record_links();

drop trigger if exists funding_agreements_validate_links on public.funding_agreements;
create trigger funding_agreements_validate_links
before insert or update on public.funding_agreements
for each row execute function public.validate_funding_record_links();

create or replace function public.resolve_funder_account_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.permissions is null
    or cardinality(new.permissions) = 0
    or '*' = any(new.permissions)
  then
    new.permissions := array['overview', 'reports', 'project_journal', 'shared_documents']::text[];
  else
    new.permissions := array(
      select distinct btrim(permission)
      from unnest(new.permissions) permission
      where coalesce(btrim(permission), '') <> ''
    );
  end if;

  if new.user_id is null and coalesce(btrim(new.email), '') <> '' then
    select auth_user.id
    into new.user_id
    from auth.users auth_user
    where lower(auth_user.email) = lower(btrim(new.email))
    order by auth_user.created_at
    limit 1;

    if new.user_id is not null and new.status = 'invited' then
      new.status := 'active';
    end if;
  end if;
  if new.user_id is null and new.status = 'active' then
    new.status := 'invited';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_funder_account_farm_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_user_id uuid;
  previous_farm_id uuid;
begin
  if tg_op = 'UPDATE' then
    previous_user_id := old.user_id;
    previous_farm_id := old.farm_id;
  end if;

  if new.status = 'active' and new.is_deleted is false and new.user_id is not null then
    insert into public.user_farm_access (user_id, farm_id, access_role, modules)
    values (
      new.user_id,
      new.farm_id,
      'financeur_externe',
      jsonb_build_object('financements', true)
    )
    on conflict (user_id, farm_id) do update
    set access_role = case
          when public.user_farm_access.access_role = 'financeur_externe'
            then 'financeur_externe'
          else public.user_farm_access.access_role
        end,
        modules = coalesce(public.user_farm_access.modules, '{}'::jsonb)
          || jsonb_build_object('financements', true),
        updated_at = now();

    update public.profiles profile
    set role = case
          when public.canonical_erp_role(profile.role) in ('visiteur', 'financeur_externe')
            then 'financeur_externe'
          else profile.role
        end,
        status = case
          when public.canonical_erp_role(profile.role) in ('visiteur', 'financeur_externe')
            then 'active'
          else profile.status
        end,
        updated_at = now()
    where profile.id = new.user_id;
  end if;

  if previous_user_id is not null
    and (
      previous_user_id is distinct from new.user_id
      or previous_farm_id is distinct from new.farm_id
      or new.status <> 'active'
      or new.is_deleted is true
    )
    and not exists (
      select 1
      from public.funder_accounts account
      where account.user_id = previous_user_id
        and account.farm_id = previous_farm_id
        and account.status = 'active'
        and account.is_deleted is false
    )
  then
    delete from public.user_farm_access access
    where access.user_id = previous_user_id
      and access.farm_id = previous_farm_id
      and access.access_role = 'financeur_externe';
  end if;

  return new;
end;
$$;

drop trigger if exists funder_account_resolve_identity on public.funder_accounts;
create trigger funder_account_resolve_identity
before insert or update on public.funder_accounts
for each row execute function public.resolve_funder_account_identity();

drop trigger if exists funder_account_sync_farm_access on public.funder_accounts;
create trigger funder_account_sync_farm_access
after insert or update on public.funder_accounts
for each row execute function public.sync_funder_account_farm_access();

create or replace function public.claim_funder_invitations_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.funder_accounts account
  set user_id = new.id,
      status = case when account.status = 'invited' then 'active' else account.status end,
      updated_at = now()
  where account.user_id is null
    and account.is_deleted is false
    and coalesce(btrim(account.email), '') <> ''
    and lower(account.email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists zz_on_auth_user_created_funder_access on auth.users;
create trigger zz_on_auth_user_created_funder_access
after insert on auth.users
for each row execute function public.claim_funder_invitations_for_new_user();

update public.funder_accounts
set updated_at = now()
where is_deleted is false
  and (
    user_id is not null
    or coalesce(btrim(email), '') <> ''
  );

create or replace function public.validate_funding_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  agreement_row public.funding_agreements%rowtype;
  transaction_row public.transactions%rowtype;
  transaction_amount numeric := 0;
  agreement_allocated numeric := 0;
  transaction_allocated numeric := 0;
begin
  if new.is_deleted is true then
    new.updated_at := now();
    return new;
  end if;
  if new.amount is null or new.amount <= 0 then
    raise exception 'Le montant affecté doit être supérieur à zéro.';
  end if;
  if new.finance_transaction_id is null or btrim(new.finance_transaction_id) = '' then
    raise exception 'Une dépense Finance est obligatoire.';
  end if;
  if new.document_id is null or btrim(new.document_id) = '' then
    raise exception 'Un justificatif est obligatoire.';
  end if;

  select *
  into agreement_row
  from public.funding_agreements
  where id = new.agreement_id
    and farm_id = new.farm_id
    and is_deleted is false;

  if agreement_row.id is null then
    raise exception 'La convention est introuvable pour cette ferme.';
  end if;

  select *
  into transaction_row
  from public.transactions
  where id::text = new.finance_transaction_id
    and farm_id = new.farm_id
    and is_deleted is false;

  if transaction_row.id is null then
    raise exception 'La dépense Finance est introuvable pour cette ferme.';
  end if;
  if lower(coalesce(transaction_row.type, '')) not in ('sortie', 'depense', 'dépense', 'expense', 'debit', 'débit') then
    raise exception 'La transaction choisie n’est pas une dépense.';
  end if;

  transaction_amount := abs(coalesce(transaction_row.montant, transaction_row.amount, 0));
  if new.amount > transaction_amount then
    raise exception 'Le montant affecté dépasse la dépense.';
  end if;

  if not exists (
    select 1
    from public.documents document
    where document.id::text = new.document_id
      and document.farm_id = new.farm_id
      and document.is_deleted is false
      and coalesce(to_jsonb(document)->>'file_url', to_jsonb(document)->>'url', '') <> ''
  ) then
    raise exception 'Le justificatif doit contenir un fichier et appartenir à la ferme active.';
  end if;

  select coalesce(sum(allocation.amount), 0)
  into agreement_allocated
  from public.funding_expense_allocations allocation
  where allocation.agreement_id = new.agreement_id
    and allocation.is_deleted is false
    and allocation.id <> coalesce(new.id, gen_random_uuid());

  if agreement_allocated + new.amount > agreement_row.amount_received then
    raise exception 'Le total affecté dépasse les fonds réellement reçus.';
  end if;

  select coalesce(sum(allocation.amount), 0)
  into transaction_allocated
  from public.funding_expense_allocations allocation
  where allocation.farm_id = new.farm_id
    and allocation.finance_transaction_id = new.finance_transaction_id
    and allocation.is_deleted is false
    and allocation.id <> coalesce(new.id, gen_random_uuid());

  if transaction_allocated + new.amount > transaction_amount then
    raise exception 'Cette dépense est déjà affectée en totalité.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists funding_allocation_validate on public.funding_expense_allocations;
create trigger funding_allocation_validate
before insert or update on public.funding_expense_allocations
for each row execute function public.validate_funding_allocation();

create or replace function public.recompute_funding_agreement_spent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if tg_op = 'DELETE' then
    target_id := old.agreement_id;
  else
    target_id := new.agreement_id;
  end if;

  update public.funding_agreements agreement
  set amount_spent = (
        select coalesce(sum(allocation.amount), 0)
        from public.funding_expense_allocations allocation
        where allocation.agreement_id = target_id
          and allocation.is_deleted is false
      ),
      updated_at = now()
  where agreement.id = target_id;

  if tg_op = 'UPDATE' and old.agreement_id is distinct from new.agreement_id then
    update public.funding_agreements agreement
    set amount_spent = (
          select coalesce(sum(allocation.amount), 0)
          from public.funding_expense_allocations allocation
          where allocation.agreement_id = old.agreement_id
            and allocation.is_deleted is false
        ),
        updated_at = now()
    where agreement.id = old.agreement_id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists funding_allocation_recompute_agreement on public.funding_expense_allocations;
create trigger funding_allocation_recompute_agreement
after insert or update or delete on public.funding_expense_allocations
for each row execute function public.recompute_funding_agreement_spent();

update public.funding_agreements agreement
set amount_spent = (
      select coalesce(sum(allocation.amount), 0)
      from public.funding_expense_allocations allocation
      where allocation.agreement_id = agreement.id
        and allocation.is_deleted is false
    ),
    updated_at = now()
where agreement.is_deleted is false;

create or replace function public.protect_published_funding_report()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.status not in ('published', 'archived') then
      raise exception 'Un rapport publié ne peut pas redevenir un brouillon.';
    end if;
    if (
      to_jsonb(new) - array['status', 'visibility', 'updated_at', 'is_deleted', 'deleted_at', 'deleted_by']
    ) is distinct from (
      to_jsonb(old) - array['status', 'visibility', 'updated_at', 'is_deleted', 'deleted_at', 'deleted_by']
    ) then
      raise exception 'Le contenu d’un rapport publié est figé. Créez une nouvelle version.';
    end if;
  end if;

  if new.status = 'published' then
    if new.immutable is not true or coalesce(new.source_snapshot_hash, '') = '' then
      raise exception 'Le rapport doit être figé avant publication.';
    end if;
    if new.visibility not in ('shared', 'public') then
      raise exception 'La publication nécessite un partage explicite.';
    end if;
    if jsonb_array_length(coalesce(new.sections, '[]'::jsonb)) = 0
      and coalesce(new.public_summary, '') = '' then
      raise exception 'Le rapport ne contient aucune information partageable.';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists funding_report_protect_published on public.funding_reports;
create trigger funding_report_protect_published
before insert or update on public.funding_reports
for each row execute function public.protect_published_funding_report();

create or replace function public.protect_published_funding_document()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.status not in ('published', 'archived') then
      raise exception 'Une pièce publiée ne peut pas redevenir un brouillon.';
    end if;
    if new.title is distinct from old.title
      or new.file_url is distinct from old.file_url
      or new.erp_document_id is distinct from old.erp_document_id
      or new.version_label is distinct from old.version_label then
      raise exception 'Une pièce publiée est figée. Créez une nouvelle version.';
    end if;
  end if;

  if new.status = 'published' and new.visibility in ('shared', 'public') then
    if coalesce(new.file_url, '') = '' and coalesce(new.erp_document_id, '') = '' then
      raise exception 'Une pièce publiée doit contenir un fichier.';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists funding_document_protect_published on public.funding_document_library;
create trigger funding_document_protect_published
before insert or update on public.funding_document_library
for each row execute function public.protect_published_funding_document();

create or replace function public.can_read_funder_record(target_farm_id uuid, target_table text, record jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  account_row public.funder_accounts%rowtype;
  section_name text;
  resource_id text := coalesce(record->>'id', '');
  resource_category text := coalesce(record->>'category', '');
begin
  if coalesce((record->>'is_deleted')::boolean, false) is true then
    return false;
  end if;
  if not public.can_access_farm(target_farm_id)
    or public.current_erp_role(target_farm_id) <> 'financeur_externe' then
    return false;
  end if;

  if target_table = 'funder_accounts' then
    return record->>'user_id' = auth.uid()::text
      and record->>'status' = 'active'
      and (nullif(record->>'expires_at', '') is null or (record->>'expires_at')::timestamptz > now());
  end if;
  if target_table = 'funder_access_logs' then
    return record->>'user_id' = auth.uid()::text;
  end if;
  if target_table not in ('funding_document_library', 'funding_reports', 'funding_project_journal') then
    return false;
  end if;
  if record->>'status' <> 'published'
    or record->>'visibility' not in ('shared', 'public') then
    return false;
  end if;
  if target_table = 'funding_reports' and coalesce((record->>'immutable')::boolean, false) is not true then
    return false;
  end if;

  select account.*
  into account_row
  from public.funder_accounts account
  where account.user_id = auth.uid()
    and account.farm_id = target_farm_id
    and account.status = 'active'
    and account.is_deleted is false
    and (account.expires_at is null or account.expires_at > now())
  order by account.created_at desc
  limit 1;

  if account_row.id is null or account_row.permissions is null or cardinality(account_row.permissions) = 0 then
    return false;
  end if;

  section_name := case target_table
    when 'funding_reports' then 'reports'
    when 'funding_document_library' then 'shared_documents'
    when 'funding_project_journal' then 'project_journal'
    else ''
  end;

  return section_name = any(account_row.permissions)
    or resource_id = any(account_row.permissions)
    or (resource_category <> '' and resource_category = any(account_row.permissions));
end;
$$;

drop policy if exists funder_access_logs_external_insert on public.funder_access_logs;
create policy funder_access_logs_external_insert
on public.funder_access_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and is_deleted is false
  and action in ('read', 'download')
  and status in ('allowed', 'denied')
  and exists (
    select 1
    from public.funder_accounts account
    where account.id = funder_account_id
      and account.user_id = auth.uid()
      and account.farm_id = funder_access_logs.farm_id
      and account.status = 'active'
      and account.is_deleted is false
      and (account.expires_at is null or account.expires_at > now())
  )
);

grant execute on function public.can_read_funder_record(uuid, text, jsonb) to authenticated;

commit;
