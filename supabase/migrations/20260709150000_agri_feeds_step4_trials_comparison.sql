-- AGRI FEEDS étape 4 — essais internes + comparaison Phase 1 + validation humaine.

create extension if not exists pgcrypto;

create table if not exists public.feed_trials (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  trial_code text not null,
  formula_version_id text references public.feed_formula_versions(id) on delete set null,
  finished_batch_id text references public.feed_finished_batches(id) on delete set null,
  animal_lot_id text,
  animal_type text,
  species text,
  target_stage text,
  start_date date,
  end_date date,
  starting_count integer not null default 0,
  ending_count integer not null default 0,
  starting_weight_avg numeric,
  ending_weight_avg numeric,
  total_feed_consumed numeric not null default 0,
  total_feed_cost numeric not null default 0,
  feed_conversion_ratio numeric,
  mortality_count integer not null default 0,
  mortality_rate numeric,
  egg_production_total numeric,
  laying_rate numeric,
  cost_feed_per_animal numeric,
  cost_feed_per_tray numeric,
  cost_feed_per_kg_gain numeric,
  revenue numeric,
  margin numeric,
  decision text
    check (decision is null or decision in ('validate', 'improve', 'abandon', 'retest')),
  decision_notes text,
  reviewed_by_human boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  phase1_comparison_id text,
  phase1_comparison boolean not null default false,
  status text not null default 'in_progress'
    check (status in ('planned', 'in_progress', 'closed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feed_trials_formula on public.feed_trials(formula_version_id);
create index if not exists idx_feed_trials_lot on public.feed_trials(animal_lot_id);
create index if not exists idx_feed_trials_status on public.feed_trials(status);
create index if not exists idx_feed_trials_decision on public.feed_trials(decision);

create table if not exists public.feed_phase1_comparisons (
  id text primary key,
  farm_id uuid references public.farms(id) on delete set null,
  trial_id text references public.feed_trials(id) on delete cascade,
  formula_version_id text references public.feed_formula_versions(id) on delete set null,
  animal_lot_id text,
  reference_source text not null default 'phase_1_market',
  reference_period_start date,
  reference_period_end date,
  market_snapshot jsonb not null default '{}'::jsonb,
  agri_snapshot jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '[]'::jsonb,
  overall_status text not null default 'donnees_insuffisantes',
  overall_message text,
  favorable_count integer not null default 0,
  worse_count integer not null default 0,
  equivalent_count integer not null default 0,
  reviewed_by_human boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_phase1_comparisons_trial on public.feed_phase1_comparisons(trial_id);
create index if not exists idx_feed_phase1_comparisons_formula on public.feed_phase1_comparisons(formula_version_id);

alter table public.feed_trials enable row level security;
alter table public.feed_phase1_comparisons enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'feed_trials',
    'feed_phase1_comparisons'
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

comment on table public.feed_trials is 'AGRI FEEDS — essais internes sur animaux Horizon Farm';
comment on table public.feed_phase1_comparisons is 'AGRI FEEDS — comparaisons formalisées avec la référence Phase 1';
