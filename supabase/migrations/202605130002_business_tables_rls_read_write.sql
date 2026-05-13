-- Horizon Farm SaaS RLS read/write foundation.
-- Visitors are intentionally excluded from business data access.

create or replace function public.can_read_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('admin','manager','employe','veterinaire','comptable');
$$;

create or replace function public.can_write_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('admin','manager','employe','veterinaire','comptable');
$$;

create or replace function public.can_admin_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() = 'admin';
$$;

-- Apply manually or in Supabase SQL editor after confirming table names:
-- 1. alter table public.<table_name> add column if not exists company_id uuid references public.companies(id) on delete set null;
-- 2. alter table public.<table_name> enable row level security;
-- 3. create policy <table_name>_read on public.<table_name> for select to authenticated using (public.can_read_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));
-- 4. create policy <table_name>_insert on public.<table_name> for insert to authenticated with check (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));
-- 5. create policy <table_name>_update on public.<table_name> for update to authenticated using (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id())) with check (public.can_write_erp() and (public.can_admin_erp() or company_id is null or company_id = public.current_company_id()));

-- Core ERP table list to protect:
-- animaux, avicole, sante, veterinaires, finances, investissements, stock, clients, fournisseurs,
-- tracabilite, cultures, documents, taches, rapports, equipements, audit_logs, alimentation_logs,
-- production_oeufs_logs, business_events, alertes_center, whatsapp_templates, whatsapp_logs,
-- sales_orders, sales_order_items, deliveries, invoices, payments, sales_opportunities,
-- sensor_devices, camera_devices.
