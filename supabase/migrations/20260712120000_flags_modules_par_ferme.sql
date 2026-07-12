-- Chantier 2 : flags de modules par ferme.
-- AGRI FEEDS, Smart Farm, Financements et Assistant sont activables ferme par ferme
-- (farms.settings.modules). Par défaut, une nouvelle ferme a AGRI FEEDS et
-- Smart Farm désactivés (le code applique ce défaut quand la clé est absente).
-- Les fermes existantes conservent leur usage actuel : on active explicitement
-- les quatre modules pour elles, sans écraser un réglage déjà posé.

update public.farms
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{modules}',
  '{"agri_feeds": true, "smartfarm": true, "financements": true, "assistant_erp": true}'::jsonb
  || coalesce(settings->'modules', '{}'::jsonb)
);
