-- Achats & Stock V1 P0 — farm_id et idempotence sur stock_movements (nullable, rétrocompatible)

alter table public.stock_movements
  add column if not exists farm_id text,
  add column if not exists dedupe_key text,
  add column if not exists movement_ref text,
  add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists stock_movements_farm_id_idx on public.stock_movements(farm_id);
create unique index if not exists stock_movements_dedupe_key_uidx
  on public.stock_movements(dedupe_key)
  where dedupe_key is not null and dedupe_key <> '';
