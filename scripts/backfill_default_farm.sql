-- Backfill Phase 2/3 — rattacher les données existantes à la ferme par défaut Horizon Farm
-- Idempotent : ne modifie que les lignes où farm_id IS NULL
-- Rejouable : oui
-- Usage : exécuter dans Supabase SQL Editor après 20260606120000_multi_farm_foundations.sql

do $$
declare
  default_farm_id uuid;
  default_farm_name text;
  updated_animals integer := 0;
  updated_lots integer := 0;
  updated_stocks integer := 0;
  updated_sales integer := 0;
  updated_finances integer := 0;
  updated_cultures integer := 0;
  updated_events integer := 0;
begin
  select f.id, f.name
  into default_farm_id, default_farm_name
  from public.farms f
  where f.is_default = true
  order by f.created_at asc
  limit 1;

  if default_farm_id is null then
    raise exception 'Aucune ferme par défaut trouvée. Exécutez d''abord la migration multi_farm_foundations.';
  end if;

  raise notice 'Backfill vers ferme default: % (%)', default_farm_name, default_farm_id;

  update public.animals set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_animals = row_count;

  update public.lots set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_lots = row_count;

  update public.stocks set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_stocks = row_count;

  update public.sales_orders set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_sales = row_count;

  update public.finances set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_finances = row_count;

  update public.cultures set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_cultures = row_count;

  update public.business_events set farm_id = default_farm_id where farm_id is null;
  get diagnostics updated_events = row_count;

  raise notice 'Backfill terminé — animals: %, lots: %, stocks: %, sales_orders: %, finances: %, cultures: %, business_events: %',
    updated_animals,
    updated_lots,
    updated_stocks,
    updated_sales,
    updated_finances,
    updated_cultures,
    updated_events;
end $$;

-- Vérification post-backfill
select 'animals' as table_name,
  count(*) filter (where farm_id is null) as null_farm_id,
  count(*) filter (where farm_id is not null) as tagged_farm_id,
  count(*) as total
from public.animals
union all
select 'lots', count(*) filter (where farm_id is null), count(*) filter (where farm_id is not null), count(*) from public.lots
union all
select 'stocks', count(*) filter (where farm_id is null), count(*) filter (where farm_id is not null), count(*) from public.stocks
union all
select 'sales_orders', count(*) filter (where farm_id is null), count(*) filter (where farm_id is not null), count(*) from public.sales_orders
union all
select 'finances', count(*) filter (where farm_id is null), count(*) filter (where farm_id is not null), count(*) from public.finances
union all
select 'cultures', count(*) filter (where farm_id is null), count(*) filter (where farm_id is not null), count(*) from public.cultures
union all
select 'business_events', count(*) filter (where farm_id is null), count(*) filter (where farm_id is not null), count(*) from public.business_events;

-- Contrôle ferme default
select id, name, is_default, activity_type, status
from public.farms
where is_default = true
order by created_at asc;
