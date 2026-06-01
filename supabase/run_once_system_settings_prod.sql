-- Configuration push prod (exécuter une fois dans Supabase SQL Editor)
-- Remplacer CRON_SECRET par la même valeur que sur Vercel

insert into public.system_settings (key, value, is_secret) values
  ('APP_PUBLIC_URL', 'https://horizon-farm.vercel.app', false),
  ('CRON_SECRET', 'REMPLACER_PAR_VOTRE_SECRET', true)
on conflict (key) do update set
  value = excluded.value,
  is_secret = excluded.is_secret,
  updated_at = now();
