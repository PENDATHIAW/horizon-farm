-- Élevage V2 — farm_id nullable sur logs métier (backfill prudent)
ALTER TABLE IF EXISTS public.alimentation_logs ADD COLUMN IF NOT EXISTS farm_id text;
ALTER TABLE IF EXISTS public.production_oeufs_logs ADD COLUMN IF NOT EXISTS farm_id text;
ALTER TABLE IF EXISTS public.sante ADD COLUMN IF NOT EXISTS farm_id text;

-- Backfill depuis lots (avicole) lorsque lot_id présent
UPDATE public.alimentation_logs al
SET farm_id = l.farm_id
FROM public.lots l
WHERE al.farm_id IS NULL
  AND al.lot_id IS NOT NULL
  AND al.lot_id = l.id
  AND l.farm_id IS NOT NULL;

UPDATE public.production_oeufs_logs pl
SET farm_id = l.farm_id
FROM public.lots l
WHERE pl.farm_id IS NULL
  AND pl.lot_id IS NOT NULL
  AND pl.lot_id = l.id
  AND l.farm_id IS NOT NULL;

-- Backfill santé via lot_id ou animal_id
UPDATE public.sante s
SET farm_id = l.farm_id
FROM public.lots l
WHERE s.farm_id IS NULL
  AND s.lot_id IS NOT NULL
  AND s.lot_id = l.id
  AND l.farm_id IS NOT NULL;

UPDATE public.sante s
SET farm_id = a.farm_id
FROM public.animals a
WHERE s.farm_id IS NULL
  AND s.animal_id IS NOT NULL
  AND s.animal_id = a.id
  AND a.farm_id IS NOT NULL;

COMMENT ON COLUMN public.alimentation_logs.farm_id IS 'Ferme propriétaire (nullable — compat historique)';
COMMENT ON COLUMN public.production_oeufs_logs.farm_id IS 'Ferme propriétaire (nullable — compat historique)';
COMMENT ON COLUMN public.sante.farm_id IS 'Ferme propriétaire (nullable — compat historique)';
