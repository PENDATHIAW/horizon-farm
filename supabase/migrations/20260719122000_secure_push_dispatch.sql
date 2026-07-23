create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push_on_critical_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_url text;
  cron_secret text;
  payload jsonb;
  alert_severity text;
  alert_status text;
  alert_module text;
begin
  payload := to_jsonb(new);
  alert_severity := lower(coalesce(payload->>'severity', payload->>'gravite', ''));
  alert_status := lower(coalesce(payload->>'status', payload->>'statut', 'nouvelle'));
  alert_module := lower(coalesce(payload->>'module_source', payload->>'module', 'alertes'));

  if alert_status <> 'nouvelle' or new.push_notified_at is not null then return new; end if;
  if alert_severity not in ('urgence', 'critique')
    and alert_module not in (
      'stock', 'avicole', 'animaux', 'sante', 'smartfarm', 'equipements',
      'finances', 'clients', 'documents', 'documents_rapports', 'taches', 'ventes'
    ) then
    return new;
  end if;

  select value into app_url from public.system_settings where key = 'APP_PUBLIC_URL' limit 1;
  select value into cron_secret from public.system_settings where key = 'CRON_SECRET' limit 1;

  if nullif(trim(app_url), '') is null or nullif(trim(cron_secret), '') is null then
    return new;
  end if;

  perform net.http_post(
    url := trim(trailing '/' from app_url) || '/api/push/send-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(cron_secret)
    ),
    body := jsonb_build_object(
      'source', 'supabase_alert_trigger',
      'alert_id', payload->>'id'
    )
  );

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_dispatch_push_on_critical_alert on public.alertes_center;
create trigger trg_dispatch_push_on_critical_alert
  after insert on public.alertes_center
  for each row
  execute function public.dispatch_push_on_critical_alert();
