-- Migration ai_recommendations pour IA proactive Phase 1
create extension if not exists "pgcrypto";

create table if not exists public.ai_recommendations (
  id text primary key,
  title text not null,
  summary text,
  recommendation_type text not null,
  module_target text,
  entity_type text,
  entity_id text,
  priority text default 'moyenne',
  status text default 'nouvelle',
  reasoning text,
  action_recommandee text,
  expected_impact text,
  expected_amount numeric,
  confidence_score numeric default 0,
  source_data jsonb default '{}'::jsonb,
  detected_issue text,
  recommended_action text,
  source_records jsonb default '[]'::jsonb,
  created_by_ai boolean default true,
  validated_by_user uuid,
  resolved_at timestamptz,
  expires_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ai_recommendations_status_idx on public.ai_recommendations (status);
create index if not exists ai_recommendations_module_idx on public.ai_recommendations (module_target);
create index if not exists ai_recommendations_priority_idx on public.ai_recommendations (priority);

alter table public.ai_recommendations enable row level security;

drop policy if exists ai_recommendations_select on public.ai_recommendations;
create policy ai_recommendations_select on public.ai_recommendations for select using (true);

drop policy if exists ai_recommendations_insert on public.ai_recommendations;
create policy ai_recommendations_insert on public.ai_recommendations for insert with check (true);

drop policy if exists ai_recommendations_update on public.ai_recommendations;
create policy ai_recommendations_update on public.ai_recommendations for update using (true);
