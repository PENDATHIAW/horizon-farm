create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'owner',
  label text default 'Appareil Horizon Farm',
  channels text[] default array['urgence', 'critique'],
  endpoint text unique,
  subscription jsonb,
  active boolean default true,
  last_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.push_subscriptions add column if not exists user_id text default 'owner';
alter table public.push_subscriptions add column if not exists label text default 'Appareil Horizon Farm';
alter table public.push_subscriptions add column if not exists channels text[] default array['urgence', 'critique'];
alter table public.push_subscriptions add column if not exists endpoint text;
alter table public.push_subscriptions add column if not exists subscription jsonb;
alter table public.push_subscriptions add column if not exists active boolean default true;
alter table public.push_subscriptions add column if not exists last_sent_at timestamptz;
alter table public.push_subscriptions add column if not exists created_at timestamptz default now();
alter table public.push_subscriptions add column if not exists updated_at timestamptz default now();

update public.push_subscriptions set active = true where active is null;
update public.push_subscriptions set user_id = 'owner' where user_id is null;
update public.push_subscriptions set label = 'Appareil Horizon Farm' where label is null;
update public.push_subscriptions set channels = array['urgence', 'critique'] where channels is null;

create unique index if not exists idx_push_subscriptions_endpoint_unique on public.push_subscriptions(endpoint) where endpoint is not null;
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_active on public.push_subscriptions(active);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_authenticated" on public.push_subscriptions;
create policy "push_subscriptions_select_authenticated"
  on public.push_subscriptions
  for select
  to authenticated
  using (true);

drop policy if exists "push_subscriptions_insert_authenticated" on public.push_subscriptions;
create policy "push_subscriptions_insert_authenticated"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (true);

drop policy if exists "push_subscriptions_update_authenticated" on public.push_subscriptions;
create policy "push_subscriptions_update_authenticated"
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
