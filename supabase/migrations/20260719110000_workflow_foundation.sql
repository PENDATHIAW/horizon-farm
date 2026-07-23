begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.workflow_commands (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  workflow_type text not null check (workflow_type in (
    'feed_reception', 'feed_distribution', 'broiler_lot_start', 'mortality_record',
    'health_treatment', 'biosecurity_cleaning', 'egg_production', 'egg_sale',
    'broiler_sale', 'bovine_weighing', 'bovine_sale', 'crop_campaign_start',
    'irrigation_event', 'organic_transfer', 'crop_harvest', 'crop_sale',
    'customer_payment', 'supplier_payment', 'equipment_purchase',
    'equipment_maintenance', 'task_lifecycle', 'support_document',
    'monthly_financier_report', 'funding_usage', 'growth_objective', 'smartfarm_signal'
  )),
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  source text not null default 'web',
  idempotency_key text not null,
  risk_class text not null default 'C' check (risk_class in ('A', 'B', 'C', 'D')),
  status text not null default 'received' check (status in (
    'received', 'validated', 'executing', 'committed', 'completed',
    'rejected', 'cancelled', 'failed_retryable', 'failed'
  )),
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, workflow_type, idempotency_key)
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  command_id uuid not null references public.workflow_commands(id) on delete restrict,
  status text not null default 'received' check (status in (
    'received', 'validated', 'executing', 'committed', 'side_effects_pending',
    'completed', 'failed_retryable', 'retrying', 'dead_letter', 'rejected', 'cancelled', 'failed'
  )),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  started_at timestamptz,
  committed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,
  result_refs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (command_id)
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  run_id uuid not null references public.workflow_runs(id) on delete restrict,
  step_key text not null,
  status text not null default 'pending' check (status in ('pending', 'executing', 'completed', 'skipped', 'failed')),
  input_hash text,
  result_refs jsonb not null default '{}'::jsonb,
  duration_ms integer,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, step_key)
);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  run_id uuid not null references public.workflow_runs(id) on delete restrict,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'published', 'failed', 'dead_letter')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, topic)
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  key text not null,
  version integer not null default 1 check (version > 0),
  enabled boolean not null default true,
  trigger_config jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  approval_class text not null default 'C' check (approval_class in ('A', 'B', 'C', 'D')),
  owner_role text not null default 'promotrice_direction',
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, key, version)
);

create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  rule_id uuid references public.automation_rules(id) on delete set null,
  run_id uuid not null references public.workflow_runs(id) on delete restrict,
  outcome text not null,
  reason text,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (run_id, rule_id)
);

create index if not exists idx_workflow_commands_farm_status on public.workflow_commands(farm_id, status, received_at desc);
create index if not exists idx_workflow_runs_farm_status on public.workflow_runs(farm_id, status, updated_at desc);
create index if not exists idx_workflow_steps_run on public.workflow_steps(run_id, created_at);
create index if not exists idx_outbox_due on public.outbox_events(status, available_at) where status in ('pending', 'failed');
create index if not exists idx_automation_rules_active on public.automation_rules(farm_id, key, version desc) where enabled is true;

alter table public.workflow_commands enable row level security;
alter table public.workflow_commands force row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_runs force row level security;
alter table public.workflow_steps enable row level security;
alter table public.workflow_steps force row level security;
alter table public.outbox_events enable row level security;
alter table public.outbox_events force row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_rules force row level security;
alter table public.automation_executions enable row level security;
alter table public.automation_executions force row level security;

revoke all on public.workflow_commands, public.workflow_runs, public.workflow_steps,
  public.outbox_events, public.automation_rules, public.automation_executions from anon, authenticated;
grant select on public.workflow_commands, public.workflow_runs, public.workflow_steps,
  public.outbox_events, public.automation_rules, public.automation_executions to authenticated;
grant insert, update on public.automation_rules to authenticated;
grant all on public.workflow_commands, public.workflow_runs, public.workflow_steps,
  public.outbox_events, public.automation_rules, public.automation_executions to service_role;

create policy workflow_commands_read on public.workflow_commands
  for select to authenticated using (public.can_read_farm_table(farm_id, 'business_events'));
create policy workflow_runs_read on public.workflow_runs
  for select to authenticated using (public.can_read_farm_table(farm_id, 'business_events'));
create policy workflow_steps_read on public.workflow_steps
  for select to authenticated using (public.can_read_farm_table(farm_id, 'business_events'));
create policy outbox_events_read on public.outbox_events
  for select to authenticated using (
    public.can_access_farm(farm_id)
    and public.current_erp_role(farm_id) in ('promotrice_direction', 'admin_support')
  );
create policy automation_rules_read on public.automation_rules
  for select to authenticated using (public.can_read_farm_table(farm_id, 'business_events'));
create policy automation_rules_insert on public.automation_rules
  for insert to authenticated with check (
    public.can_access_farm(farm_id)
    and public.current_erp_role(farm_id) in ('promotrice_direction', 'admin_support')
  );
create policy automation_rules_update on public.automation_rules
  for update to authenticated using (
    public.can_access_farm(farm_id)
    and public.current_erp_role(farm_id) in ('promotrice_direction', 'admin_support')
  ) with check (
    public.can_access_farm(farm_id)
    and public.current_erp_role(farm_id) in ('promotrice_direction', 'admin_support')
  );
create policy automation_executions_read on public.automation_executions
  for select to authenticated using (public.can_read_farm_table(farm_id, 'business_events'));

create or replace function public.automation_rule_enabled(p_farm_id uuid, p_workflow_type text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_enabled boolean;
begin
  select enabled into v_enabled
  from public.automation_rules
  where farm_id = p_farm_id and key = 'global'
  order by version desc limit 1;
  if found and v_enabled is false then return false; end if;

  select enabled into v_enabled
  from public.automation_rules
  where farm_id = p_farm_id and key = p_workflow_type
  order by version desc limit 1;
  if found and v_enabled is false then return false; end if;
  return true;
end;
$$;

create or replace function public.submit_workflow_command(
  p_farm_id uuid,
  p_workflow_type text,
  p_payload jsonb,
  p_source text,
  p_idempotency_key text,
  p_risk_class text default 'C'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_command public.workflow_commands%rowtype;
  v_run public.workflow_runs%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.can_insert_farm_table(p_farm_id, 'business_events') then raise exception 'farm access denied'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'idempotency key required'; end if;
  if length(trim(p_idempotency_key)) > 180 then raise exception 'idempotency key too long'; end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then raise exception 'payload must be an object'; end if;
  if pg_column_size(coalesce(p_payload, '{}'::jsonb)) > 262144 then raise exception 'payload too large'; end if;
  if not public.automation_rule_enabled(p_farm_id, p_workflow_type) then raise exception 'automation paused'; end if;

  insert into public.workflow_commands (
    farm_id, workflow_type, payload, actor_id, source, idempotency_key, risk_class, status
  ) values (
    p_farm_id, p_workflow_type, coalesce(p_payload, '{}'::jsonb), auth.uid(),
    coalesce(nullif(trim(p_source), ''), 'web'), trim(p_idempotency_key), p_risk_class, 'received'
  ) on conflict (farm_id, workflow_type, idempotency_key) do nothing;

  select * into v_command from public.workflow_commands
  where farm_id = p_farm_id
    and workflow_type = p_workflow_type
    and idempotency_key = trim(p_idempotency_key);

  insert into public.workflow_runs (farm_id, command_id, status)
  values (p_farm_id, v_command.id, 'received')
  on conflict (command_id) do nothing;

  select * into v_run from public.workflow_runs where command_id = v_command.id;
  return jsonb_build_object(
    'ok', true,
    'command_id', v_command.id,
    'run_id', v_run.id,
    'status', v_run.status,
    'duplicate', v_command.received_at < now() - interval '1 millisecond'
  );
end;
$$;

create or replace function public.record_workflow_failure(
  p_farm_id uuid,
  p_workflow_type text,
  p_idempotency_key text,
  p_payload jsonb,
  p_actor_id uuid,
  p_source text,
  p_error_code text,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_command_id uuid;
  v_run_id uuid;
begin
  insert into public.workflow_commands (
    farm_id, workflow_type, payload, actor_id, source, idempotency_key, risk_class, status
  ) values (
    p_farm_id, p_workflow_type, coalesce(p_payload, '{}'::jsonb), p_actor_id,
    coalesce(nullif(p_source, ''), 'server'), p_idempotency_key, 'C', 'failed_retryable'
  ) on conflict (farm_id, workflow_type, idempotency_key) do update set
    status = case when workflow_commands.status in ('committed', 'completed') then workflow_commands.status else 'failed_retryable' end,
    updated_at = now()
  returning id into v_command_id;

  insert into public.workflow_runs (
    farm_id, command_id, status, attempt_count, started_at, failed_at,
    error_code, error_message, updated_at
  ) values (
    p_farm_id, v_command_id, 'failed_retryable', 1, now(), now(),
    left(coalesce(p_error_code, 'workflow_failed'), 120), left(coalesce(p_error_message, 'failure'), 1000), now()
  ) on conflict (command_id) do update set
    status = case when workflow_runs.status in ('committed', 'completed') then workflow_runs.status else 'failed_retryable' end,
    attempt_count = workflow_runs.attempt_count + 1,
    failed_at = now(),
    error_code = excluded.error_code,
    error_message = excluded.error_message,
    updated_at = now()
  returning id into v_run_id;

  return jsonb_build_object('ok', true, 'command_id', v_command_id, 'run_id', v_run_id);
end;
$$;

revoke all on function public.automation_rule_enabled(uuid, text) from public, anon;
grant execute on function public.automation_rule_enabled(uuid, text) to authenticated, service_role;
revoke all on function public.submit_workflow_command(uuid, text, jsonb, text, text, text) from public, anon;
grant execute on function public.submit_workflow_command(uuid, text, jsonb, text, text, text) to authenticated;
revoke all on function public.record_workflow_failure(uuid, text, text, jsonb, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_workflow_failure(uuid, text, text, jsonb, uuid, text, text, text) to service_role;

commit;
