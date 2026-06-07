-- Vues analytiques — Module Objectifs & Croissance (Horizon Farm ERP)
-- À exécuter sur PostgreSQL / Supabase

-- 1. Contexte pivot par lot (J-0, âge, code souche)
CREATE OR REPLACE VIEW v_lot_pivot_context AS
SELECT
  l.id AS lot_id,
  COALESCE(l.name, l.nom) AS lot_name,
  COALESCE(l.date_pivot, l.date_debut, l.date_entree, l.created_at::date) AS date_pivot,
  GREATEST(0, CURRENT_DATE - COALESCE(l.date_pivot, l.date_debut, l.date_entree, l.created_at::date)) AS age_days,
  UPPER(COALESCE(NULLIF(l.code_souche, ''), NULLIF(l.breed_code, ''))) AS code_souche,
  l.batiment,
  l.type,
  l.effectif_actuel,
  l.poids_moyen_actuel
FROM lots l
WHERE l.status IS DISTINCT FROM 'cloture';

-- 2. Taux de ponte réel (7 jours glissants)
CREATE OR REPLACE VIEW v_taux_ponte_reel AS
SELECT
  p.lot_id,
  SUM(p.oeufs_produits) AS oeufs_7j,
  COUNT(DISTINCT p.date) AS jours_saisis,
  l.effectif_actuel AS poules_vivantes,
  ROUND(
    (SUM(p.oeufs_produits)::numeric / NULLIF(l.effectif_actuel * GREATEST(COUNT(DISTINCT p.date), 1), 0)) * 100,
    1
  ) AS taux_ponte_reel_pct
FROM production_oeufs_logs p
JOIN lots l ON l.id = p.lot_id
WHERE p.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.lot_id, l.effectif_actuel;

-- 3. CA réalisé par activité (mois courant)
CREATE OR REPLACE VIEW v_ca_mois_par_activite AS
SELECT
  DATE_TRUNC('month', COALESCE(o.date_commande, o.created_at)) AS mois,
  CASE
    WHEN LOWER(COALESCE(o.produit, o.designation, '')) ~ 'oeuf|tablette|ponte' THEN 'oeufs'
    WHEN LOWER(COALESCE(o.produit, o.designation, '')) ~ 'poulet|chair|broiler' THEN 'poulets_chair'
    WHEN LOWER(COALESCE(o.produit, o.designation, '')) ~ 'bovin|boeuf|zebu|viande' THEN 'bovins'
    ELSE 'autre'
  END AS activite,
  SUM(COALESCE(o.montant_total, o.total, 0)) AS ca_realise
FROM sales_orders o
WHERE DATE_TRUNC('month', COALESCE(o.date_commande, o.created_at)) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY 1, 2;

-- 4. Prix marché local (dernier relevé par activité / localité)
CREATE OR REPLACE VIEW v_prix_marche_local AS
SELECT DISTINCT ON (activity, localite)
  COALESCE(mp.activity, mp.categorie) AS activity,
  COALESCE(mp.localite, mp.location, mp.ville, 'default') AS localite,
  mp.prix AS prix_marche,
  mp.date_releve
FROM market_prices mp
ORDER BY activity, localite, mp.date_releve DESC NULLS LAST;

-- 5. Alertes vide sanitaire (< 10 jours entre lots même bâtiment)
CREATE OR REPLACE VIEW v_alertes_vide_sanitaire AS
WITH ordered AS (
  SELECT
    id,
    COALESCE(batiment, building) AS batiment,
    COALESCE(date_pivot, date_debut) AS date_debut_lot,
    COALESCE(date_fin, date_cloture, updated_at::date) AS date_fin_lot,
    LAG(COALESCE(date_fin, date_cloture, updated_at::date)) OVER (
      PARTITION BY COALESCE(batiment, building)
      ORDER BY COALESCE(date_pivot, date_debut)
    ) AS prev_fin
  FROM lots
)
SELECT
  id AS lot_id,
  batiment,
  date_debut_lot,
  (date_debut_lot - prev_fin) AS jours_entre_lots
FROM ordered
WHERE prev_fin IS NOT NULL
  AND (date_debut_lot - prev_fin) < 10;

-- 6. Seuil de rentabilité mensuel (paramètres BP)
-- Les montants fixes/variables proviennent du business plan officiel
CREATE OR REPLACE VIEW v_seuil_rentabilite_mois AS
SELECT
  DATE_TRUNC('month', CURRENT_DATE) AS mois,
  (SELECT SUM(montant_mensuel) FROM bp_recurring_costs WHERE categorie IN ('RH', 'Loyer', 'Assurance')) AS charges_fixes_m,
  (SELECT SUM(montant_mensuel) FROM bp_recurring_costs WHERE categorie NOT IN ('RH', 'Loyer', 'Assurance')) AS charges_variables_m,
  0.35 AS taux_marge_brute_cible,
  ROUND(
    (
      COALESCE((SELECT SUM(montant_mensuel) FROM bp_recurring_costs), 0)
    ) / 0.35
  ) AS seuil_ca_mensuel
FROM (SELECT 1) x;
