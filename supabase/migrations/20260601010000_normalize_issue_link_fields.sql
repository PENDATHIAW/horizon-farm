-- Priorité 2 : normaliser issue_key / source_module / source_record_id
-- + related_module / related_record_id / workflow_id / origin_type

alter table if exists public.alertes_center
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.taches
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.ai_recommendations
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.business_events
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.documents
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.finances
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.sales_orders
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.payments
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

alter table if exists public.stock
  add column if not exists issue_key text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text;

create index if not exists idx_alertes_center_issue_key on public.alertes_center(issue_key);
create index if not exists idx_taches_issue_key on public.taches(issue_key);
create index if not exists idx_ai_recommendations_issue_key on public.ai_recommendations(issue_key);
create index if not exists idx_business_events_issue_key on public.business_events(issue_key);
create index if not exists idx_documents_issue_key on public.documents(issue_key);
create index if not exists idx_finances_issue_key on public.finances(issue_key);
create index if not exists idx_sales_orders_issue_key on public.sales_orders(issue_key);
create index if not exists idx_payments_issue_key on public.payments(issue_key);
create index if not exists idx_stock_issue_key on public.stock(issue_key);

