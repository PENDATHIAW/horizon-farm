-- ============================================================
-- Horizon Farm — Schema IA transversal
-- Objectif : ajouter une couche IA sans dupliquer les modules ERP.
-- Les tables ci-dessous stockent uniquement les observations,
-- recommandations, decisions, scores et evenements transversaux.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Sources de prix marche / fournisseurs
-- ------------------------------------------------------------
create table if not exists public.market_price_sources (
  id text primary key,
  name text not null,
  source_type text default 'manual', -- manual, supplier, invoice, whatsapp, web, market_visit, api
  contact_name text,
  phone text,
  location text,
  reliability_score numeric default 50,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.market_prices (
  id text primary key,
  product_name text not null,
  product_category text not null, -- aliment_pondeuse, aliment_chair, oeufs, poulet_chair, bovin, ovin, caprin, intrant_culture
  unit text not null default 'unite', -- sac, kg, tonne, tablette, sujet, tete, cageot
  price numeric not null default 0,
  currency text default 'FCFA',
  source_id text,
  source_name text,
  location text,
  observed_at timestamptz default now(),
  confidence_level text default 'a_verifier', -- confirme, observe, estime, a_verifier
  quality_rating numeric,
  transport_cost numeric default 0,
  delivery_delay_days numeric,
  notes text,
  related_supplier_id text,
  related_stock_id text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Recommandations IA transversales
-- ------------------------------------------------------------
create table if not exists public.ai_recommendations (
  id text primary key,
  title text not null,
  summary text,
  recommendation_type text not null, -- achat, vente, stock, sante, prix, securite, tresorerie, production, reproduction, culture
  module_target text, -- avicole, animaux, stock, finances, ventes, smartfarm, cultures, fournisseurs
  entity_type text,
  entity_id text,
  priority text default 'moyenne', -- basse, moyenne, haute, critique
  status text default 'nouvelle', -- nouvelle, vue, acceptee, rejetee, executee, expiree
  reasoning text,
  action_recommandee text,
  expected_impact text,
  expected_amount numeric,
  confidence_score numeric default 0,
  source_data jsonb default '{}'::jsonb,
  expires_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Journal des decisions IA
-- ------------------------------------------------------------
create table if not exists public.ai_decisions (
  id text primary key,
  recommendation_id text,
  decision_status text not null default 'en_attente', -- en_attente, validee, rejetee, modifiee, executee
  decision_by uuid default auth.uid(),
  decision_note text,
  before_data jsonb default '{}'::jsonb,
  after_data jsonb default '{}'::jsonb,
  modules_impacted text[] default '{}',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Saisie intelligente multi-modules
-- ------------------------------------------------------------
create table if not exists public.ai_intake_events (
  id text primary key,
  raw_input text not null,
  input_type text default 'text', -- text, voice, image, invoice, whatsapp
  interpreted_intent text,
  status text default 'brouillon', -- brouillon, propose, valide, rejete, execute
  extracted_data jsonb default '{}'::jsonb,
  proposed_actions jsonb default '[]'::jsonb,
  modules_impacted text[] default '{}',
  validation_required boolean default true,
  validated_by uuid,
  validated_at timestamptz,
  execution_result jsonb default '{}'::jsonb,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Scores IA
-- ------------------------------------------------------------
create table if not exists public.ai_scores (
  id text primary key,
  score_type text not null, -- fournisseur, client, lot_avicole, animal, culture, activite, securite, bancabilite
  entity_type text not null,
  entity_id text not null,
  score numeric not null default 0,
  score_label text,
  factors jsonb default '{}'::jsonb,
  explanation text,
  calculated_at timestamptz default now(),
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Evenements Smart Farm enrichis pour IA
-- ------------------------------------------------------------
create table if not exists public.smartfarm_events (
  id text primary key,
  device_id text,
  device_type text, -- camera, sensor, gateway, nvr
  zone text,
  event_type text not null, -- temperature, humidite, intrusion, mouvement, humain_detecte, camera_offline, capteur_offline
  event_value numeric,
  event_unit text,
  severity text default 'info', -- info, warning, critique, urgence
  message text,
  raw_payload jsonb default '{}'::jsonb,
  handled boolean default false,
  handled_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Calendrier marche / evenements contextuels
-- ------------------------------------------------------------
create table if not exists public.market_calendar_events (
  id text primary key,
  name text not null, -- Ramadan, Korite, Tabaski, Magal, rentree, fete_locale
  event_type text default 'marche',
  starts_at date,
  ends_at date,
  affected_products text[] default '{}',
  expected_effect text, -- hausse_demande, baisse_demande, hausse_prix, baisse_prix
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Triggers updated_at
-- ------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'market_price_sources',
    'market_prices',
    'ai_recommendations',
    'ai_intake_events',
    'market_calendar_events'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Indexes utiles
-- ------------------------------------------------------------
create index if not exists idx_market_prices_category_date on public.market_prices(product_category, observed_at desc);
create index if not exists idx_market_prices_supplier on public.market_prices(related_supplier_id);
create index if not exists idx_ai_recommendations_status_priority on public.ai_recommendations(status, priority, created_at desc);
create index if not exists idx_ai_recommendations_module on public.ai_recommendations(module_target, entity_type, entity_id);
create index if not exists idx_ai_intake_status on public.ai_intake_events(status, created_at desc);
create index if not exists idx_ai_scores_entity on public.ai_scores(entity_type, entity_id, score_type);
create index if not exists idx_smartfarm_events_zone_type on public.smartfarm_events(zone, event_type, created_at desc);

-- ------------------------------------------------------------
-- RLS minimal : chaque utilisateur voit ses donnees.
-- A ajuster selon les roles existants Horizon Farm.
-- ------------------------------------------------------------
alter table public.market_price_sources enable row level security;
alter table public.market_prices enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.ai_decisions enable row level security;
alter table public.ai_intake_events enable row level security;
alter table public.ai_scores enable row level security;
alter table public.smartfarm_events enable row level security;
alter table public.market_calendar_events enable row level security;

-- Policies permissives controlees par owner_user_id.
-- Si l'application utilise un compte admin unique, ces policies fonctionneront.
do $$
declare
  t text;
  tables text[] := array[
    'market_price_sources','market_prices','ai_recommendations','ai_decisions','ai_intake_events','ai_scores','smartfarm_events','market_calendar_events'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format('drop policy if exists %I_owner_insert on public.%I', t, t);
    execute format('drop policy if exists %I_owner_update on public.%I', t, t);
    execute format('drop policy if exists %I_owner_delete on public.%I', t, t);

    execute format('create policy %I_owner_select on public.%I for select using (owner_user_id = auth.uid() or auth.uid() is not null)', t, t);
    execute format('create policy %I_owner_insert on public.%I for insert with check (owner_user_id = auth.uid() or auth.uid() is not null)', t, t);
    execute format('create policy %I_owner_update on public.%I for update using (owner_user_id = auth.uid() or auth.uid() is not null)', t, t);
    execute format('create policy %I_owner_delete on public.%I for delete using (owner_user_id = auth.uid() or auth.uid() is not null)', t, t);
  end loop;
end $$;

select 'Horizon Farm AI schema installed successfully' as message;
