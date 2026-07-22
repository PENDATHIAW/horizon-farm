# Séparation données de démonstration ↔ données réelles

Objectif (HF-P0-001) : **aucune donnée de démonstration ne doit apparaître en
mode réel**, et activer la démonstration ne doit jamais écrire de données
fictives dans la base d'un client.

## Comment le mode est choisi

Le mode est stocké côté client (localStorage) et lu par
`isSimulatedDataModeEnabled()` (`src/utils/uiPreferences.js`) :

- Clé `horizon_farm_data_mode_choice` = `simulated` | `real`.
- Bascule programmatique : `setSimulatedDataMode(true|false)`.
- Bascule URL ponctuelle : `?simulated=1` (active) ou `?simulated=0` (désactive).
- Interface : panneau Réglages (`SettingsPanel`).
- Par défaut selon le rôle : `applyDefaultDataModeForRole` (admin/manager = réel,
  autres = démonstration) tant qu'aucun choix explicite n'a été fait.

Le mode **réel est l'état strict** : sans stockage disponible (SSR, tests), la
lecture renvoie `false` (réel).

## Comment la démo est marquée puis filtrée

- Le jeu de démonstration (`src/utils/horizonFarmSimulationSeed.js`) marque
  **chaque ligne** avec une provenance `source: 'simulation_bp_horizon_farm'`.
- `isSimulatedRow(row)` = `source` commençant par `simulation`.
- `stripSimulatedRows(dataMap)` retire toute ligne simulée **par provenance ET
  par identifiant de seed** (robuste si un id change).
- Le point de filtrage central est le hook `useAppData()`
  (`src/context/AppContext.js`) : en mode réel, `filterSeedRows` applique
  `stripSimulatedRows`, donc **tout composant lisant `dataMap` reçoit un jeu
  purgé**. Les composants ne lisent pas `rawDataMap`.

## Annuaire RH (durci par HF-P0-001)

L'annuaire RH avait un chemin distinct qui **injectait toujours** des personnes
fictives (`RH_DEFAULT_PEOPLE`, salaires fictifs). Désormais :

- `isDemoPerson(person)` (`src/utils/rhDirectory.js`) repère une identité démo
  (id du jeu démo, id `RH-DEMO*`, `source` simulée, ou note « fictive »).
- `normalizeRhDirectory` / `rhDirectoryService` n'injectent le jeu fictif **que
  si le mode démonstration est actif**. En mode réel, seules les personnes
  réellement saisies subsistent, et toute personne démo persistée dans une
  ancienne sauvegarde est **purgée à la lecture**.

## Base de production

Aucune migration Supabase n'insère de soldes, ventes, clients, fournisseurs ou
stocks fictifs non nuls : le jeu de démonstration vit uniquement côté
application (seed en mémoire), jamais dans une migration de production.

## Activer la démonstration sans risque

1. `?simulated=1` dans l'URL, ou Réglages → activer les données de démonstration.
2. Le jeu simulé s'affiche (marqué par provenance).
3. Repasser en réel (`?simulated=0` ou Réglages) purge instantanément l'affichage :
   les lignes simulées ne sont jamais mélangées aux données réelles saisies.

## Tests de non-régression

- `tests/unit/realDataModeEmpty.test.js` : en mode réel filtré, marge/trésorerie
  restent nulles sans saisie réelle.
- `tests/unit/rhDemoIsolation.test.js` : l'annuaire RH ne laisse passer aucune
  personne fictive en mode réel ; le réel saisi survit ; la démo persistée est
  purgée.
