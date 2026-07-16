-- Retire les exemples autrefois insérés par le schéma de production.
-- Chaque suppression vérifie la signature complète afin de préserver une saisie réelle
-- qui aurait fortuitement réutilisé l'un de ces anciens identifiants.

delete from public.production_oeufs_logs
where (id = 'PROD001' and lot_id = 'LOTPO001' and date = date '2026-05-05' and oeufs_produits = 398)
   or (id = 'PROD002' and lot_id = 'LOTPO001' and date = date '2026-05-06' and oeufs_produits = 412)
   or (id = 'PROD003' and lot_id = 'LOTPO001' and date = date '2026-05-07' and oeufs_produits = 405)
   or (id = 'PROD004' and lot_id = 'LOTPO002' and date = date '2026-05-05' and oeufs_produits = 318)
   or (id = 'PROD005' and lot_id = 'LOTPO002' and date = date '2026-05-06' and oeufs_produits = 326)
   or (id = 'PROD006' and lot_id = 'LOTPO002' and date = date '2026-05-07' and oeufs_produits = 322);

delete from public.alimentation_logs
where (id = 'ALIM001' and date = date '2025-07-01' and quantite = 900 and notes = 'Aliment bovin mensuel')
   or (id = 'ALIM002' and date = date '2025-07-01' and quantite = 380 and notes = 'Ration ovins')
   or (id = 'ALIM003' and date = date '2025-07-02' and quantite = 1200 and notes = 'Aliment pondeuses')
   or (id = 'ALIM004' and date = date '2025-07-03' and quantite = 900 and notes = 'Aliment chair');

delete from public.sensor_devices
where (id = 'SENS001' and name = 'Capteur meteo simulation' and status = 'simulation')
   or (id = 'SENS002' and name = 'Humidite poulailler A' and status = 'simulation')
   or (id = 'SENS003' and name = 'Niveau reservoir' and status = 'simulation');

delete from public.camera_devices
where (id = 'CAM001' and name = 'Camera entree principale' and type = 'simulation' and status = 'simulation')
   or (id = 'CAM002' and name = 'Camera poulailler' and type = 'simulation' and status = 'simulation');
