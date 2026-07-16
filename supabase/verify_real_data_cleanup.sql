-- La commande `supabase-management verify` considère la vérification valide
-- uniquement lorsque cette requête ne retourne aucune ligne.

select 'production_oeufs_logs: anciens exemples encore présents' as anomaly
where exists (
  select 1 from public.production_oeufs_logs
  where (id = 'PROD001' and lot_id = 'LOTPO001' and date = date '2026-05-05' and oeufs_produits = 398)
     or (id = 'PROD002' and lot_id = 'LOTPO001' and date = date '2026-05-06' and oeufs_produits = 412)
     or (id = 'PROD003' and lot_id = 'LOTPO001' and date = date '2026-05-07' and oeufs_produits = 405)
     or (id = 'PROD004' and lot_id = 'LOTPO002' and date = date '2026-05-05' and oeufs_produits = 318)
     or (id = 'PROD005' and lot_id = 'LOTPO002' and date = date '2026-05-06' and oeufs_produits = 326)
     or (id = 'PROD006' and lot_id = 'LOTPO002' and date = date '2026-05-07' and oeufs_produits = 322)
)
union all
select 'alimentation_logs: anciens exemples encore présents'
where exists (
  select 1 from public.alimentation_logs
  where (id = 'ALIM001' and date = date '2025-07-01' and quantite = 900 and notes = 'Aliment bovin mensuel')
     or (id = 'ALIM002' and date = date '2025-07-01' and quantite = 380 and notes = 'Ration ovins')
     or (id = 'ALIM003' and date = date '2025-07-02' and quantite = 1200 and notes = 'Aliment pondeuses')
     or (id = 'ALIM004' and date = date '2025-07-03' and quantite = 900 and notes = 'Aliment chair')
)
union all
select 'sensor_devices: anciens exemples encore présents'
where exists (
  select 1 from public.sensor_devices
  where (id = 'SENS001' and name = 'Capteur meteo simulation' and status = 'simulation')
     or (id = 'SENS002' and name = 'Humidite poulailler A' and status = 'simulation')
     or (id = 'SENS003' and name = 'Niveau reservoir' and status = 'simulation')
)
union all
select 'camera_devices: anciens exemples encore présents'
where exists (
  select 1 from public.camera_devices
  where (id = 'CAM001' and name = 'Camera entree principale' and type = 'simulation' and status = 'simulation')
     or (id = 'CAM002' and name = 'Camera poulailler' and type = 'simulation' and status = 'simulation')
)
union all
select 'tasks: diagnostics ou échéances saisonnières obsolètes encore ouverts'
where exists (
  select 1 from public.tasks
  where lower(coalesce(status, 'a_faire')) not in ('termine','terminé','done','closed','annule','annulé','expiree','expirée')
    and (
      lower(title) ~ '^(récursion ux formulaire|recursion ux formulaire|doublons fonctionnels|module sans onglets cibles)'
      or (lower(trim(title)) in ('tabaski','korité','korite','ramadan','magal','gamou','fin d''année') and due_date < current_date)
      or (
        lower(title) like 'lancement suspendu%'
        and lower(coalesce(assigned_to, '')) in ('team-ferme','equipe ferme','équipe ferme')
        and coalesce(due_date, created_at::date) < current_date - 7
      )
    )
)
union all
select 'alertes_center: diagnostics ou échéances saisonnières obsolètes encore ouverts'
where exists (
  select 1 from public.alertes_center
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
    )
);
