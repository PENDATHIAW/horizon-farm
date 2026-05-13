-- Horizon Farm ERP
-- Soft delete support for durable deletions across devices and future enrichments.

create table if not exists public.deleted_records (
  id text primary key,
  module_key text not null,
  table_name text not null,
  record_id text not null,
  id_field text default 'id',
  deleted_by text,
  deleted_at timestamptz not null default now(),
  reason text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists deleted_records_module_record_idx
  on public.deleted_records (module_key, record_id);

create index if not exists deleted_records_table_record_idx
  on public.deleted_records (table_name, record_id);

alter table public.animaux add column if not exists is_deleted boolean not null default false;
alter table public.animaux add column if not exists deleted_at timestamptz;
alter table public.animaux add column if not exists deleted_by text;

alter table public.avicole add column if not exists is_deleted boolean not null default false;
alter table public.avicole add column if not exists deleted_at timestamptz;
alter table public.avicole add column if not exists deleted_by text;

alter table public.sante add column if not exists is_deleted boolean not null default false;
alter table public.sante add column if not exists deleted_at timestamptz;
alter table public.sante add column if not exists deleted_by text;

alter table public.veterinaires add column if not exists is_deleted boolean not null default false;
alter table public.veterinaires add column if not exists deleted_at timestamptz;
alter table public.veterinaires add column if not exists deleted_by text;

alter table public.finances add column if not exists is_deleted boolean not null default false;
alter table public.finances add column if not exists deleted_at timestamptz;
alter table public.finances add column if not exists deleted_by text;

alter table public.stock add column if not exists is_deleted boolean not null default false;
alter table public.stock add column if not exists deleted_at timestamptz;
alter table public.stock add column if not exists deleted_by text;

alter table public.clients add column if not exists is_deleted boolean not null default false;
alter table public.clients add column if not exists deleted_at timestamptz;
alter table public.clients add column if not exists deleted_by text;

alter table public.fournisseurs add column if not exists is_deleted boolean not null default false;
alter table public.fournisseurs add column if not exists deleted_at timestamptz;
alter table public.fournisseurs add column if not exists deleted_by text;

alter table public.investissements add column if not exists is_deleted boolean not null default false;
alter table public.investissements add column if not exists deleted_at timestamptz;
alter table public.investissements add column if not exists deleted_by text;

alter table public.tracabilite add column if not exists is_deleted boolean not null default false;
alter table public.tracabilite add column if not exists deleted_at timestamptz;
alter table public.tracabilite add column if not exists deleted_by text;

alter table public.cultures add column if not exists is_deleted boolean not null default false;
alter table public.cultures add column if not exists deleted_at timestamptz;
alter table public.cultures add column if not exists deleted_by text;

alter table public.ventes add column if not exists is_deleted boolean not null default false;
alter table public.ventes add column if not exists deleted_at timestamptz;
alter table public.ventes add column if not exists deleted_by text;

alter table public.documents add column if not exists is_deleted boolean not null default false;
alter table public.documents add column if not exists deleted_at timestamptz;
alter table public.documents add column if not exists deleted_by text;

alter table public.taches add column if not exists is_deleted boolean not null default false;
alter table public.taches add column if not exists deleted_at timestamptz;
alter table public.taches add column if not exists deleted_by text;

alter table public.rapports add column if not exists is_deleted boolean not null default false;
alter table public.rapports add column if not exists deleted_at timestamptz;
alter table public.rapports add column if not exists deleted_by text;

alter table public.equipements add column if not exists is_deleted boolean not null default false;
alter table public.equipements add column if not exists deleted_at timestamptz;
alter table public.equipements add column if not exists deleted_by text;

alter table public.audit_logs add column if not exists is_deleted boolean not null default false;
alter table public.audit_logs add column if not exists deleted_at timestamptz;
alter table public.audit_logs add column if not exists deleted_by text;

alter table public.alimentation_logs add column if not exists is_deleted boolean not null default false;
alter table public.alimentation_logs add column if not exists deleted_at timestamptz;
alter table public.alimentation_logs add column if not exists deleted_by text;

alter table public.production_oeufs_logs add column if not exists is_deleted boolean not null default false;
alter table public.production_oeufs_logs add column if not exists deleted_at timestamptz;
alter table public.production_oeufs_logs add column if not exists deleted_by text;

alter table public.sensor_devices add column if not exists is_deleted boolean not null default false;
alter table public.sensor_devices add column if not exists deleted_at timestamptz;
alter table public.sensor_devices add column if not exists deleted_by text;

alter table public.camera_devices add column if not exists is_deleted boolean not null default false;
alter table public.camera_devices add column if not exists deleted_at timestamptz;
alter table public.camera_devices add column if not exists deleted_by text;

alter table public.business_events add column if not exists is_deleted boolean not null default false;
alter table public.business_events add column if not exists deleted_at timestamptz;
alter table public.business_events add column if not exists deleted_by text;

alter table public.alertes_center add column if not exists is_deleted boolean not null default false;
alter table public.alertes_center add column if not exists deleted_at timestamptz;
alter table public.alertes_center add column if not exists deleted_by text;

alter table public.whatsapp_templates add column if not exists is_deleted boolean not null default false;
alter table public.whatsapp_templates add column if not exists deleted_at timestamptz;
alter table public.whatsapp_templates add column if not exists deleted_by text;

alter table public.whatsapp_logs add column if not exists is_deleted boolean not null default false;
alter table public.whatsapp_logs add column if not exists deleted_at timestamptz;
alter table public.whatsapp_logs add column if not exists deleted_by text;

alter table public.sales_orders add column if not exists is_deleted boolean not null default false;
alter table public.sales_orders add column if not exists deleted_at timestamptz;
alter table public.sales_orders add column if not exists deleted_by text;

alter table public.sales_order_items add column if not exists is_deleted boolean not null default false;
alter table public.sales_order_items add column if not exists deleted_at timestamptz;
alter table public.sales_order_items add column if not exists deleted_by text;

alter table public.deliveries add column if not exists is_deleted boolean not null default false;
alter table public.deliveries add column if not exists deleted_at timestamptz;
alter table public.deliveries add column if not exists deleted_by text;

alter table public.invoices add column if not exists is_deleted boolean not null default false;
alter table public.invoices add column if not exists deleted_at timestamptz;
alter table public.invoices add column if not exists deleted_by text;

alter table public.payments add column if not exists is_deleted boolean not null default false;
alter table public.payments add column if not exists deleted_at timestamptz;
alter table public.payments add column if not exists deleted_by text;

alter table public.sales_opportunities add column if not exists is_deleted boolean not null default false;
alter table public.sales_opportunities add column if not exists deleted_at timestamptz;
alter table public.sales_opportunities add column if not exists deleted_by text;
