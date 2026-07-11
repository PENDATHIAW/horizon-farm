-- AGRI FEEDS étape 2 — matières premières, lots réception, formulations, coûts.
-- Enrichit fournisseurs / alimentation_logs sans tables parallèles clients/ventes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- feed_raw_materials
-- ---------------------------------------------------------------------------
create table if not exists public.feed_raw_materials (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  name text not null,
  category text not null default 'other',
  unit text not null default 'kg',
  standard_moisture_threshold numeric,
  storage_requirements text,
  is_experimental boolean not null default false,
  nutritional_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_raw_materials_farm on public.feed_raw_materials(farm_id);
create index if not exists idx_feed_raw_materials_category on public.feed_raw_materials(category);

-- ---------------------------------------------------------------------------
-- feed_raw_batches
-- ---------------------------------------------------------------------------
create table if not exists public.feed_raw_batches (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  raw_material_id text references public.feed_raw_materials(id) on delete set null,
  supplier_id text,
  purchase_id text,
  stock_id text,
  batch_code text not null,
  received_date date,
  quantity_received numeric not null default 0,
  quantity_available numeric not null default 0,
  unit_cost numeric not null default 0,
  total_cost numeric not null default 0,
  quality_status text not null default 'under_review'
    check (quality_status in ('accepted', 'rejected', 'under_review')),
  moisture_value numeric,
  visual_check text,
  smell_check text,
  insect_check text,
  impurity_check text,
  storage_location text,
  expiry_internal_date date,
  sample_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_raw_batches_material on public.feed_raw_batches(raw_material_id);
create index if not exists idx_feed_raw_batches_supplier on public.feed_raw_batches(supplier_id);
create index if not exists idx_feed_raw_batches_quality on public.feed_raw_batches(quality_status);

-- ---------------------------------------------------------------------------
-- feed_formulas
-- ---------------------------------------------------------------------------
create table if not exists public.feed_formulas (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  formula_code text not null,
  name text not null,
  target_species text not null default 'other',
  target_stage text,
  objective text,
  status text not null default 'draft'
    check (status in (
      'draft', 'internal_testing', 'to_improve', 'internally_validated',
      'client_testing', 'commercializable', 'suspended', 'abandoned'
    )),
  created_by text,
  technical_validation_status text,
  technical_validator_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_formulas_status on public.feed_formulas(status);
create index if not exists idx_feed_formulas_species on public.feed_formulas(target_species);

-- ---------------------------------------------------------------------------
-- feed_formula_versions
-- ---------------------------------------------------------------------------
create table if not exists public.feed_formula_versions (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  formula_id text not null references public.feed_formulas(id) on delete cascade,
  version_number integer not null default 1,
  version_code text not null,
  theoretical_cost_per_kg numeric not null default 0,
  expected_performance_notes text,
  change_reason text,
  status text not null default 'draft',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_formula_versions_formula on public.feed_formula_versions(formula_id);

-- ---------------------------------------------------------------------------
-- feed_formula_ingredients
-- ---------------------------------------------------------------------------
create table if not exists public.feed_formula_ingredients (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  formula_version_id text not null references public.feed_formula_versions(id) on delete cascade,
  raw_material_id text references public.feed_raw_materials(id) on delete set null,
  percentage numeric not null default 0,
  quantity_for_100kg numeric not null default 0,
  latest_unit_cost numeric not null default 0,
  cost_contribution numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_formula_ingredients_version on public.feed_formula_ingredients(formula_version_id);

-- ---------------------------------------------------------------------------
-- Enrichissements tables existantes
-- ---------------------------------------------------------------------------
alter table public.fournisseurs
  add column if not exists supplier_type text,
  add column if not exists average_quality_score numeric,
  add column if not exists average_delivery_delay numeric,
  add column if not exists last_purchase_date date,
  add column if not exists payment_terms text,
  add column if not exists active boolean default true;

alter table public.alimentation_logs
  add column if not exists feed_source text,
  add column if not exists market_feed_purchase_id text,
  add column if not exists feed_finished_batch_id text,
  add column if not exists formula_version_id text,
  add column if not exists distribution_cost numeric,
  add column if not exists cost_source text;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.feed_raw_materials enable row level security;
alter table public.feed_raw_batches enable row level security;
alter table public.feed_formulas enable row level security;
alter table public.feed_formula_versions enable row level security;
alter table public.feed_formula_ingredients enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'feed_raw_materials',
    'feed_raw_batches',
    'feed_formulas',
    'feed_formula_versions',
    'feed_formula_ingredients'
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

comment on table public.feed_raw_materials is 'AGRI FEEDS — catalogue matières premières';
comment on table public.feed_raw_batches is 'AGRI FEEDS — lots réception MP + QC';
comment on table public.feed_formulas is 'AGRI FEEDS — formules aliments';
comment on table public.feed_formula_versions is 'AGRI FEEDS — versions de formules';
comment on table public.feed_formula_ingredients is 'AGRI FEEDS — ingrédients par version';
