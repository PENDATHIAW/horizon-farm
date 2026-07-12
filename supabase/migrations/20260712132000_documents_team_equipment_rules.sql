-- V1: rapports versionnés, annuaire équipe par ferme et remise en service contrôlée.

create table if not exists public.farm_rh_directory (
  id text primary key,
  farm_id uuid references public.farms(id) on delete cascade,
  directory jsonb not null default '{"people":[],"teams":[],"absences":[]}'::jsonb,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farm_rh_directory add column if not exists farm_id uuid references public.farms(id) on delete cascade;

update public.farm_rh_directory directory_row
set farm_id = coalesce(
  (
    select access_row.farm_id
    from public.user_farm_access access_row
    where access_row.user_id = directory_row.owner_user_id
    order by access_row.created_at
    limit 1
  ),
  (select farm.id from public.farms farm where farm.is_default order by farm.created_at limit 1)
)
where directory_row.farm_id is null;

create unique index if not exists idx_farm_rh_directory_farm_id on public.farm_rh_directory(farm_id) where farm_id is not null;

alter table public.farm_rh_directory enable row level security;
drop policy if exists farm_rh_directory_select on public.farm_rh_directory;
drop policy if exists farm_rh_directory_insert on public.farm_rh_directory;
drop policy if exists farm_rh_directory_update on public.farm_rh_directory;
drop policy if exists farm_rh_directory_delete on public.farm_rh_directory;
create policy farm_rh_directory_select on public.farm_rh_directory for select to authenticated using (public.can_read_farm(farm_id));
create policy farm_rh_directory_insert on public.farm_rh_directory for insert to authenticated with check (public.can_write_farm(farm_id));
create policy farm_rh_directory_update on public.farm_rh_directory for update to authenticated using (public.can_write_farm(farm_id)) with check (public.can_write_farm(farm_id));
create policy farm_rh_directory_delete on public.farm_rh_directory for delete to authenticated using (public.can_write_farm(farm_id));

alter table public.reports add column if not exists farm_id uuid references public.farms(id) on delete cascade;
alter table public.reports add column if not exists version_number integer not null default 1;
alter table public.reports add column if not exists root_report_id text;
alter table public.reports add column if not exists parent_report_id text;
alter table public.reports add column if not exists generated_at timestamptz;
alter table public.reports add column if not exists previewed_at timestamptz;
alter table public.reports add column if not exists validated_by text;
alter table public.reports add column if not exists validated_at timestamptz;
alter table public.reports add column if not exists frozen_at timestamptz;
alter table public.reports add column if not exists published_at timestamptz;
alter table public.reports add column if not exists publication_channel text;
alter table public.reports add column if not exists source_snapshot jsonb not null default '{}'::jsonb;
alter table public.reports add column if not exists source_digest text;
alter table public.reports add column if not exists immutable boolean not null default false;

update public.reports report
set farm_id = coalesce(
  (
    select access_row.farm_id
    from public.user_farm_access access_row
    where access_row.user_id = report.owner_user_id
    order by access_row.created_at
    limit 1
  ),
  (select farm.id from public.farms farm where farm.is_default order by farm.created_at limit 1)
)
where report.farm_id is null;

update public.reports
set root_report_id = id,
    generated_at = coalesce(generated_at, created_at),
    previewed_at = coalesce(previewed_at, created_at)
where root_report_id is null;

create index if not exists idx_reports_farm_id on public.reports(farm_id);
create index if not exists idx_reports_family_version on public.reports(farm_id, report_type, period, version_number desc);

create or replace function public.enforce_frozen_report_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.immutable or old.frozen_at is not null then
      raise exception 'Un rapport gelé ou publié est immuable; créer une nouvelle version.' using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if old.immutable or old.frozen_at is not null then
    if lower(coalesce(old.status, '')) in ('gele', 'gelé', 'frozen')
      and lower(coalesce(new.status, '')) in ('publie', 'publié', 'published')
      and (to_jsonb(new) - array['status','published_at','publication_channel','updated_at'])
        = (to_jsonb(old) - array['status','published_at','publication_channel','updated_at'])
    then
      return new;
    end if;
    raise exception 'Un rapport gelé ou publié est immuable; créer une nouvelle version.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_immutable_guard on public.reports;
create trigger reports_immutable_guard before update or delete on public.reports for each row execute function public.enforce_frozen_report_immutability();

alter table public.reports enable row level security;
drop policy if exists reports_select on public.reports;
drop policy if exists reports_insert on public.reports;
drop policy if exists reports_update on public.reports;
drop policy if exists reports_delete on public.reports;
create policy reports_select on public.reports for select to authenticated using (public.can_read_farm(farm_id));
create policy reports_insert on public.reports for insert to authenticated with check (public.can_write_farm(farm_id));
create policy reports_update on public.reports for update to authenticated using (public.can_write_farm(farm_id)) with check (public.can_write_farm(farm_id));
create policy reports_delete on public.reports for delete to authenticated using (public.can_write_farm(farm_id) and not immutable and frozen_at is null);

alter table public.equipment add column if not exists farm_id uuid references public.farms(id) on delete cascade;
alter table public.equipment add column if not exists recommission_validated boolean not null default false;
alter table public.equipment add column if not exists recommissioned_at date;
alter table public.equipment add column if not exists recommissioned_by text;
alter table public.equipment add column if not exists recommission_result text;

update public.equipment equipment_row
set farm_id = coalesce(
  (
    select access_row.farm_id
    from public.user_farm_access access_row
    where access_row.user_id = equipment_row.owner_user_id
    order by access_row.created_at
    limit 1
  ),
  (select farm.id from public.farms farm where farm.is_default order by farm.created_at limit 1)
)
where equipment_row.farm_id is null;

create index if not exists idx_equipment_farm_id on public.equipment(farm_id);
alter table public.equipment enable row level security;
drop policy if exists equipment_select on public.equipment;
drop policy if exists equipment_insert on public.equipment;
drop policy if exists equipment_update on public.equipment;
drop policy if exists equipment_delete on public.equipment;
create policy equipment_select on public.equipment for select to authenticated using (public.can_read_farm(farm_id));
create policy equipment_insert on public.equipment for insert to authenticated with check (public.can_write_farm(farm_id));
create policy equipment_update on public.equipment for update to authenticated using (public.can_write_farm(farm_id)) with check (public.can_write_farm(farm_id));
create policy equipment_delete on public.equipment for delete to authenticated using (public.can_write_farm(farm_id));
