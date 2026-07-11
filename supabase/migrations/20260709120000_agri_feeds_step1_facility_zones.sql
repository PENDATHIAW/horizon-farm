-- AGRI FEEDS étape 1 — zones site prévues (réservation Phase 1).
-- Tables production / formules / essais arriveront aux étapes 2–4.

create extension if not exists pgcrypto;

create table if not exists public.feed_facility_zones (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  name text not null,
  zone_type text not null check (zone_type in (
    'raw_material_storage',
    'production_area',
    'finished_goods_storage',
    'quality_control',
    'loading_area',
    'office_erp',
    'future_extension'
  )),
  status text not null default 'planned' check (status in ('planned', 'available', 'in_use')),
  capacity numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_facility_zones_farm on public.feed_facility_zones(farm_id);
create index if not exists idx_feed_facility_zones_type on public.feed_facility_zones(zone_type);

alter table public.feed_facility_zones enable row level security;

drop policy if exists feed_facility_zones_select on public.feed_facility_zones;
create policy feed_facility_zones_select on public.feed_facility_zones
  for select to authenticated
  using (true);

drop policy if exists feed_facility_zones_write on public.feed_facility_zones;
create policy feed_facility_zones_write on public.feed_facility_zones
  for all to authenticated
  using (true)
  with check (true);

comment on table public.feed_facility_zones is
  'Zones site AGRI FEEDS — prévues dès Phase 1, activées en Phase 2. Séparées animaux / fientes / fumiers / vétérinaire.';
