create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'owner',
  label text default 'Appareil Horizon Farm',
  channels text[] default array['urgence', 'critique'],
  endpoint text unique not null,
  subscription jsonb not null,
  active boolean default true,
  last_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_active on public.push_subscriptions(active);

alter table public.push_subscriptions enable row level security;

create policy if not exists "push_subscriptions_select_authenticated"
  on public.push_subscriptions
  for select
  to authenticated
  using (true);

create policy if not exists "push_subscriptions_insert_authenticated"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (true);

create policy if not exists "push_subscriptions_update_authenticated"
  on public.push_subscriptions
  for update
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_push_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.set_push_subscriptions_updated_at();
