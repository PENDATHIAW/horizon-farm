# État actuel du dépôt Horizon Farm ERP

État consolidé le 2026-07-13 sur `claude/go-a21ueq`, PR finale #170 vers `main`, après la fusion
partielle de #169.

## 1. Pile et qualité

- React 18, Vite, Supabase, PWA hors ligne, Playwright et tests Node/Vite.
- 1021 fichiers source audités.
- 957 fichiers atteignables depuis les points d'entrée.
- 64 fichiers de support volontairement non exécutables.
- 0 composant JSX orphelin.
- 0 import non résolu.
- 235/235 fichiers de tests unitaires valides.
- 69/69 scénarios métier Playwright valides.
- Lint sans erreur, build production réussi, audit npm à 0 vulnérabilité.

## 2. Architecture des modules

- Registre des modules : `src/config/modules.config.js`.
- Points d'entrée différés : `src/config/moduleEntryPoints.js`.
- Configuration des onglets : `src/config/moduleTabs/`.
- Dictionnaire visible : `src/i18n/fr/`.
- Rôles : `src/config/erpRoles.js`.
- Tables par ferme : `src/config/farmScopedTables.js`.
- Indicateurs d'ouverture : `src/config/moduleOverviewKpis.js`.

Les 17 modules actifs sont Accueil, Assistant ERP, Centre décisionnel, Objectifs et Croissance,
Élevage, Cultures, Commercial, Achats et Stock, Finance et Pilotage, Activité et Suivi, Documents
et Rapports, Équipe, Équipements, Gestion du système, AGRI FEEDS, Smart Farm et Financements.

Les anciens identifiants `centre_ia`, `rh`, `sync`, `sync_activity`, `audit_logs`,
`investisseurs_forums` et `financeurs` sont des alias. Ils ne créent pas de seconde source
métier.

## 3. Navigation et vues

- Sept sections de navigation : Aujourd'hui, Production, Commerce, Argent, Pilotage,
  Organisation et Réglages.
- 17 configurations de modules plus une face financeur en lecture seule.
- 416 parcours de clic, alias et lien profond validés.
- 15 modules activés parcourus dans le navigateur et 82 onglets ouverts sans page d'erreur.
- Élevage expose huit vues, dont Transformation restaurée et testée.

La liste exacte des onglets est dans `docs/RAPPORT_CONFORMITE.md`.

## 4. Données et Supabase

- Projet distant confirmé : `HORIZON FARM`.
- Une ferme par défaut, deux accès ferme.
- Huit rôles officiels et alias des anciens rôles.
- 60/60 tables physiques requises par les services CRUD présentes.
- 71/71 tables directement appelées par le code présentes.
- 99/99 tables métier présentes et conformes à la portée ferme.
- 3 tables d'analyse historiques absentes et non appelées.
- 0 anomalie après `npm run db:migrate:verify`.
- 86 assertions comportementales sur 8 rôles et 2 fermes, 0 fuite et nettoyage complet.

Chaque table métier existante possède :

- `farm_id UUID NOT NULL` ;
- une clé étrangère vers `farms` ;
- un index sur `farm_id` ;
- la RLS activée et forcée ;
- une politique par opération : lecture, insertion, modification, suppression ;
- `is_deleted`, `deleted_at`, `deleted_by` ;
- une lecture qui masque les lignes supprimées.

La matrice table par table est dans `docs/audits/SUPABASE_RLS_MATRIX.md`.

## 5. Événements et objets uniques

- 26 événements métier, tous COMPLET.
- Chaque événement relie un écran actif, un workflow exécutant, des impacts, des alertes, un
  reporting, un rafraîchissement et un test.
- `JournalEvenements`, `ListeTaches`, `ListeAlertes` et `CarteKPI` sont les composants
  d'affichage uniques.
- Les ventes, stocks, coûts, tâches, alertes, rapports et décisions conservent un propriétaire
  métier unique.
- Les rejouements et doubles clics sont couverts par des clés stables et des gardes idempotentes.

## 6. Design

- Palette et tailles centralisées dans `src/styles/tokens.css`.
- Fraunces pour les titres et chiffres principaux, Inter pour le texte et les données.
- Carte indicateur Horizon unique.
- 18 couleurs contrôlées, aucune couleur locale hors charte.
- Sept saisies rapides accessibles partout.
- États de chargement, absence de données, focus visible et mouvement réduit.
- Mise en page ordinateur et mobile contrôlée par capture.

## 7. Nettoyages confirmés

- Aucun reliquat exécutable BOVINIA ou Tallow.
- Aucune carte météo.
- Aucun onglet Assistant Sources ou Questions fréquentes.
- Aucun module de synchronisation séparé dans la navigation.
- Aucun composant JSX orphelin.
- Aucun import ou route source non résolu.
- Le service mort `documentRules.js` et les feuilles de style locales remplacées sont supprimés.

## 8. Point restant humain

Le logiciel et la base sont conformes. Le test chronométré des sept saisies sur un téléphone réel
reste à consigner dans `docs/test-humain-20-secondes.md`. Les contrôles automatisés du contrat
sont verts, mais ils ne remplacent pas cette mesure d'usage humaine.
