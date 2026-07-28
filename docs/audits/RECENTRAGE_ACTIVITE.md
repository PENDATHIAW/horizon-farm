# Recentrage réversible par activité

Objectif : une ferme qui ne pratique qu'une partie des activités (par exemple
uniquement les pondeuses + AGRI FEEDS) ne doit pas voir toute la richesse de
l'ERP. On masque ce qui ne la concerne pas **par configuration** (jamais par
suppression de code), pour pouvoir réactiver une activité en un clic.

L'état complet de l'ERP (toutes activités) est préservé dans la branche
d'archive `archive/erp-multi-activites-2026-07`.

## Principe

- La source de vérité est le champ `activity_type` de la ferme (déjà présent,
  réglable via l'assistant de création et la gestion des fermes).
- Les **activités filtrent uniquement les modules de production** : Élevage,
  Cultures, AGRI FEEDS, Smart Farm. Les modules de pilotage et de gestion
  (Accueil, Finance, Commercial, Objectifs, Financements, Documents, Système…)
  restent toujours accessibles.
- Une ferme **sans `activity_type`** ou marquée **`mixte`** voit tout : le
  recentrage ne s'applique qu'aux fermes explicitement configurées. Aucune
  régression pour l'existant.

## Ce qui est livré (étape 1)

- **`src/config/farmActivities.js`** — `isActivityModuleVisible(moduleId, farm)`
  (masquage des modules de production non pratiqués) et, pour l'étape 2, un
  classifieur de données `recordActivityKey` / `filterRecordsByFarmActivities`
  (masquer chair et bovins dans Élevage tout en gardant les pondeuses).
- **`src/App.jsx`** — la navigation et la résolution du module actif appliquent
  désormais `isActivityModuleVisible` en plus des flags. Un module masqué n'a ni
  entrée de menu, ni route active (redirection Accueil).
- **Tests** : `tests/unit/farmActivitiesFocus.test.js`.

## Recentrer une ferme sur les pondeuses + AGRI FEEDS

Régler `activity_type = ['aviculture_pondeuses', 'agri_feeds']` (Gestion système
→ Fermes, ou assistant de création). Effet immédiat :

- **Masqué** : module Cultures (et Smart Farm si non activé).
- **Conservé** : Élevage, AGRI FEEDS, et tous les modules de pilotage/gestion.

Pour reprendre la chair ou les bovins plus tard : rajouter `poulets_chair` ou
`embouche_bovine` à `activity_type`. Tout réapparaît, sans restauration de code.

## Données d'Élevage (étape 2, livrée)

`ElevageRecoveredModule` filtre désormais ses animaux et ses lots avec
`filterRecordsByFarmActivities(activeFarm, ...)` : une ferme pondeuses ne voit
plus les bandes chair ni les bovins (masqués, pas supprimés). Ferme mixte ou non
configurée : tout reste affiché.

## Étape suivante

- Masquage fin des onglets d'Élevage propres à la chair / aux bovins.
- Étendre le filtrage par activité au Commercial (ventes chair/bovins) et aux
  indicateurs si besoin.
