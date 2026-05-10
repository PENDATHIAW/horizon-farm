create extension if not exists pg_net with schema extensions;

create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  is_secret boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.system_settings enable row level security;

drop policy if exists "system_settings_select_authenticated" on public.system_settings;
create policy "system_settings_select_authenticated"
  on public.system_settings
  for select
  to authenticated
  using (is_secret = false);

create or replace function public.set_system_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
  before update on public.system_settings
  for each row
  execute function public.set_system_settings_updated_at();

create or replace function public.dispatch_push_on_critical_alert()
returns trigger as $$
declare
  app_url text;
  cron_secret text;
  alert_severity text;
  alert_status text;
begin
  alert_severity := lower(coalesce(new.severity, new.gravite, ''));
  alert_status := lower(coalesce(new.status, new.statut, 'nouvelle'));

  if alert_severity not in ('urgence', 'critique') then
    return new;
  end if;

  if alert_status in ('traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed') then
    return new;
  end if;

  select value into app_url from public.system_settings where key = 'APP_PUBLIC_URL' limit 1;
  select value into cron_secret from public.system_settings where key = 'CRON_SECRET' limit 1;

  if app_url is null or length(trim(app_url)) = 0 then
    return new;
  end if;

  perform net.http_post(
    url := trim(trailing '/' from app_url) || '/api/push/dispatch-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(cron_secret, '')
    ),
    body := jsonb_build_object(
      'source', 'supabase_alert_trigger',
      'alert_id', new.id,
      'severity', alert_severity,
      'module', coalesce(new.module_source, new.module, 'alertes'),
      'entity_id', coalesce(new.entity_id, new.related_id, '')
    )
  );

  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_dispatch_push_on_critical_alert on public.alertes_center;
create trigger trg_dispatch_push_on_critical_alert
  after insert or update of severity, gravite, status, statut on public.alertes_center
  for each row
  execute function public.dispatch_push_on_critical_alert();
