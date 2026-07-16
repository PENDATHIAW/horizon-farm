-- Certaines installations historiques ont reçu les mêmes exemples de ponte
-- sans la colonne notes. La signature stable reste id + lot + date + quantité.

delete from public.production_oeufs_logs
where (id = 'PROD001' and lot_id = 'LOTPO001' and date = date '2026-05-05' and oeufs_produits = 398)
   or (id = 'PROD002' and lot_id = 'LOTPO001' and date = date '2026-05-06' and oeufs_produits = 412)
   or (id = 'PROD003' and lot_id = 'LOTPO001' and date = date '2026-05-07' and oeufs_produits = 405)
   or (id = 'PROD004' and lot_id = 'LOTPO002' and date = date '2026-05-05' and oeufs_produits = 318)
   or (id = 'PROD005' and lot_id = 'LOTPO002' and date = date '2026-05-06' and oeufs_produits = 326)
   or (id = 'PROD006' and lot_id = 'LOTPO002' and date = date '2026-05-07' and oeufs_produits = 322);
