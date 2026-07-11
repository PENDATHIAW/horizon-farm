-- AGRI FEEDS étape 3 — ordres de fabrication, lots produits finis, QC production.

create extension if not exists pgcrypto;

create table if not exists public.feed_production_orders (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  order_code text not null,
  formula_version_id text references public.feed_formula_versions(id) on delete set null,
  planned_quantity numeric not null default 0,
  actual_quantity numeric,
  production_date date,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  machine_used text,
  responsible_person text,
  raw_material_batches_used jsonb not null default '[]'::jsonb,
  losses_quantity numeric not null default 0,
  losses_percentage numeric not null default 0,
  packaging_quantity numeric not null default 0,
  packaging_cost numeric not null default 0,
  real_cost_total numeric not null default 0,
  real_cost_per_kg numeric not null default 0,
  theoretical_cost_per_kg numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_production_orders_status on public.feed_production_orders(status);
create index if not exists idx_feed_production_orders_version on public.feed_production_orders(formula_version_id);

create table if not exists public.feed_finished_batches (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  batch_code text not null,
  production_order_id text references public.feed_production_orders(id) on delete set null,
  formula_version_id text references public.feed_formula_versions(id) on delete set null,
  stock_id text,
  production_date date,
  quantity_produced numeric not null default 0,
  quantity_available numeric not null default 0,
  package_size text not null default '25kg'
    check (package_size in ('bulk', '5kg', '10kg', '25kg', '50kg')),
  destination text not null default 'internal_test'
    check (destination in ('internal_test', 'internal_consumption', 'client_testing', 'commercial_sale')),
  storage_location text,
  qr_code_payload text,
  qr_code_url text,
  quality_status text not null default 'accepted',
  sample_reference text,
  unit_cost numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_finished_batches_order on public.feed_finished_batches(production_order_id);
create index if not exists idx_feed_finished_batches_code on public.feed_finished_batches(batch_code);
create index if not exists idx_feed_finished_batches_active on public.feed_finished_batches(active);

create table if not exists public.feed_quality_checks (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  related_type text not null
    check (related_type in ('raw_material_batch', 'production_order', 'finished_batch', 'customer_feedback')),
  related_id text not null,
  check_date date,
  check_type text,
  result text,
  status text,
  responsible_person text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_quality_checks_related on public.feed_quality_checks(related_type, related_id);

alter table public.feed_production_orders enable row level security;
alter table public.feed_finished_batches enable row level security;
alter table public.feed_quality_checks enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'feed_production_orders',
    'feed_finished_batches',
    'feed_quality_checks'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (true)',
      t, t
    );
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

comment on table public.feed_production_orders is 'AGRI FEEDS — ordres de fabrication';
comment on table public.feed_finished_batches is 'AGRI FEEDS — lots produits finis + QR';
comment on table public.feed_quality_checks is 'AGRI FEEDS — contrôles qualité liés';
