-- Cartographie rôle <-> appareil : rôle RACI porté par chaque abonnement push,
-- pour cibler les notifications par rôle (promotrice_direction, responsable_filiere,
-- terrain, veterinaire, finance, admin_support). Optionnel : NULL = reçoit tout.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS role text;

COMMENT ON COLUMN public.push_subscriptions.role IS
  'Rôle RACI de l''appareil pour le ciblage des notifications (facultatif).';
