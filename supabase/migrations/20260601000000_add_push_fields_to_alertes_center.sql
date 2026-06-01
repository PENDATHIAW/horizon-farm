-- Push Web Notifications (PWA) fields on alertes_center

alter table public.alertes_center
  add column if not exists push_status text,
  add column if not exists push_notified_at timestamptz,
  add column if not exists push_error text,
  add column if not exists push_notification_count integer not null default 0,
  add column if not exists last_push_attempt_at timestamptz;

create index if not exists idx_alertes_center_push_notified_at
  on public.alertes_center(push_notified_at);

create index if not exists idx_alertes_center_push_status
  on public.alertes_center(push_status);

