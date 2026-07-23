begin;

-- Les anciens liens en attente ne sont pas des encaissements.
delete from public.payments
where id like 'PAY-MM-%'
  and (reference like 'WAVE-%' or reference like 'OM-%')
  and coalesce(notes, '') like '%"mobile_money_status":"pending"%';

alter table public.payments
  add column if not exists farm_id uuid references public.farms(id) on delete restrict,
  add column if not exists sale_id text,
  add column if not exists client_id text,
  add column if not exists source_record_id text,
  add column if not exists date date,
  add column if not exists montant_paye numeric,
  add column if not exists amount numeric,
  add column if not exists mode_paiement text,
  add column if not exists statut text default 'paye',
  add column if not exists status text default 'confirmed',
  add column if not exists provider text,
  add column if not exists provider_ref text,
  add column if not exists payment_intent_id text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists idempotency_key text,
  add column if not exists issue_key text,
  add column if not exists created_from text,
  add column if not exists side_effects_managed boolean not null default false;

alter table public.transactions
  add column if not exists farm_id uuid references public.farms(id) on delete restrict,
  add column if not exists order_id text,
  add column if not exists vente_id text,
  add column if not exists payment_id text,
  add column if not exists amount numeric,
  add column if not exists reste_a_payer numeric default 0,
  add column if not exists moyen_paiement text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists transaction_origin text,
  add column if not exists created_from text,
  add column if not exists side_effects_managed boolean not null default false,
  add column if not exists idempotency_key text,
  add column if not exists issue_key text;

alter table public.sales_orders
  add column if not exists payment_status text default 'non_paye',
  add column if not exists statut_relance text default 'a_relancer',
  add column if not exists relance_active boolean not null default false,
  add column if not exists creance numeric default 0;

alter table public.clients
  add column if not exists status text,
  add column if not exists total_ventes numeric default 0,
  add column if not exists total_paye numeric default 0,
  add column if not exists reste_a_payer numeric default 0,
  add column if not exists creance_reelle numeric default 0,
  add column if not exists dette numeric default 0,
  add column if not exists relance_requise boolean not null default false,
  add column if not exists statut_relance text default 'solde';

alter table public.invoices
  add column if not exists statut_paiement text default 'non_paye',
  add column if not exists payment_status text default 'non_paye',
  add column if not exists paid_at timestamptz;

create table if not exists public.payment_intents (
  id text primary key,
  farm_id uuid not null references public.farms(id) on delete restrict,
  order_id text not null,
  client_id text,
  provider text not null check (provider in ('wave', 'orange_money')),
  provider_ref text not null,
  external_id text,
  amount numeric not null check (amount > 0),
  currency text not null default 'XOF',
  status text not null default 'pending'
    check (status in ('created', 'pending', 'confirmed', 'posted', 'failed', 'expired', 'cancelled')),
  payment_id text not null,
  payment_url text,
  client_phone text,
  sandbox boolean not null default false,
  provider_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  confirmed_at timestamptz,
  posted_at timestamptz,
  failed_at timestamptz,
  signature_verified_at timestamptz,
  created_by uuid,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, provider, provider_ref)
);

create index if not exists idx_payment_intents_order
  on public.payment_intents(farm_id, order_id, status)
  where is_deleted is false;
create index if not exists idx_payment_intents_provider_ref
  on public.payment_intents(provider_ref)
  where is_deleted is false;
with ranked_open_intents as (
  select id, row_number() over (
    partition by farm_id, order_id
    order by created_at desc, id desc
  ) as position
  from public.payment_intents
  where status in ('created', 'pending') and is_deleted is false
)
update public.payment_intents intent
set status = 'cancelled',
    updated_at = now()
from ranked_open_intents ranked
where intent.id = ranked.id and ranked.position > 1;
create unique index if not exists idx_payment_intents_one_open_order
  on public.payment_intents(farm_id, order_id)
  where status in ('created', 'pending') and is_deleted is false;
create unique index if not exists idx_payments_provider_ref_unique
  on public.payments(farm_id, provider_ref)
  where provider_ref is not null and provider_ref <> '' and is_deleted is false;
create index if not exists idx_transactions_payment_id
  on public.transactions(farm_id, payment_id)
  where payment_id is not null and payment_id <> '' and is_deleted is false;

alter table public.payment_intents enable row level security;
alter table public.payment_intents force row level security;
revoke all on table public.payment_intents from anon, authenticated;
grant all on table public.payment_intents to service_role;

create or replace function public.finalize_mobile_money_payment(
  p_provider_ref text,
  p_provider_payload jsonb default '{}'::jsonb,
  p_signature_verified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_order public.sales_orders%rowtype;
  v_amount numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_exists boolean := false;
  v_payment_order_id text;
  v_payment_amount numeric;
  v_payment_ref text;
  v_transaction_id text;
  v_movement_id text;
  v_inserted_movement_id text;
  v_account_id text;
  v_account_label text;
  v_account_provider text;
  v_method text;
  v_command_id uuid;
  v_run_id uuid;
  v_source text;
  v_client_total numeric := 0;
  v_client_paid numeric := 0;
  v_client_remaining numeric := 0;
  v_now timestamptz := now();
begin
  if nullif(trim(p_provider_ref), '') is null then
    raise exception 'payment reference required';
  end if;

  select * into v_intent
  from public.payment_intents
  where provider_ref = trim(p_provider_ref)
    and is_deleted is false
  for update;

  if not found then raise exception 'payment intent not found'; end if;

  v_transaction_id := 'TRX-PAY-' || v_intent.payment_id;
  v_movement_id := 'MVT-' || v_intent.payment_id;
  v_source := case when p_signature_verified then 'provider_webhook' else 'test_confirmation' end;

  if v_intent.status <> 'posted'
    and not public.automation_rule_enabled(v_intent.farm_id, 'customer_payment') then
    raise exception 'payment processing paused';
  end if;

  insert into public.workflow_commands (
    farm_id, workflow_type, payload, actor_id, source, idempotency_key, risk_class, status
  ) values (
    v_intent.farm_id, 'customer_payment',
    jsonb_build_object(
      'payment_intent_id', v_intent.id,
      'provider', v_intent.provider,
      'provider_ref', v_intent.provider_ref,
      'order_id', v_intent.order_id,
      'amount', v_intent.amount,
      'signature_verified', p_signature_verified
    ),
    v_intent.created_by, v_source, 'mobile_money:' || v_intent.provider_ref, 'C',
    case when v_intent.status = 'posted' then 'completed' else 'executing' end
  ) on conflict (farm_id, workflow_type, idempotency_key) do update set
    payload = excluded.payload,
    actor_id = coalesce(workflow_commands.actor_id, excluded.actor_id),
    source = excluded.source,
    status = case
      when workflow_commands.status = 'completed' then workflow_commands.status
      else excluded.status
    end,
    updated_at = v_now
  returning id into v_command_id;

  insert into public.workflow_runs (
    farm_id, command_id, status, attempt_count, started_at, completed_at, result_refs, updated_at
  ) values (
    v_intent.farm_id, v_command_id,
    case when v_intent.status = 'posted' then 'completed' else 'executing' end,
    1, v_now, case when v_intent.status = 'posted' then v_now else null end,
    case when v_intent.status = 'posted'
      then jsonb_build_object('payment_id', v_intent.payment_id, 'order_id', v_intent.order_id)
      else '{}'::jsonb
    end,
    v_now
  ) on conflict (command_id) do update set
    status = case
      when workflow_runs.status = 'completed' then workflow_runs.status
      else excluded.status
    end,
    attempt_count = case
      when workflow_runs.status = 'completed' then workflow_runs.attempt_count
      else workflow_runs.attempt_count + 1
    end,
    started_at = coalesce(workflow_runs.started_at, excluded.started_at),
    completed_at = case
      when workflow_runs.status = 'completed' then workflow_runs.completed_at
      else excluded.completed_at
    end,
    result_refs = case
      when workflow_runs.status = 'completed' then workflow_runs.result_refs
      else excluded.result_refs
    end,
    error_code = null,
    error_message = null,
    failed_at = null,
    updated_at = v_now
  returning id into v_run_id;

  if v_intent.status = 'posted' then
    return jsonb_build_object(
      'ok', true,
      'already_posted', true,
      'workflow_run_id', v_run_id,
      'payment_id', v_intent.payment_id,
      'transaction_id', v_transaction_id,
      'treasury_movement_id', v_movement_id,
      'confirmed_at', v_intent.confirmed_at
    );
  end if;

  if v_intent.status in ('failed', 'expired', 'cancelled') and not p_signature_verified then
    raise exception 'payment intent cannot be finalized';
  end if;
  if v_intent.expires_at is not null
    and v_intent.expires_at < v_now
    and v_intent.sandbox is false
    and not p_signature_verified then
    raise exception 'payment intent expired';
  end if;

  select * into v_order
  from public.sales_orders
  where id = v_intent.order_id
    and farm_id = v_intent.farm_id
    and is_deleted is false
  for update;

  if not found then raise exception 'sales order not found'; end if;
  if lower(coalesce(v_order.statut_commande, '')) in ('annule', 'annulée', 'annulee') then
    raise exception 'sales order cancelled';
  end if;

  v_amount := round(v_intent.amount);
  if v_amount <= 0 then raise exception 'invalid payment amount'; end if;

  select exists(
    select 1 from public.payments
    where id = v_intent.payment_id and is_deleted is false
  ) into v_payment_exists;

  if v_payment_exists then
    select order_id, coalesce(montant_paye, montant, amount, 0), provider_ref
      into v_payment_order_id, v_payment_amount, v_payment_ref
    from public.payments
    where id = v_intent.payment_id and is_deleted is false;
    if v_payment_order_id is distinct from v_intent.order_id
      or abs(coalesce(v_payment_amount, 0) - v_amount) > 0.5
      or (nullif(v_payment_ref, '') is not null and v_payment_ref is distinct from v_intent.provider_ref) then
      raise exception 'payment identifier conflict';
    end if;
  end if;

  select greatest(
    coalesce(v_order.montant_paye, 0),
    coalesce(sum(coalesce(montant_paye, montant, amount, 0)), 0)
  ) into v_paid
  from public.payments
  where order_id = v_order.id
    and farm_id = v_order.farm_id
    and is_deleted is false
    and lower(coalesce(status, statut, 'confirmed')) not in (
      'pending', 'failed', 'cancelled', 'canceled', 'annule', 'annulé', 'rejete', 'rejeté', 'refunded', 'rembourse', 'remboursé'
    );

  v_remaining := greatest(0, coalesce(v_order.montant_total, 0) - coalesce(v_paid, 0));
  if not v_payment_exists and v_amount > v_remaining + 0.5 then
    raise exception 'payment exceeds remaining amount';
  end if;

  v_method := case when v_intent.provider = 'wave' then 'wave' else 'orange_money' end;

  insert into public.payments (
    id, farm_id, order_id, sale_id, client_id, source_record_id,
    date_paiement, date, montant, montant_paye, amount,
    moyen_paiement, mode_paiement, reference, provider, provider_ref,
    payment_intent_id, statut, status, confirmed_at, notes,
    idempotency_key, issue_key, created_from, side_effects_managed,
    owner_user_id, created_at, updated_at, is_deleted
  ) values (
    v_intent.payment_id, v_intent.farm_id, v_intent.order_id, v_intent.order_id,
    v_intent.client_id, v_intent.order_id,
    v_now::date, v_now::date, v_amount, v_amount, v_amount,
    v_method, v_method, v_intent.provider_ref, v_intent.provider, v_intent.provider_ref,
    v_intent.id, 'paye', 'confirmed', v_now,
    jsonb_build_object('provider_payload', coalesce(p_provider_payload, '{}'::jsonb))::text,
    'mobile_money:' || v_intent.provider_ref, 'mobile_money:' || v_intent.provider_ref,
    'mobile_money_confirmation', true,
    v_intent.created_by, v_now, v_now, false
  ) on conflict (id) do nothing;

  insert into public.transactions (
    id, farm_id, type, libelle, montant, amount, date, categorie, paiement,
    module_lie, related_id, vente_id, client_id, statut, order_id, payment_id,
    moyen_paiement, source_module, source_record_id, transaction_origin,
    created_from, side_effects_managed, idempotency_key, issue_key,
    owner_user_id, created_at, updated_at, is_deleted
  ) values (
    v_transaction_id, v_intent.farm_id, 'entree',
    'Encaissement ' || v_intent.order_id, v_amount::bigint, v_amount, v_now::date,
    'Vente', v_method, 'ventes', v_intent.order_id, v_intent.order_id, v_intent.client_id,
    'paye', v_intent.order_id, v_intent.payment_id, v_method,
    'ventes', v_intent.order_id, 'automatique', 'mobile_money_confirmation', true,
    'mobile_money:' || v_intent.provider_ref, 'mobile_money:' || v_intent.provider_ref,
    v_intent.created_by, v_now, v_now, false
  ) on conflict (id) do nothing;

  v_account_provider := case when v_intent.provider = 'wave' then 'wave' else 'orange money' end;
  v_account_label := case when v_intent.provider = 'wave' then 'Wave' else 'Orange Money' end;

  select id into v_account_id
  from public.treasury_accounts
  where farm_id = v_intent.farm_id
    and is_deleted is false
    and status = 'actif'
    and lower(coalesce(provider, '')) = v_account_provider
  order by created_at asc
  limit 1
  for update;

  if v_account_id is null then
    v_account_id := 'TRES-MM-' || substr(md5(v_intent.farm_id::text || ':' || v_intent.provider), 1, 20);
    insert into public.treasury_accounts (
      id, farm_id, label, type, provider, solde_initial, solde_actuel,
      currency, status, owner_user_id, created_at, updated_at, is_deleted
    ) values (
      v_account_id, v_intent.farm_id, v_account_label, 'mobile_money', v_account_label,
      0, 0, 'FCFA', 'actif', v_intent.created_by, v_now, v_now, false
    ) on conflict (id) do nothing;
  end if;

  insert into public.treasury_movements (
    id, farm_id, account_id, transaction_id, date, type, amount, label,
    status, owner_user_id, created_at, updated_at, is_deleted
  ) values (
    v_movement_id, v_intent.farm_id, v_account_id, v_transaction_id,
    v_now::date, 'entree', v_amount, 'Encaissement ' || v_intent.order_id,
    'valide', v_intent.created_by, v_now, v_now, false
  ) on conflict (id) do nothing
  returning id into v_inserted_movement_id;

  if v_inserted_movement_id is not null then
    update public.treasury_accounts
    set solde_actuel = coalesce(solde_actuel, 0) + v_amount,
        updated_at = v_now
    where id = v_account_id and farm_id = v_intent.farm_id;
  end if;

  update public.transactions
  set treasury_account_id = v_account_id,
      updated_at = v_now
  where id = v_transaction_id and farm_id = v_intent.farm_id;

  if not v_payment_exists then
    v_paid := least(coalesce(v_order.montant_total, 0), coalesce(v_paid, 0) + v_amount);
  else
    select greatest(
      coalesce(v_order.montant_paye, 0),
      coalesce(sum(coalesce(montant_paye, montant, amount, 0)), 0)
    ) into v_paid
    from public.payments
    where order_id = v_order.id
      and farm_id = v_order.farm_id
      and is_deleted is false
      and lower(coalesce(status, statut, 'confirmed')) not in (
        'pending', 'failed', 'cancelled', 'canceled', 'annule', 'annulé', 'rejete', 'rejeté', 'refunded', 'rembourse', 'remboursé'
      );
    v_paid := least(coalesce(v_order.montant_total, 0), coalesce(v_paid, 0));
  end if;
  v_remaining := greatest(0, coalesce(v_order.montant_total, 0) - v_paid);

  update public.sales_orders
  set montant_paye = v_paid,
      reste_a_payer = v_remaining,
      statut_paiement = case when v_remaining <= 0.5 then 'paye' else 'partiel' end,
      payment_status = case when v_remaining <= 0.5 then 'paye' else 'partiel' end,
      statut_relance = case when v_remaining <= 0.5 then 'solde' else 'a_relancer' end,
      relance_active = v_remaining > 0.5,
      creance = v_remaining,
      statut_commande = case
        when lower(coalesce(statut_commande, '')) in ('livree', 'livrée', 'livree_partielle') then statut_commande
        else 'confirme'
      end,
      moyen_paiement = v_method,
      updated_at = v_now
  where id = v_order.id and farm_id = v_order.farm_id;

  update public.transactions
  set statut = case when v_remaining <= 0.5 then 'paye' else 'partiel' end,
      reste_a_payer = v_remaining,
      updated_at = v_now
  where farm_id = v_intent.farm_id
    and is_deleted is false
    and (
      id = 'TRX-CREANCE-' || v_intent.order_id
      or (
        coalesce(order_id, vente_id, related_id, source_record_id) = v_intent.order_id
        and lower(coalesce(categorie, '') || ' ' || coalesce(libelle, '')) like '%cr%ance%'
      )
    );

  update public.client_receivables
  set initial_amount = greatest(coalesce(initial_amount, 0), coalesce(v_order.montant_total, 0)),
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      status = case when v_remaining <= 0.5 then 'soldee' else 'ouverte' end,
      updated_at = v_now
  where farm_id = v_intent.farm_id
    and sale_order_id = v_intent.order_id
    and is_deleted is false;

  update public.invoices
  set statut_paiement = case when v_remaining <= 0.5 then 'paye' else 'partiel' end,
      payment_status = case when v_remaining <= 0.5 then 'paye' else 'partiel' end,
      paid_at = case when v_remaining <= 0.5 then coalesce(paid_at, v_now) else paid_at end,
      updated_at = v_now
  where farm_id = v_intent.farm_id
    and order_id = v_intent.order_id
    and is_deleted is false;

  if nullif(v_intent.client_id, '') is not null then
    select
      coalesce(sum(coalesce(montant_total, 0)), 0),
      coalesce(sum(least(coalesce(montant_total, 0), coalesce(montant_paye, 0))), 0)
    into v_client_total, v_client_paid
    from public.sales_orders
    where farm_id = v_intent.farm_id
      and client_id = v_intent.client_id
      and is_deleted is false
      and lower(coalesce(statut_commande, '')) not in ('annule', 'annulée', 'annulee', 'cancelled', 'canceled');

    v_client_remaining := greatest(0, v_client_total - v_client_paid);

    update public.clients
    set totalachats = v_client_total,
        total_ventes = v_client_total,
        total_paye = v_client_paid,
        reste_a_payer = v_client_remaining,
        creance_reelle = v_client_remaining,
        dette = v_client_remaining,
        statut = case when v_client_remaining > 0.5 then 'a_relancer' else 'a_jour' end,
        status = case when v_client_remaining > 0.5 then 'a_relancer' else 'a_jour' end,
        relance_requise = v_client_remaining > 0.5,
        statut_relance = case when v_client_remaining > 0.5 then 'a_relancer' else 'solde' end,
        updated_at = v_now
    where id = v_intent.client_id
      and farm_id = v_intent.farm_id
      and is_deleted is false;
  end if;

  if v_remaining <= 0.5 then
    update public.tasks
    set status = 'termine',
        completed_at = coalesce(completed_at, v_now),
        updated_at = v_now
    where farm_id = v_intent.farm_id
      and is_deleted is false
      and lower(coalesce(status, 'a_faire')) not in ('termine', 'terminé', 'done', 'closed', 'annule', 'annulé')
      and coalesce(related_id, source_record_id, related_record_id) = v_intent.order_id
      and lower(concat_ws(' ', title, notes, task_dedupe_key, action_key)) ~ 'relanc|encaisser|cr[ée]ance|paiement';

    update public.alertes_center
    set status = 'resolue',
        treated_at = coalesce(treated_at, v_now),
        updated_at = v_now
    where farm_id = v_intent.farm_id
      and is_deleted is false
      and lower(coalesce(status, 'nouvelle')) not in ('traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed')
      and (
        id = 'ALT-CREANCE-' || v_intent.order_id
        or (
          coalesce(entity_id, source_record_id, related_record_id) = v_intent.order_id
          and lower(concat_ws(' ', title, message, alert_dedupe_key)) ~ 'relanc|encaisser|cr[ée]ance|paiement'
        )
      );
  end if;

  if nullif(v_intent.client_id, '') is not null and v_client_remaining <= 0.5 then
    update public.tasks
    set status = 'termine',
        completed_at = coalesce(completed_at, v_now),
        updated_at = v_now
    where farm_id = v_intent.farm_id
      and is_deleted is false
      and lower(coalesce(status, 'a_faire')) not in ('termine', 'terminé', 'done', 'closed', 'annule', 'annulé')
      and coalesce(related_id, source_record_id, related_record_id) = v_intent.client_id
      and lower(concat_ws(' ', title, notes, task_dedupe_key, action_key)) ~ 'relanc|encaisser|cr[ée]ance|paiement';

    update public.alertes_center
    set status = 'resolue',
        treated_at = coalesce(treated_at, v_now),
        updated_at = v_now
    where farm_id = v_intent.farm_id
      and is_deleted is false
      and lower(coalesce(status, 'nouvelle')) not in ('traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed')
      and coalesce(entity_id, source_record_id, related_record_id) = v_intent.client_id
      and lower(concat_ws(' ', title, message, alert_dedupe_key)) ~ 'relanc|encaisser|cr[ée]ance|paiement';
  end if;

  insert into public.business_events (
    id, farm_id, event_type, module_source, entity_type, entity_id,
    title, description, amount, event_date, linked_transaction_id, linked_sale_id,
    severity, owner_user_id, issue_key, source_module, source_record_id,
    related_module, related_record_id, workflow_id, origin_type,
    created_at, updated_at, is_deleted
  ) values (
    'EVT-' || v_intent.payment_id, v_intent.farm_id, 'customer_payment', 'ventes',
    'paiement', v_intent.payment_id, 'Paiement client enregistré',
    'Vente ' || v_intent.order_id || ' encaissée par ' || v_account_label,
    v_amount, v_now, v_transaction_id, v_intent.order_id,
    'info', v_intent.created_by, 'mobile_money:' || v_intent.provider_ref,
    'ventes', v_intent.order_id, 'finances', v_transaction_id,
    v_run_id::text, v_source, v_now, v_now, false
  ) on conflict (id) do nothing;

  update public.payment_intents
  set status = 'posted',
      provider_payload = coalesce(p_provider_payload, '{}'::jsonb),
      signature_verified_at = case
        when p_signature_verified then coalesce(signature_verified_at, v_now)
        else signature_verified_at
      end,
      confirmed_at = coalesce(confirmed_at, v_now),
      posted_at = v_now,
      updated_at = v_now
  where id = v_intent.id;

  insert into public.workflow_steps (
    farm_id, run_id, step_key, status, result_refs, duration_ms,
    started_at, completed_at, created_at, updated_at
  ) values
    (v_intent.farm_id, v_run_id, 'payment_saved', 'completed', jsonb_build_object('payment_id', v_intent.payment_id), 0, v_now, v_now, v_now, v_now),
    (v_intent.farm_id, v_run_id, 'finance_saved', 'completed', jsonb_build_object('transaction_id', v_transaction_id), 0, v_now, v_now, v_now, v_now),
    (v_intent.farm_id, v_run_id, 'account_updated', 'completed', jsonb_build_object('account_id', v_account_id, 'movement_id', v_movement_id), 0, v_now, v_now, v_now, v_now),
    (v_intent.farm_id, v_run_id, 'sale_updated', 'completed', jsonb_build_object('order_id', v_intent.order_id, 'remaining', v_remaining), 0, v_now, v_now, v_now, v_now),
    (v_intent.farm_id, v_run_id, 'follow_up_updated', 'completed', jsonb_build_object('client_id', v_intent.client_id, 'client_remaining', v_client_remaining), 0, v_now, v_now, v_now, v_now)
  on conflict (run_id, step_key) do update set
    status = 'completed',
    result_refs = excluded.result_refs,
    duration_ms = excluded.duration_ms,
    completed_at = excluded.completed_at,
    error_code = null,
    error_message = null,
    updated_at = excluded.updated_at;

  update public.workflow_commands
  set status = 'completed', updated_at = v_now
  where id = v_command_id;

  update public.workflow_runs
  set status = 'completed',
      committed_at = v_now,
      completed_at = v_now,
      error_code = null,
      error_message = null,
      result_refs = jsonb_build_object(
        'payment_id', v_intent.payment_id,
        'transaction_id', v_transaction_id,
        'treasury_movement_id', v_movement_id,
        'order_id', v_intent.order_id,
        'remaining', v_remaining
      ),
      updated_at = v_now
  where id = v_run_id;

  return jsonb_build_object(
    'ok', true,
    'already_posted', false,
    'workflow_run_id', v_run_id,
    'payment_id', v_intent.payment_id,
    'transaction_id', v_transaction_id,
    'treasury_movement_id', v_movement_id,
    'confirmed_at', v_now,
    'amount', v_amount,
    'remaining', v_remaining
  );
end;
$$;

revoke all on function public.finalize_mobile_money_payment(text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.finalize_mobile_money_payment(text, jsonb, boolean) to service_role;

commit;
