-- Les services applicatifs écrivent dans public.tasks (et non public.taches).
-- Ces métadonnées rendent la déduplication, l'expiration et la traçabilité persistantes.

alter table if exists public.tasks
  add column if not exists notes text,
  add column if not exists entity_type text,
  add column if not exists related_id text,
  add column if not exists alert_id text,
  add column if not exists source_module text,
  add column if not exists source_record_id text,
  add column if not exists related_module text,
  add column if not exists related_record_id text,
  add column if not exists workflow_id text,
  add column if not exists origin_type text,
  add column if not exists issue_key text,
  add column if not exists action_key text,
  add column if not exists task_dedupe_key text,
  add column if not exists alert_dedupe_key text,
  add column if not exists completed_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

alter table if exists public.alertes_center
  add column if not exists category text,
  add column if not exists is_auto boolean not null default false,
  add column if not exists alert_dedupe_key text,
  add column if not exists target_date date,
  add column if not exists expires_at date,
  add column if not exists linked_task_id text,
  add column if not exists treated_at timestamptz,
  add column if not exists completed_task_id text,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

create index if not exists idx_tasks_task_dedupe_key on public.tasks(task_dedupe_key);
create index if not exists idx_tasks_source_record on public.tasks(source_module, source_record_id);
create index if not exists idx_alertes_center_dedupe_key on public.alertes_center(alert_dedupe_key);
create index if not exists idx_alertes_center_expiration on public.alertes_center(expires_at);

-- Archive les diagnostics techniques qui avaient été exposés comme tâches métier.
update public.tasks
set status = 'termine',
    updated_at = now(),
    notes = trim(both ' ' from concat_ws(' · ', nullif(notes, ''), 'Archivée automatiquement : diagnostic interne ou échéance passée'))
where lower(coalesce(status, 'a_faire')) not in ('termine','terminé','done','closed','annule','annulé','expiree','expirée')
  and (
    lower(title) ~ '^(récursion ux formulaire|recursion ux formulaire|doublons fonctionnels|module sans onglets cibles)'
    or (
      lower(trim(title)) in ('tabaski','korité','korite','ramadan','magal','gamou','fin d''année')
      and due_date < current_date
    )
    or (
      lower(title) like 'lancement suspendu%'
      and lower(coalesce(assigned_to, '')) in ('team-ferme','equipe ferme','équipe ferme')
      and coalesce(due_date, created_at::date) < current_date - 7
    )
  );

update public.alertes_center
set status = 'resolue',
    updated_at = now(),
    message = trim(both ' ' from concat_ws(' · ', nullif(message, ''), 'Archivée automatiquement : diagnostic interne ou échéance passée'))
where lower(coalesce(status, 'nouvelle')) not in ('traitee','traitée','resolue','résolue','fermee','fermée','done','closed','expiree','expirée')
  and (
    lower(title) ~ '^(récursion ux formulaire|recursion ux formulaire|doublons fonctionnels|module sans onglets cibles)'
    or (
      lower(trim(title)) in ('tabaski','korité','korite','ramadan','magal','gamou','fin d''année')
      and (lower(coalesce(entity_type, '')) = 'launch_timing' or lower(coalesce(module_source, '')) = 'centre_decisionnel')
      and coalesce(expires_at, target_date, created_at::date) < current_date
    )
    or (
      lower(title) like 'lancement suspendu%'
      and lower(coalesce(module_source, '')) = 'centre_decisionnel'
      and created_at::date < current_date - 7
    )
  );
