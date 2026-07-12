-- Saisies quotidiennes : une identité stable, traçable et rejouable par ferme.
do $$
declare
  target_table text;
  index_name text;
  has_farm_id boolean;
begin
  foreach target_table in array array[
    'business_events',
    'alimentation_logs',
    'production_oeufs_logs',
    'sales_orders',
    'sales_order_items',
    'deliveries',
    'invoices',
    'payments',
    'documents',
    'finances',
    'stock_movements'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists entry_id text', target_table);
    execute format('alter table public.%I add column if not exists event_key text', target_table);
    execute format('alter table public.%I add column if not exists idempotency_key text', target_table);
    execute format('alter table public.%I add column if not exists recorded_by text', target_table);
    execute format('comment on column public.%I.event_key is %L', target_table, 'Clé métier stable utilisée pour rejouer une saisie sans doublon');

    select exists (
      select 1
      from information_schema.columns as columns_meta
      where columns_meta.table_schema = 'public'
        and columns_meta.table_name = target_table
        and columns_meta.column_name = 'farm_id'
    ) into has_farm_id;

    index_name := format('uq_%s_daily_event_key', target_table);
    if has_farm_id then
      execute format(
        'create unique index if not exists %I on public.%I ((coalesce(farm_id::text, %L)), event_key) where event_key is not null and event_key <> %L',
        index_name,
        target_table,
        '',
        ''
      );
    else
      execute format(
        'create unique index if not exists %I on public.%I (event_key) where event_key is not null and event_key <> %L',
        index_name,
        target_table,
        ''
      );
    end if;
  end loop;
end
$$;
