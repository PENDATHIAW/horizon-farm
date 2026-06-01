-- Met à jour le trigger de push pour appeler /api/push/send-alert

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push_on_critical_alert()
returns trigger as $$
declare
  app_url text;
  cron_secret text;
  payload jsonb;
  alert_severity text;
  alert_status text;
  alert_module text;
  title_text text;
begin
  payload := to_jsonb(new);

  alert_severity := lower(coalesce(payload->>'severity', payload->>'gravite', ''));
  alert_status := lower(coalesce(payload->>'status', payload->>'statut', 'nouvelle'));
  alert_module := lower(coalesce(payload->>'module_source', payload->>'module', 'alertes'));
  title_text := lower(coalesce(payload->>'title', payload->>'message', ''));

  -- Push uniquement pour nouvelles alertes persistées
  if alert_status <> 'nouvelle' then
    return new;
  end if;

  -- Anti-boucle : si déjà notifiée, on ne renvoie rien.
  if new.push_notified_at is not null then
    return new;
  end if;

  -- Réduction charge : push surtout critique/urgence + quelques familles prioritaires par module/title.
  if alert_severity in ('urgence', 'critique') then
    null;
  elsif alert_module in ('stock', 'avicole', 'animaux', 'sante', 'smartfarm', 'equipements', 'finances', 'clients', 'documents', 'documents_rapports', 'taches') then
    -- Pour éviter trop de pushes : filtrer via mots clés
    if title_text like '%stock critique%' or title_text like '%rupture%' or title_text like '%pret a vendre%' or title_text like '%prêt à vendre%' or title_text like '%mortalite%' or title_text like '%malade%' or title_text like '%soin a preparer%' or title_text like '%rappel%' or title_text like '%capteur%' or title_text like '%hors ligne%' or title_text like '%panne%' or title_text like '%maintenance%' or title_text like '%impa%' or title_text like '%creance%' or title_text like '%justificatif%' or title_text like '%preuve%' then
      null;
    else
      return new;
    end if;
  else
    return new;
  end if;

  select value into app_url from public.system_settings where key = 'APP_PUBLIC_URL' limit 1;
  select value into cron_secret from public.system_settings where key = 'CRON_SECRET' limit 1;

  if app_url is null or length(trim(app_url)) = 0 then
    return new;
  end if;

  perform net.http_post(
    url := trim(trailing '/' from app_url) || '/api/push/send-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(cron_secret, '')
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
$$ language plpgsql security definer;

drop trigger if exists trg_dispatch_push_on_critical_alert on public.alertes_center;
create trigger trg_dispatch_push_on_critical_alert
  after insert
  for each row
  execute function public.dispatch_push_on_critical_alert();

