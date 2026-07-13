-- Flux d'evenements IoT requis par Smart Farm et la synchronisation Realtime.

create table if not exists public.smartfarm_events (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  device_id text,
  event_type text not null,
  event_value numeric,
  unit text,
  zone text,
  severity text not null default 'info',
  status text not null default 'new',
  message text,
  handled boolean not null default false,
  handled_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  event_date timestamptz not null default now(),
  recorded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_smartfarm_events_farm_created
  on public.smartfarm_events(farm_id, created_at desc);
create index if not exists idx_smartfarm_events_device_created
  on public.smartfarm_events(device_id, created_at desc);
create index if not exists idx_smartfarm_events_unhandled
  on public.smartfarm_events(handled, severity)
  where handled = false;

alter table public.smartfarm_events enable row level security;
drop policy if exists smartfarm_events_farm_read on public.smartfarm_events;
drop policy if exists smartfarm_events_farm_write on public.smartfarm_events;
create policy smartfarm_events_farm_read on public.smartfarm_events
  for select to authenticated
  using (farm_id is null or public.can_read_farm(farm_id));
create policy smartfarm_events_farm_write on public.smartfarm_events
  for all to authenticated
  using (farm_id is null or public.can_write_farm(farm_id))
  with check (farm_id is null or public.can_write_farm(farm_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'smartfarm_events'
  ) then
    alter publication supabase_realtime add table public.smartfarm_events;
  end if;
end
$$;
