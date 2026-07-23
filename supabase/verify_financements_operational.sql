with checks(name, ok) as (
  values
    (
      'allocation_transaction_text',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'funding_expense_allocations'
          and column_name = 'finance_transaction_id'
          and data_type = 'text'
      )
    ),
    (
      'allocation_document_text',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'funding_expense_allocations'
          and column_name = 'document_id'
          and data_type = 'text'
      )
    ),
    (
      'report_file_url',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'funding_reports'
          and column_name = 'file_url'
      )
    ),
    (
      'funder_invited_by_default',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'funder_accounts'
          and column_name = 'status'
          and column_default like '%invited%'
      )
    ),
    (
      'funding_amount_constraints_validated',
      (
        select count(*) = 3
        from pg_constraint
        where conname in (
          'funding_opportunities_amount_nonnegative',
          'funding_applications_amount_positive',
          'funding_agreements_amounts_coherent'
        )
          and convalidated
      )
    ),
    (
      'cross_farm_link_triggers',
      (
        select count(*) = 4
        from pg_trigger
        where tgname in (
          'funding_contacts_validate_links',
          'funding_applications_validate_links',
          'funding_documents_validate_links',
          'funding_agreements_validate_links'
        )
          and not tgisinternal
      )
    ),
    (
      'funder_identity_triggers',
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.funder_accounts'::regclass
          and tgname = 'funder_account_resolve_identity'
          and not tgisinternal
      )
      and exists (
        select 1 from pg_trigger
        where tgrelid = 'public.funder_accounts'::regclass
          and tgname = 'funder_account_sync_farm_access'
          and not tgisinternal
      )
    ),
    (
      'allocation_validation_trigger',
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.funding_expense_allocations'::regclass
          and tgname = 'funding_allocation_validate'
          and not tgisinternal
      )
    ),
    (
      'agreement_recompute_trigger',
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.funding_expense_allocations'::regclass
          and tgname = 'funding_allocation_recompute_agreement'
          and not tgisinternal
      )
    ),
    (
      'report_immutability_trigger',
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.funding_reports'::regclass
          and tgname = 'funding_report_protect_published'
          and not tgisinternal
      )
    ),
    (
      'document_immutability_trigger',
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.funding_document_library'::regclass
          and tgname = 'funding_document_protect_published'
          and not tgisinternal
      )
    ),
    (
      'funder_access_insert_policy',
      exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'funder_access_logs'
          and policyname = 'funder_access_logs_external_insert'
          and cmd = 'INSERT'
      )
    ),
    (
      'no_wildcard_permissions',
      not exists (
        select 1 from public.funder_accounts
        where is_deleted is false
          and '*' = any(permissions)
      )
    ),
    (
      'no_active_unlinked_funder',
      not exists (
        select 1 from public.funder_accounts account
        where account.is_deleted is false
          and account.status = 'active'
          and account.user_id is null
      )
    ),
    (
      'active_funder_has_farm_access',
      not exists (
        select 1
        from public.funder_accounts account
        where account.is_deleted is false
          and account.status = 'active'
          and account.user_id is not null
          and not exists (
            select 1
            from public.user_farm_access access
            where access.user_id = account.user_id
              and access.farm_id = account.farm_id
          )
      )
    ),
    (
      'agreement_spend_matches_allocations',
      not exists (
        select 1
        from public.funding_agreements agreement
        where agreement.is_deleted is false
          and agreement.amount_spent is distinct from (
            select coalesce(sum(allocation.amount), 0)
            from public.funding_expense_allocations allocation
            where allocation.agreement_id = agreement.id
              and allocation.is_deleted is false
          )
      )
    ),
    (
      'no_cross_farm_funding_links',
      not exists (
        select 1
        from public.funding_applications application
        join public.funding_opportunities opportunity on opportunity.id = application.opportunity_id
        where application.farm_id <> opportunity.farm_id
      )
      and not exists (
        select 1
        from public.funding_agreements agreement
        join public.funding_applications application on application.id = agreement.application_id
        where agreement.farm_id <> application.farm_id
      )
      and not exists (
        select 1
        from public.funding_document_library document
        join public.funding_applications application on application.id = document.application_id
        where document.farm_id <> application.farm_id
      )
    ),
    (
      'published_reports_are_shareable',
      not exists (
        select 1
        from public.funding_reports report
        where report.is_deleted is false
          and report.status = 'published'
          and (
            report.immutable is not true
            or coalesce(report.source_snapshot_hash, '') = ''
            or report.visibility not in ('shared', 'public')
          )
      )
    ),
    (
      'allocations_have_operational_evidence',
      not exists (
        select 1
        from public.funding_expense_allocations allocation
        left join public.funding_agreements agreement
          on agreement.id = allocation.agreement_id
          and agreement.farm_id = allocation.farm_id
          and agreement.is_deleted is false
        left join public.transactions transaction
          on transaction.id::text = allocation.finance_transaction_id
          and transaction.farm_id = allocation.farm_id
          and transaction.is_deleted is false
        left join public.documents document
          on document.id::text = allocation.document_id
          and document.farm_id = allocation.farm_id
          and document.is_deleted is false
        where allocation.is_deleted is false
          and (
            agreement.id is null
            or transaction.id is null
            or lower(coalesce(transaction.type, '')) not in ('sortie', 'depense', 'dépense', 'expense', 'debit', 'débit')
            or coalesce(to_jsonb(document)->>'file_url', to_jsonb(document)->>'url', '') = ''
          )
      )
    )
)
select name
from checks
where ok is not true
order by name;
