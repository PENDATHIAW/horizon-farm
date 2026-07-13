-- Rattache les comptes Auth existants aux profils et a la ferme par defaut.
-- Les comptes admin declares dans les metadonnees deviennent actifs ; un
-- visiteur reste pending et ne gagne aucun acces metier implicitement.

do $$
declare
  default_company_id uuid;
  default_farm_id uuid;
begin
  select f.company_id, f.id
  into default_company_id, default_farm_id
  from public.farms f
  order by (f.is_default is true) desc, f.created_at asc
  limit 1;

  if default_company_id is null or default_farm_id is null then
    raise exception 'Aucune ferme Horizon Farm disponible pour rattacher les profils Auth.';
  end if;

  insert into public.profiles (
    id, email, full_name, role, status, company_id, permissions, created_at, updated_at
  )
  select
    auth_user.id,
    auth_user.email,
    coalesce(
      nullif(auth_user.raw_user_meta_data->>'full_name', ''),
      nullif(auth_user.raw_user_meta_data->>'name', ''),
      split_part(coalesce(auth_user.email, 'Utilisateur Horizon Farm'), '@', 1)
    ),
    case
      when auth_user.raw_user_meta_data->>'role' in ('admin','manager','employe','veterinaire','comptable','visiteur')
        then auth_user.raw_user_meta_data->>'role'
      else 'visiteur'
    end,
    case
      when auth_user.raw_user_meta_data->>'status' in ('active','pending','invited','suspended','disabled')
        then auth_user.raw_user_meta_data->>'status'
      when auth_user.raw_user_meta_data->>'role' in ('admin','manager','employe','veterinaire','comptable')
        then 'active'
      else 'pending'
    end,
    default_company_id,
    '{}'::jsonb,
    coalesce(auth_user.created_at, now()),
    now()
  from auth.users auth_user
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    company_id = coalesce(public.profiles.company_id, excluded.company_id),
    role = case
      when public.profiles.role = 'visiteur' and excluded.role <> 'visiteur' then excluded.role
      else public.profiles.role
    end,
    status = case
      when public.profiles.status = 'pending' and excluded.status = 'active' then 'active'
      else public.profiles.status
    end,
    updated_at = now();

  insert into public.user_farm_access (user_id, farm_id, access_role, modules)
  select
    profile.id,
    default_farm_id,
    case profile.role
      when 'admin' then 'super_admin'
      when 'manager' then 'direction'
      when 'comptable' then 'farm_accountant'
      when 'veterinaire' then 'farm_veterinary'
      else 'farm_agent'
    end,
    '{}'::jsonb
  from public.profiles profile
  where profile.status = 'active'
    and profile.role in ('admin','manager','employe','veterinaire','comptable')
  on conflict (user_id, farm_id) do update set
    access_role = excluded.access_role,
    updated_at = now();

  update public.farms farm
  set owner_user_id = (
    select profile.id
    from public.profiles profile
    where profile.role = 'admin' and profile.status = 'active'
    order by profile.created_at
    limit 1
  )
  where farm.id = default_farm_id
    and farm.owner_user_id is null;
end
$$;
