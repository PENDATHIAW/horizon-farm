-- Stock movements history table for traceability (Achats/Stock/Alimentation P6)

create table if not exists public.stock_movements (
  id text primary key,
  stock_id text not null,
  movement_type text not null default 'entree',
  quantity numeric not null default 0,
  unit text,
  stock_before numeric,
  stock_after numeric,
  stock_delta numeric,
  source_module text,
  source_record_id text,
  linked_event_id text,
  notes text,
  movement_date date not null default current_date,
  created_at timestamptz not null default now(),
  company_id uuid references public.companies(id) on delete set null
);

create index if not exists stock_movements_stock_id_idx on public.stock_movements(stock_id);
create index if not exists stock_movements_date_idx on public.stock_movements(movement_date desc);
create index if not exists stock_movements_source_idx on public.stock_movements(source_module, source_record_id);

alter table public.stock_movements enable row level security;

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements
  for select to authenticated
  using (public.can_read_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));

drop policy if exists stock_movements_insert on public.stock_movements;
create policy stock_movements_insert on public.stock_movements
  for insert to authenticated
  with check (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));

drop policy if exists stock_movements_update on public.stock_movements;
create policy stock_movements_update on public.stock_movements
  for update to authenticated
  using (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()))
  with check (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));
